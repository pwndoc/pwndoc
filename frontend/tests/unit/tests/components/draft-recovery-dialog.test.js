import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../../test-utils'
import DraftRecoveryDialog from '@/components/draft-recovery-dialog.vue'

const { dialogOk, dialogHide } = vi.hoisted(() => ({
  dialogOk: vi.fn(),
  dialogHide: vi.fn()
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    useDialogPluginComponent: Object.assign(
      vi.fn(() => ({
        dialogRef: null,
        onDialogHide: dialogHide,
        onDialogOK: dialogOk
      })),
      { emits: ['ok', 'hide'] }
    )
  }
})

function createWrapper(props = {}) {
  return createTestWrapper(DraftRecoveryDialog, {
    props: {
      draft: {
        updatedAt: Date.UTC(2026, 4, 14, 12, 30, 0),
        data: { title: 'Draft title' }
      },
      current: { title: 'Server title' },
      languages: [{ locale: 'en-US', language: 'English' }],
      ...props
    },
    messages: {
      'en-US': {
        draftRecovery: {
          message: 'Review changes',
          savedAt: 'Saved at',
          title: 'Recovered draft'
        }
      }
    },
    global: {
      stubs: {
        'q-dialog': { template: '<div role="dialog"><slot /></div>' },
        'q-card': { template: '<div><slot /></div>' },
        'q-card-section': { template: '<section><slot /></section>' },
        'q-icon': true,
        'q-space': true,
        'q-btn': true,
        'q-separator': true,
        'draft-diff': {
          name: 'DraftDiff',
          props: ['current', 'draft', 'languages'],
          template: '<div data-testid="draft-diff"></div>'
        }
      }
    }
  })
}

describe('DraftRecoveryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes current, draft data, and languages into DraftDiff', () => {
    const wrapper = createWrapper()
    const diff = wrapper.findComponent({ name: 'DraftDiff' })

    expect(wrapper.text()).toContain('Recovered draft')
    expect(wrapper.text()).toContain('Saved at')
    expect(diff.props('current')).toEqual({ title: 'Server title' })
    expect(diff.props('draft')).toEqual({ title: 'Draft title' })
    expect(diff.props('languages')).toEqual([{ locale: 'en-US', language: 'English' }])
  })

  it('formats the saved timestamp from the draft update time', () => {
    const wrapper = createWrapper()

    expect(wrapper.vm.savedAt).toBe(new Date(Date.UTC(2026, 4, 14, 12, 30, 0)).toLocaleString())
  })

  it('emits restore and discard dialog actions', () => {
    const wrapper = createWrapper()

    wrapper.vm.restore()
    wrapper.vm.discard()

    expect(dialogOk).toHaveBeenNthCalledWith(1, 'restore')
    expect(dialogOk).toHaveBeenNthCalledWith(2, 'discard')
  })
})
