import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

let watchCallback

vi.mock('components/draft-recovery-dialog.vue', () => ({
  default: { name: 'DraftRecoveryDialog' }
}))

vi.mock('quasar', () => ({
  Dialog: {
    create: vi.fn(() => ({
      onOk(cb) {
        this.ok = cb
        return this
      },
      onCancel(cb) {
        this.cancel = cb
        return this
      },
      onDismiss(cb) {
        this.dismiss = cb
        return this
      }
    }))
  },
  Notify: {
    create: vi.fn()
  }
}))

vi.mock('@/services/draft-recovery', () => ({
  default: {
    state: {
      current: null
    },
    DRAFT_STATUS: {
      ACTIVE: 'active_draft',
      DISCARDED: 'discarded_draft',
      SYNCED: 'synced'
    },
    buildKey: vi.fn((userId, scope, refKey) => `pwndoc.draft.${userId}.${scope}.${refKey}`),
    saveDraft: vi.fn(() => Promise.resolve({ ok: true })),
    loadDraft: vi.fn(() => Promise.resolve(null)),
    clearDraft: vi.fn(() => Promise.resolve({ ok: true })),
    markDraftDiscarded: vi.fn(() => Promise.resolve({ ok: true })),
    setStatus: vi.fn(function(status) {
      this.state.current = status
    }),
    clearStatus: vi.fn(function() {
      this.state.current = null
    })
  }
}))

import { createDraftRecovery } from '@/composables/useDraftRecovery'
import DraftRecoveryService from '@/services/draft-recovery'
import { Dialog, Notify } from 'quasar'

function createVm() {
  return {
    $t: key => key,
    $watch: vi.fn((getter, cb) => {
      watchCallback = cb
      return vi.fn()
    })
  }
}

function createRecovery(overrides = {}) {
  const state = {
    current: { title: 'Server' },
    original: { title: 'Server' },
    readOnly: false
  }
  const setCurrent = vi.fn((data) => {
    state.current = data
  })

  const recovery = createDraftRecovery(createVm(), {
    scope: () => 'scope',
    refKey: () => 'ref',
    userId: () => 'user1',
    getCurrent: () => state.current,
    setCurrent,
    getOriginal: () => state.original,
    isDirty: () => JSON.stringify(state.current) !== JSON.stringify(state.original),
    isReadOnly: () => state.readOnly,
    ...overrides
  })

  return { recovery, state, setCurrent }
}

