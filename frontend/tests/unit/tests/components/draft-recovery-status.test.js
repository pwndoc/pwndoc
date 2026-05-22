import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTestWrapper } from '../../test-utils'
import DraftRecoveryStatus from '@/components/draft-recovery-status.vue'

vi.mock('@/services/draft-recovery', () => ({
  default: {
    state: {
      current: null
    }
  }
}))

import DraftRecoveryService from '@/services/draft-recovery'

const messages = {
  'en-US': {
    draftRecovery: {
      actionCannotBeUndone: 'Cannot be undone',
      clearedAfterInactivity: 'Cleared after inactivity',
      compareWithDraft: 'Compare with draft',
      deletePermanently: 'Delete permanently',
      discardDraft: 'Revert to saved version',
      discardLocalChanges: 'Discard local changes',
      draftExpired: 'Draft expired',
      draftExpiresIn: 'Draft expires in',
      edited: 'Edited',
      editedJustNow: 'Edited just now',
      localDraftExists: 'Local draft exists',
      localDraftLabel: 'Recovered changes',
      localDraftNotApplied: 'Local draft not applied',
      notSavedToServer: 'Not saved to server',
      replaceWithDraft: 'Replace with draft',
      restoreDraftLabel: 'Restore recovered changes',
      reviewChangesInDraft: 'Review changes in draft',
      saveHint: 'Save to keep recovered changes',
      serverVersionLabel: 'Saved version',
      viewChangesLabel: 'View changes',
      viewingLocalDraft: 'Viewing local draft',
      viewingServerVersion: 'Viewing saved version'
    }
  }
}

function createWrapper() {
  return createTestWrapper(DraftRecoveryStatus, {
    messages,
    global: {
      stubs: {
        'q-btn-dropdown': { template: '<div data-testid="draft-recovery-status"><slot name="label" /><slot /></div>' },
        'q-list': { template: '<div><slot /></div>' },
        'q-item': { template: '<button type="button" @click="$emit(\'click\')"><slot /></button>' },
        'q-item-section': { template: '<span><slot /></span>' },
        'q-item-label': { template: '<span><slot /></span>' },
        'q-icon': true,
        'q-separator': true,
        'q-tooltip': true
      }
    }
  })
}

describe('DraftRecoveryStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-14T12:00:00Z'))
    DraftRecoveryService.state.current = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render when there is no active status', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('[data-testid="draft-recovery-status"]').exists()).toBe(false)
  })

  it('formats local draft labels, expiry, and actions', () => {
    const discard = vi.fn()
    const view = vi.fn()
    DraftRecoveryService.state.current = {
      type: 'local_draft',
      draft: { updatedAt: Date.now() - 3 * 60 * 1000 },
      changeCount: 2,
      actions: [
        { id: 'discard', handler: discard },
        { id: 'view_changes', handler: view }
      ]
    }

    const wrapper = createWrapper()

    expect(wrapper.vm.mainLabel).toBe('Recovered changes')
    expect(wrapper.vm.metaLabel).toBe('Edited 3 min ago')
    expect(wrapper.vm.bannerLine1).toBe('Viewing local draft')
    expect(wrapper.vm.expiryLabel).toBe('Draft expires in 6d 23h 57m')
    expect(wrapper.vm.actionConfigs).toEqual([
      expect.objectContaining({ id: 'discard', label: 'Revert to saved version', handler: discard }),
      expect.objectContaining({ id: 'view_changes', label: 'View changes (2)', handler: view })
    ])
  })

  it('formats server version status with restore and delete actions', () => {
    const restore = vi.fn()
    const remove = vi.fn()
    DraftRecoveryService.state.current = {
      type: 'server_version',
      draft: { updatedAt: Date.now() - 2 * 60 * 60 * 1000 },
      changeCount: 1,
      actions: [
        { id: 'restore', handler: restore },
        { id: 'separator' },
        { id: 'delete_permanently', handler: remove }
      ]
    }

    const wrapper = createWrapper()

    expect(wrapper.vm.mainLabel).toBe('Saved version')
    expect(wrapper.vm.metaLabel).toBe('Local draft exists')
    expect(wrapper.vm.bannerLine2).toBe('Local draft not applied')
    expect(wrapper.vm.actionConfigs).toEqual([
      expect.objectContaining({ id: 'restore', label: 'Restore recovered changes', handler: restore }),
      { id: 'separator' },
      expect.objectContaining({ id: 'delete_permanently', label: 'Delete permanently', handler: remove })
    ])
  })
})
