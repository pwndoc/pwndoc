import { Dialog, Notify } from 'quasar'
import DraftRecoveryDialog from 'components/draft-recovery-dialog.vue'
import DraftRecoveryService from '@/services/draft-recovery'

const notifiedErrors = new Set()
const RECOVERY_READY_RETRY_MS = 250
const RECOVERY_READY_MAX_WAIT_MS = 5000

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
  let recoveryRetryTimer = null
  let recoveryRetryStartedAt = null
  let stopped = false
  const notifiedKeys = new Set()

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

  function recoveryIsReady(keyArgs = getKeyArgs()) {
    return !!keyArgs.userId && !!keyArgs.scope && !!keyArgs.refKey && !isReadOnly()
  }

  function scheduleRecoveryRetry() {
    if (stopped || recoveryRetryTimer)
      return

    const now = Date.now()
    if (!recoveryRetryStartedAt)
      recoveryRetryStartedAt = now

    if (now - recoveryRetryStartedAt >= RECOVERY_READY_MAX_WAIT_MS) {
      recoveryRetryStartedAt = null
      return
    }

    recoveryRetryTimer = setTimeout(() => {
      recoveryRetryTimer = null
      if (stopped)
        return

      if (!recoveryIsReady()) {
        scheduleRecoveryRetry()
        return
      }

      recoveryRetryStartedAt = null
      maybePromptRecovery().catch(() => {})
    }, RECOVERY_READY_RETRY_MS)
  }

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

  function syncAndCapture() {
    if (options.syncBeforeCapture)
      options.syncBeforeCapture()
    return cloneData(getCurrent())
  }

  function scheduleWrite() {
    if (timer)
      clearTimeout(timer)

    scheduledKeyArgs = getKeyArgs()

    timer = setTimeout(() => {
      timer = null
      const keyArgs = scheduledKeyArgs
      scheduledKeyArgs = null
      const data = syncAndCapture()
      pendingWrite = writeSnapshot(keyArgs, data)
        .finally(() => {
          pendingWrite = null
        })
    }, 3000)
  }

  function flushTimerToWrite() {
    if (!timer)
      return
    clearTimeout(timer)
    timer = null
    const keyArgs = scheduledKeyArgs
    scheduledKeyArgs = null
    const data = syncAndCapture()
    pendingWrite = writeSnapshot(keyArgs, data)
      .finally(() => {
        pendingWrite = null
      })
  }

  function handleEditorChange() {
    if (stopped || isReadOnly())
      return
    scheduleWrite()
  }

  async function clearDraft() {
    const keyArgsForStatus = getKeyArgs()
    flushTimerToWrite()

    const result = await DraftRecoveryService.clearDraft(getKeyArgs())
    if (!result.ok)
      notifyStorageError(result.error)
    else
      DraftRecoveryService.clearStatus(DraftRecoveryService.buildKey(keyArgsForStatus.userId, keyArgsForStatus.scope, keyArgsForStatus.refKey))
    return result
  }

  async function clearDraftForKey(keyArgs) {
    const result = await DraftRecoveryService.clearDraft(keyArgs)
    if (!result.ok)
      notifyStorageError(result.error)
    else
      DraftRecoveryService.clearStatus(DraftRecoveryService.buildKey(keyArgs.userId, keyArgs.scope, keyArgs.refKey))
    return result
  }

  async function markDraftDiscarded(keyArgs) {
    const result = await DraftRecoveryService.markDraftDiscarded(keyArgs)
    if (!result.ok)
      notifyStorageError(result.error)
    return result
  }

  function showDiffDialog(draft, current, keyArgs) {
    Dialog.create({
      component: DraftRecoveryDialog,
      componentProps: {
        draft,
        current
      }
    })
    .onOk(async (action) => {
      if (action === 'restore') {
        await restoreDraft(draft, keyArgs)
        setRecoveredStatus(draft, current, keyArgs)
        return
      }

      if (action === 'discard') {
        await discardDraft(draft, current, keyArgs)
      }
    })
  }

  function countChangedFields(current, draft) {
    if (!current || !draft) return 0
    let count = 0
    const excluded = new Set(['_id', 'id', 'details'])
    const allKeys = new Set([...Object.keys(current), ...Object.keys(draft)])
    for (const key of allKeys) {
      if (excluded.has(key)) continue
      if (JSON.stringify(current[key]) !== JSON.stringify(draft[key])) count++
    }
    const currentDetails = Array.isArray(current.details) ? current.details : []
    const draftDetails = Array.isArray(draft.details) ? draft.details : []
    const detailMap = {}
    for (const d of currentDetails) {
      const k = d?.locale || d?.language || d?._id
      if (k) detailMap[k] = { cur: d }
    }
    for (const d of draftDetails) {
      const k = d?.locale || d?.language || d?._id
      if (k) {
        if (detailMap[k]) detailMap[k].dft = d
        else detailMap[k] = { dft: d }
      }
    }
    for (const entry of Object.values(detailMap)) {
      if (JSON.stringify(entry.cur) !== JSON.stringify(entry.dft)) count++
    }
    return count
  }

  function setRecoveredStatus(draft, serverVersion, keyArgs) {
    DraftRecoveryService.setStatus({
      key: draft.key,
      type: 'local_draft',
      draft,
      changeCount: countChangedFields(serverVersion, draft.data),
      actions: [
        {
          id: 'discard',
          handler: () => discardDraft(draft, serverVersion, keyArgs)
        },
        {
          id: 'view_changes',
          handler: () => showDiffDialog(draft, serverVersion, keyArgs)
        }
      ]
    })
  }

  function setDiscardedStatus(draft, serverVersion, keyArgs) {
    DraftRecoveryService.setStatus({
      key: draft.key,
      type: 'server_version',
      draft,
      changeCount: countChangedFields(serverVersion, draft.data),
      actions: [
        {
          id: 'restore',
          handler: async () => {
            await restoreDraft(draft, keyArgs)
            setRecoveredStatus(draft, serverVersion, keyArgs)
          }
        },
        {
          id: 'view_changes',
          handler: () => showDiffDialog(draft, serverVersion, keyArgs)
        },
        { id: 'separator' },
        {
          id: 'delete_permanently',
          handler: () => clearDraftForKey(keyArgs)
        }
      ]
    })
  }

  async function restoreDraft(draft, keyArgs = getKeyArgs()) {
    options.setCurrent(cloneData(draft.data))
    if (options.afterRestore)
      await options.afterRestore()

    const result = await DraftRecoveryService.saveDraft({
      ...keyArgs,
      data: cloneData(draft.data)
    })
    if (!result.ok)
      notifyStorageError(result.error)
  }

  async function discardDraft(draft, serverVersion, keyArgs) {
    await markDraftDiscarded(keyArgs)
    options.setCurrent(cloneData(serverVersion))
    if (options.afterRestore)
      await options.afterRestore()
    setDiscardedStatus(draft, serverVersion, keyArgs)
  }

  function handleBeforeUnload() {
    flushTimerToWrite()
  }

  function handleVisibilityChange() {
    if (document.hidden)
      flushTimerToWrite()
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
          if (timer) {
            clearTimeout(timer)
            timer = null
            scheduledKeyArgs = null
          }
          return
        }

        scheduleWrite()
      },
      { deep: true }
    )

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('basic-editor-change', handleEditorChange)
  }

  async function maybePromptRecovery() {
    const keyArgs = getKeyArgs()
    if (!recoveryIsReady(keyArgs)) {
      scheduleRecoveryRetry()
      return null
    }

    recoveryRetryStartedAt = null

    const promptKey = DraftRecoveryService.buildKey(keyArgs.userId, keyArgs.scope, keyArgs.refKey)
    if (notifiedKeys.has(`${promptKey}:checked`)) {
      start()
      return null
    }

    const draft = await DraftRecoveryService.loadDraft(keyArgs)
    if (!draft) {
      start()
      return null
    }

    notifiedKeys.add(`${promptKey}:checked`)

    const serverVersion = cloneData(getCurrent())

    if (draft.status === DraftRecoveryService.DRAFT_STATUS.DISCARDED) {
      start()
      setDiscardedStatus(draft, serverVersion, keyArgs)
      return 'discarded'
    }

    await restoreDraft(draft, keyArgs)
    start()
    setRecoveredStatus(draft, serverVersion, keyArgs)
    return 'restore'
  }

  async function flushPendingWrite() {
    flushTimerToWrite()
    if (pendingWrite)
      await pendingWrite
  }

  async function stop() {
    if (unwatch) {
      unwatch()
      unwatch = null
    }
    window.removeEventListener('beforeunload', handleBeforeUnload)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    document.removeEventListener('basic-editor-change', handleEditorChange)
    await flushPendingWrite()
    if (recoveryRetryTimer) {
      clearTimeout(recoveryRetryTimer)
      recoveryRetryTimer = null
    }
    const keyArgs = getKeyArgs()
    DraftRecoveryService.clearStatus(DraftRecoveryService.buildKey(keyArgs.userId, keyArgs.scope, keyArgs.refKey))
    stopped = true
  }

  function resetForKey(keyArgs = getKeyArgs()) {
    const key = DraftRecoveryService.buildKey(keyArgs.userId, keyArgs.scope, keyArgs.refKey)
    notifiedKeys.delete(`${key}:checked`)
  }

  return {
    start,
    maybePromptRecovery,
    clearDraft,
    flushPendingWrite,
    stop,
    resetForKey
  }
}

export default createDraftRecovery