describe('createDraftRecovery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    watchCallback = null
    DraftRecoveryService.clearStatus()
  })

  afterEach(() => {
    DraftRecoveryService.clearStatus()
    vi.useRealTimers()
  })

  it('does not save or delete a recoverable draft when the watched state is clean', async () => {
    const { recovery } = createRecovery()
    recovery.start()

    await watchCallback()
    await vi.runAllTimersAsync()

    expect(DraftRecoveryService.saveDraft).not.toHaveBeenCalled()
    expect(DraftRecoveryService.clearDraft).not.toHaveBeenCalled()
  })

  it('saves dirty state after the debounce', async () => {
    const { recovery, state } = createRecovery()
    recovery.start()
    state.current = { title: 'Draft' }

    await watchCallback()
    await vi.advanceTimersByTimeAsync(500)

    expect(DraftRecoveryService.saveDraft).toHaveBeenCalledWith({
      userId: 'user1',
      scope: 'scope',
      refKey: 'ref',
      data: { title: 'Draft' }
    })
  })

  it('auto-restores a loaded active draft and keeps an inline status without a toast', async () => {
    DraftRecoveryService.loadDraft.mockResolvedValue({
      key: 'pwndoc.draft.user1.scope.ref',
      status: 'active_draft',
      updatedAt: Date.now(),
      data: { title: 'Recovered' }
    })
    const { recovery, setCurrent } = createRecovery()

    await expect(recovery.maybePromptRecovery()).resolves.toBe('restore')

    expect(setCurrent).toHaveBeenCalledWith({ title: 'Recovered' })
    expect(Dialog.create).not.toHaveBeenCalled()
    expect(Notify.create).not.toHaveBeenCalled()
    expect(DraftRecoveryService.state.current).toEqual(expect.objectContaining({
      key: 'pwndoc.draft.user1.scope.ref',
      type: 'local_draft'
    }))
  })

  it('retries recovery when user and edit state are not ready on direct page load', async () => {
    const draft = {
      key: 'pwndoc.draft.user1.scope.ref',
      status: 'active_draft',
      updatedAt: Date.now(),
      data: { title: 'Recovered' }
    }
    DraftRecoveryService.loadDraft.mockResolvedValue(draft)
    let userId = ''
    const { recovery, setCurrent } = createRecovery({
      userId: () => userId
    })

    await expect(recovery.maybePromptRecovery()).resolves.toBeNull()
    expect(DraftRecoveryService.loadDraft).not.toHaveBeenCalled()

    userId = 'user1'
    await vi.advanceTimersByTimeAsync(250)

    expect(DraftRecoveryService.loadDraft).toHaveBeenCalledWith({
      userId: 'user1',
      scope: 'scope',
      refKey: 'ref'
    })
    expect(setCurrent).toHaveBeenCalledWith({ title: 'Recovered' })
    expect(DraftRecoveryService.state.current).toEqual(expect.objectContaining({
      type: 'local_draft'
    }))
  })

  it('discard switches back to the server version and marks the draft recoverable', async () => {
    const draft = {
      key: 'pwndoc.draft.user1.scope.ref',
      status: 'active_draft',
      updatedAt: Date.now(),
      data: { title: 'Recovered' }
    }
    DraftRecoveryService.loadDraft.mockResolvedValue(draft)
    const { recovery, setCurrent } = createRecovery()

    await expect(recovery.maybePromptRecovery()).resolves.toBe('restore')

    const discardAction = DraftRecoveryService.state.current.actions.find(action => action.id === 'discard')
    await discardAction.handler()

    expect(DraftRecoveryService.markDraftDiscarded).toHaveBeenCalledWith({
      userId: 'user1',
      scope: 'scope',
      refKey: 'ref'
    })
    expect(setCurrent).toHaveBeenLastCalledWith({ title: 'Server' })
    expect(DraftRecoveryService.clearDraft).not.toHaveBeenCalled()
    expect(Notify.create).not.toHaveBeenCalled()
    expect(DraftRecoveryService.state.current).toEqual(expect.objectContaining({
      key: 'pwndoc.draft.user1.scope.ref',
      type: 'server_version'
    }))
  })

  it('restore draft from the discarded chip switches back to draft data', async () => {
    const draft = {
      key: 'pwndoc.draft.user1.scope.ref',
      status: 'discarded_draft',
      updatedAt: Date.now(),
      data: { title: 'Recovered' }
    }
    DraftRecoveryService.loadDraft.mockResolvedValue(draft)
    const { recovery, setCurrent } = createRecovery()

    await expect(recovery.maybePromptRecovery()).resolves.toBe('discarded')

    const restoreAction = DraftRecoveryService.state.current.actions.find(action => action.id === 'restore')
    await restoreAction.handler()

    expect(setCurrent).toHaveBeenCalledWith({ title: 'Recovered' })
    expect(DraftRecoveryService.saveDraft).toHaveBeenCalledWith({
      userId: 'user1',
      scope: 'scope',
      refKey: 'ref',
      data: { title: 'Recovered' }
    })
    expect(DraftRecoveryService.state.current).toEqual(expect.objectContaining({
      type: 'local_draft'
    }))
  })

  it('restore draft from the discarded chip updates the chip back to recovered', async () => {
    const draft = {
      key: 'pwndoc.draft.user1.scope.ref',
      status: 'active_draft',
      updatedAt: Date.now(),
      data: { title: 'Recovered' }
    }
    DraftRecoveryService.loadDraft.mockResolvedValue(draft)
    const { recovery } = createRecovery()

    await expect(recovery.maybePromptRecovery()).resolves.toBe('restore')

    await DraftRecoveryService.state.current.actions.find(action => action.id === 'discard').handler()

    expect(DraftRecoveryService.state.current).toEqual(expect.objectContaining({
      type: 'server_version'
    }))

    await DraftRecoveryService.state.current.actions.find(action => action.id === 'restore').handler()

    expect(DraftRecoveryService.state.current).toEqual(expect.objectContaining({
      key: 'pwndoc.draft.user1.scope.ref',
      type: 'local_draft'
    }))
  })

  it('delete permanently clears the persistent status', async () => {
    const draft = {
      key: 'pwndoc.draft.user1.scope.ref',
      status: 'discarded_draft',
      updatedAt: Date.now(),
      data: { title: 'Recovered' }
    }
    DraftRecoveryService.loadDraft.mockResolvedValue(draft)
    const { recovery } = createRecovery()

    await expect(recovery.maybePromptRecovery()).resolves.toBe('discarded')

    const deleteAction = DraftRecoveryService.state.current.actions.find(action => action.id === 'delete_permanently')
    await deleteAction.handler()

    expect(DraftRecoveryService.clearDraft).toHaveBeenCalledWith({
      userId: 'user1',
      scope: 'scope',
      refKey: 'ref'
    })
    expect(DraftRecoveryService.state.current).toBeNull()
  })

  it('skips watcher and prompt when read-only', async () => {
    const { recovery, state } = createRecovery()
    state.readOnly = true

    recovery.start()
    await expect(recovery.maybePromptRecovery()).resolves.toBeNull()

    expect(DraftRecoveryService.loadDraft).not.toHaveBeenCalled()
    expect(DraftRecoveryService.saveDraft).not.toHaveBeenCalled()
  })
})
