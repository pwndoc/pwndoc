import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestWrapper } from '../../test-utils'
import TextareaArray from '@/components/textarea-array.vue'

describe('TextareaArray Component', () => {
  const defaultProps = {
    label: 'Test Label',
    modelValue: ['line1', 'line2', 'line3']
  }

  const createWrapper = (overrides = {}) => {
    return createTestWrapper(TextareaArray, {
      props: { ...defaultProps, ...overrides.props },
      global: {
        mocks: {
          ...(overrides.mocks || {})
        }
      }
    })
  }

  it('should render', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  describe('initial state', () => {
    it('should join modelValue array into a newline-separated string on mount', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.dataString).toBe('line1\nline2\nline3')
    })

    it('should set dataString to empty string when modelValue is undefined', () => {
      const wrapper = createWrapper({ props: { modelValue: undefined } })
      expect(wrapper.vm.dataString).toBe('')
    })

    it('should set dataString to empty string when modelValue is an empty array', () => {
      const wrapper = createWrapper({ props: { modelValue: [] } })
      expect(wrapper.vm.dataString).toBe('')
    })

    it('should initialize hasError to false', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.hasError).toBe(false)
    })
  })

  describe('props', () => {
    it('should accept label prop', () => {
      const wrapper = createWrapper({ props: { label: 'My Label' } })
      expect(wrapper.vm.label).toBe('My Label')
    })

    it('should accept readonly prop', () => {
      const wrapper = createWrapper({ props: { readonly: true } })
      expect(wrapper.vm.readonly).toBe(true)
    })

    it('should default readonly to false', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.readonly).toBe(false)
    })

    it('should default noEmptyLine to false', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.noEmptyLine).toBe(false)
    })

    it('should accept rules prop', () => {
      const rules = [val => !!val || 'Required']
      const wrapper = createWrapper({ props: { rules } })
      expect(wrapper.vm.rules).toEqual(rules)
    })

    it('should show required asterisk when rules are provided with non-empty first rule', () => {
      const rules = [val => !!val || 'Required']
      const wrapper = createWrapper({ props: { rules } })
      // The template shows asterisk when rules && rules[0] !== ''
      expect(wrapper.vm.rules).toBeTruthy()
      expect(wrapper.vm.rules[0]).not.toBe('')
    })

    it('should not show required asterisk when rules first element is empty string', () => {
      const rules = ['']
      const wrapper = createWrapper({ props: { rules } })
      const asterisk = wrapper.find('.text-red')
      expect(asterisk.exists()).toBe(false)
    })

    it('should not show required asterisk when rules are not provided', () => {
      const wrapper = createWrapper()
      const asterisk = wrapper.find('.text-red')
      expect(asterisk.exists()).toBe(false)
    })
  })

  describe('watcher: modelValue', () => {
    it('should update dataString when modelValue changes', async () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.dataString).toBe('line1\nline2\nline3')

      await wrapper.setProps({ modelValue: ['a', 'b'] })
      expect(wrapper.vm.dataString).toBe('a\nb')
    })

    it('should set dataString to empty string when modelValue becomes null', async () => {
      const wrapper = createWrapper()
      await wrapper.setProps({ modelValue: null })
      expect(wrapper.vm.dataString).toBe('')
    })

    it('should not update dataString if the joined value matches current dataString', async () => {
      const wrapper = createWrapper()
      const original = wrapper.vm.dataString

      // Setting the same value should not trigger a change
      await wrapper.setProps({ modelValue: ['line1', 'line2', 'line3'] })
      expect(wrapper.vm.dataString).toBe(original)
    })
  })

  describe('updateParent method', () => {
    it('should emit update:modelValue with split lines', async () => {
      const wrapper = createWrapper()
      wrapper.vm.dataString = 'foo\nbar\nbaz'
      wrapper.vm.updateParent()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0][0]).toEqual(['foo', 'bar', 'baz'])
    })

    it('should include empty lines when noEmptyLine is false', () => {
      const wrapper = createWrapper()
      wrapper.vm.dataString = 'foo\n\nbar\n'
      wrapper.vm.updateParent()

      expect(wrapper.emitted('update:modelValue')[0][0]).toEqual(['foo', '', 'bar', ''])
    })

    it('should filter out empty lines when noEmptyLine is true', () => {
      const wrapper = createWrapper({ props: { noEmptyLine: true } })
      wrapper.vm.dataString = 'foo\n\nbar\n'
      wrapper.vm.updateParent()

      expect(wrapper.emitted('update:modelValue')[0][0]).toEqual(['foo', 'bar'])
    })

    it('should handle single line input', () => {
      const wrapper = createWrapper()
      wrapper.vm.dataString = 'single'
      wrapper.vm.updateParent()

      expect(wrapper.emitted('update:modelValue')[0][0]).toEqual(['single'])
    })

    it('should handle empty string input', () => {
      const wrapper = createWrapper()
      wrapper.vm.dataString = ''
      wrapper.vm.updateParent()

      expect(wrapper.emitted('update:modelValue')[0][0]).toEqual([''])
    })

    it('should filter empty string from empty input when noEmptyLine is true', () => {
      const wrapper = createWrapper({ props: { noEmptyLine: true } })
      wrapper.vm.dataString = ''
      wrapper.vm.updateParent()

      expect(wrapper.emitted('update:modelValue')[0][0]).toEqual([])
    })
  })

  describe('validate method', () => {
    it('should call validate on the textarea ref and update hasError', () => {
      const wrapper = createWrapper()

      // Mock the ref
      const mockValidate = vi.fn()
      Object.defineProperty(wrapper.vm.$refs, 'textareaField', {
        value: { validate: mockValidate, hasError: true },
        writable: true,
        configurable: true
      })

      wrapper.vm.validate()

      expect(mockValidate).toHaveBeenCalled()
      expect(wrapper.vm.hasError).toBe(true)
    })

    it('should set hasError to false when validation passes', () => {
      const wrapper = createWrapper()

      Object.defineProperty(wrapper.vm.$refs, 'textareaField', {
        value: { validate: vi.fn(), hasError: false },
        writable: true,
        configurable: true
      })

      wrapper.vm.validate()
      expect(wrapper.vm.hasError).toBe(false)
    })
  })
})
