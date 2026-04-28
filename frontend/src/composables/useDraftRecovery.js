import { Dialog, Notify } from 'quasar'
import DraftRecoveryDialog from 'components/draft-recovery-dialog.vue'
import DraftRecoveryService from '@/services/draft-recovery'

const notifiedErrors = new Set()

function cloneData(data) {
  return JSON.parse(JSON.stringify(data))
}

function callOption(option, fallback) {
  if (typeof option === 'function')
    return option()
  return fallback
}

function notifyStorageError(error) {
  const key = error || 'unknown'
  if (notifiedErrors.has(key))
    return

  notifiedErrors.add(key)
  Notify.create({
    message: 'Draft recovery is unavailable in this browser session.',
    color: 'warning',
    textColor: 'white',
    position: 'top-right'
  })
}

export function createDraftRecovery(vm, options) {
  let unwatch = null
  let timer = null
  let pendingWrite = null
  let scheduledKeyArgs = null
  let scheduledData = null
  let stopped = false
  const promptedKeys = new Set()

  const getScope = () => callOption(options.scope, options.scope)
  const getRefKey = () => callOption(options.refKey, options.refKey)
  const getUserId = () => callOption(options.userId, options.userId)
  const getCurrent = () => options.getCurrent()
  const isReadOnly = () => options.isReadOnly && options.isReadOnly()
  const isDirty = () => options.isDirty && options.isDirty()

  const getKeyArgs = () => ({
    userId: getUserId(),
    scope: getScope(),
    refKey: getRefKey()
  })

  async function writeSnapshot(keyArgs, data) {
    if (stopped)
      return

    const result = await DraftRecoveryService.saveDraft({
      ...keyArgs,
      data
    })

    if (!result.ok)
      notifyStorageError(result.error)
  }

  function scheduleWrite() {
    if (timer)
      clearTimeout(timer)

    scheduledKeyArgs = getKeyArgs()
    scheduledData = cloneData(getCurrent())

    timer = setTimeout(() => {
      timer = null
      const keyArgs = scheduledKeyArgs
      const data = scheduledData
      scheduledKeyArgs = null
      scheduledData = null
      pendingWrite = writeSnapshot(keyArgs, data)
        .finally(() => {
          pendingWrite = null
        })
    }, 500)
  }

  async function clearDraft() {
    if (timer) {
      clearTimeout(timer)
      timer = null
      const keyArgs = scheduledKeyArgs
      const data = scheduledData
      scheduledKeyArgs = null
      scheduledData = null
      pendingWrite = writeSnapshot(keyArgs, data)
        .finally(() => {
          pendingWrite = null
        })
    }

    const result = await DraftRecoveryService.clearDraft(getKeyArgs())
    if (!result.ok)
      notifyStorageError(result.error)
    return result
  }

  function start() {
    if (unwatch || isReadOnly())
      return

    unwatch = vm.$watch(
      () => getCurrent(),
      async () => {
        if (stopped || isReadOnly())
          return

        if (!isDirty()) {
          await clearDraft()
          return
        }

        scheduleWrite()
      },
      { deep: true }
    )
  }

  async function maybePromptRecovery() {
    if (isReadOnly())
      return null

    const keyArgs = getKeyArgs()
    if (!keyArgs.userId || !keyArgs.scope || !keyArgs.refKey)
      return null

    const promptKey = DraftRecoveryService.buildKey(keyArgs.userId, keyArgs.scope, keyArgs.refKey)
    if (promptedKeys.has(promptKey)) {
      start()
      return null
    }

    const draft = await DraftRecoveryService.loadDraft(keyArgs)
    if (!draft) {
      start()
      return null
    }

    promptedKeys.add(promptKey)

    return new Promise((resolve) => {
      Dialog.create({
        component: DraftRecoveryDialog,
        componentProps: {
          draft,
          current: cloneData(getCurrent())
        }
      })
      .onOk(async (action) => {
        if (action === 'restore') {
          options.setCurrent(cloneData(draft.data))
          if (options.afterRestore)
            await options.afterRestore()
          start()
          resolve('restore')
          return
        }

        await clearDraft()
        start()
        resolve('discard')
      })
      .onCancel(() => {
        start()
        resolve('cancel')
      })
      .onDismiss(() => {
        start()
      })
    })
  }

  async function flushPendingWrite() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    if (pendingWrite)
      await pendingWrite
  }

  async function stop() {
    if (unwatch) {
      unwatch()
      unwatch = null
    }
    await flushPendingWrite()
    stopped = true
  }

  return {
    start,
    maybePromptRecovery,
    clearDraft,
    flushPendingWrite,
    stop
  }
}

export default createDraftRecovery
