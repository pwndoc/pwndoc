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

describe('BasicEditor table support', () => {
  it('shows the table menu when the toolbar includes "table"', () => {
    const wrapper = createWrapper({ toolbar: ['table'] })
    expect(wrapper.find('[data-testid="editor-table-menu"]').exists()).toBe(true)
  })

  it('hides the table menu when the toolbar does not include "table"', () => {
    const wrapper = createWrapper({ toolbar: ['format', 'marks', 'list'] })
    expect(wrapper.find('[data-testid="editor-table-menu"]').exists()).toBe(false)
  })

  it('includes the table menu in the default toolbar', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-testid="editor-table-menu"]').exists()).toBe(true)
  })

  it('does not offer table operations outside a table', () => {
    const wrapper = createWrapper({ toolbar: ['table'] })
    const can = wrapper.vm.editor.can()
    expect(can.deleteTable()).toBe(false)
    expect(can.addRowAfter()).toBe(false)
    expect(can.addColumnAfter()).toBe(false)
    expect(can.insertTable()).toBe(true)
  })

  it('inserts a table with a header row and emits it as HTML', async () => {
    const wrapper = createWrapper({ toolbar: ['table'] })
    wrapper.vm.editor.commands.insertTable({ rows: 3, cols: 2, withHeaderRow: true })
    await wrapper.vm.$nextTick()

    const html = wrapper.vm.editor.getHTML()
    expect(html).toContain('<table')
    expect(html.match(/<th/g)).toHaveLength(2)
    expect(html.match(/<td/g)).toHaveLength(4)

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted[emitted.length - 1][0]).toContain('<table')

    const can = wrapper.vm.editor.can()
    expect(can.deleteTable()).toBe(true)
    expect(can.addRowAfter()).toBe(true)
    expect(can.deleteColumn()).toBe(true)
  })

  it('loads table HTML from modelValue and keeps merged cells', async () => {
    const html = '<table><tbody><tr><th colspan="2" rowspan="1"><p>Head</p></th></tr><tr><td colspan="1" rowspan="1"><p>a</p></td><td colspan="1" rowspan="1"><p>b</p></td></tr></tbody></table>'
    const wrapper = createWrapper({ toolbar: ['table'], modelValue: html })
    await wrapper.vm.$nextTick()

    const loaded = wrapper.vm.editor.getHTML()
    expect(loaded).toContain('<th colspan="2"')
    expect(loaded).toContain('<p>a</p>')
    expect(loaded).toContain('<p>b</p>')
  })

  it('survives a sanitize round trip', async () => {
    const wrapper = createWrapper({ toolbar: ['table'] })
    wrapper.vm.editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true })
    wrapper.vm.editor.commands.insertContent('cell text')
    await wrapper.vm.$nextTick()
    const html = wrapper.vm.editor.getHTML()

    const sanitized = wrapper.vm.htmlEncode(html)
    expect(sanitized).toContain('<table>')
    expect(sanitized).toContain('cell text')
    expect(sanitized.match(/<th/g)).toHaveLength(2)
    expect(sanitized.match(/<td/g)).toHaveLength(2)
    expect(sanitized).not.toContain('style=')
    expect(sanitized).not.toContain('<colgroup')
  })
})
