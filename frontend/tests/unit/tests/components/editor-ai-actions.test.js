import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../../test-utils'
import BasicEditor from '@/components/editor/Editor.vue'

vi.mock('boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/services/image', () => ({
  default: { createImage: vi.fn() }
}))

function createWrapper(props = {}) {
  return createTestWrapper(BasicEditor, {
    props: {
      modelValue: '',
      toolbar: [],
      noAffix: true,
      ...props
    },
    global: {
      directives: {
        sticky: {}
      },
      stubs: {
        'editor-content': true,
        'bubble-menu': true,
        'q-tooltip': true,
        'q-inner-loading': true
      },
      mocks: {
        $settings: {
          report: {
            public: {
              enableSpellCheck: false,
              captions: []
            }
          }
        }
      }
    }
  })
}

describe('BasicEditor assisted-writing toolbar actions', () => {
  it('preserves HTTPS links loaded from stored editor HTML', () => {
    const wrapper = createWrapper({
      modelValue: '<p><a href="https://example.com/report.pdf">report.pdf</a></p>'
    })

    expect(wrapper.vm.editor.getHTML()).toContain(
      '<a target="_blank" rel="noopener noreferrer" href="https://example.com/report.pdf">report.pdf</a>'
    )
  })

  it('places the AI action immediately after the existing comment action', () => {
    const wrapper = createWrapper({ commentMode: true, showAiButton: true })
    const group = wrapper.find('.editor-toolbar__assisted-actions')
    const comment = group.find('[data-testid="editor-comment-action"]')
    const ai = group.find('[data-testid="editor-ai-action"]')

    expect(comment.exists()).toBe(true)
    expect(comment.find('q-icon').attributes('name')).toBe('add_comment')
    expect(ai.exists()).toBe(true)
    expect(ai.find('q-icon').attributes('name')).toBe('auto_awesome')
    expect(comment.element.nextElementSibling).toBe(ai.element)
    expect(ai.classes()).toContain('ai-gradient-icon-btn')
  })

  it('renders the AI action independently when comment mode is disabled', () => {
    const wrapper = createWrapper({ commentMode: false, showAiButton: true })

    expect(wrapper.find('[data-testid="editor-comment-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="editor-ai-action"]').exists()).toBe(true)
  })

  it('renders the comment action independently when AI is unavailable', () => {
    const wrapper = createWrapper({ commentMode: true, showAiButton: false })

    expect(wrapper.find('[data-testid="editor-comment-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="editor-ai-action"]').exists()).toBe(false)
  })
})
