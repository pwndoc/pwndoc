import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

let dialogAction = 'restore'
let watchCallback

vi.mock('components/draft-recovery-dialog.vue', () => ({
  default: { name: 'DraftRecoveryDialog' }
}))

vi.mock('quasar', () => ({
  Dialog: {
    create: vi.fn(() => ({
      onOk(cb) {
        if (dialogAction !== 'cancel')
          cb(dialogAction)
        return this
      },
      onCancel(cb) {
        if (dialogAction === 'cancel')
          cb()
        return this
      },
      onDismiss(cb) {
        cb()
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
    buildKey: vi.fn((userId, scope, refKey) => `pwndoc.draft.${userId}.${scope}.${refKey}`),
    saveDraft: vi.fn(() => Promise.resolve({ ok: true })),
    loadDraft: vi.fn(() => Promise.resolve(null)),
    clearDraft: vi.fn(() => Promise.resolve({ ok: true }))
  }
}))

import { createDraftRecovery } from '@/composables/useDraftRecovery'
import DraftRecoveryService from '@/services/draft-recovery'

function createVm() {
  return {
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
    dialogAction = 'restore'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not save when the watched state is clean', async () => {
    const { recovery } = createRecovery()
    recovery.start()

    await watchCallback()
    await vi.runAllTimersAsync()

    expect(DraftRecoveryService.saveDraft).not.toHaveBeenCalled()
    expect(DraftRecoveryService.clearDraft).toHaveBeenCalledWith({
      userId: 'user1',
      scope: 'scope',
      refKey: 'ref'
    })
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

  it('restores a loaded draft', async () => {
    DraftRecoveryService.loadDraft.mockResolvedValue({
      updatedAt: Date.now(),
      data: { title: 'Recovered' }
    })
    const { recovery, setCurrent } = createRecovery()

    await expect(recovery.maybePromptRecovery()).resolves.toBe('restore')

    expect(setCurrent).toHaveBeenCalledWith({ title: 'Recovered' })
  })

  it('discards a loaded draft', async () => {
    dialogAction = 'discard'
    DraftRecoveryService.loadDraft.mockResolvedValue({
      updatedAt: Date.now(),
      data: { title: 'Recovered' }
    })
    const { recovery } = createRecovery()

    await expect(recovery.maybePromptRecovery()).resolves.toBe('discard')

    expect(DraftRecoveryService.clearDraft).toHaveBeenCalledWith({
      userId: 'user1',
      scope: 'scope',
      refKey: 'ref'
    })
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
