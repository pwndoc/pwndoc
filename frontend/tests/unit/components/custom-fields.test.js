import { describe, it, expect, vi } from 'vitest'
import { createTestWrapper } from '../utils/test-utils'
import CustomFields from '@/components/custom-fields.vue'

// Stub the BasicEditor component to avoid complex dependency loading
vi.mock('components/editor/Editor.vue', () => ({
  default: {
    name: 'BasicEditor',
    template: '<div class="basic-editor-stub"></div>',
    props: ['modelValue', 'diff', 'editable', 'noSync', 'fieldName', 'commentMode', 'focusedComment', 'commentIdList']
  }
}))

describe('CustomFields Component', () => {
  const makeField = (overrides = {}) => ({
    customField: {
      _id: 'cf1',
      label: 'Test Field',
      fieldType: 'input',
      size: 12,
      offset: 0,
      required: false,
      description: 'A test field',
      options: [],
      ...overrides.customField
    },
    text: overrides.text !== undefined ? overrides.text : 'some value'
  })

  const defaultProps = {
    modelValue: [makeField()],
    locale: 'en-US'
  }

  const createWrapper = (overrides = {}) => {
    return createTestWrapper(CustomFields, {
      props: { ...defaultProps, ...overrides.props },
      global: {
        stubs: {
          'basic-editor': true,
          'q-field': true,
          'q-input': true,
          'q-select': true,
          'q-badge': true,
          'q-icon': true,
          'q-option-group': true,
          'q-chip': true,
          'q-date': true,
          'q-popup-proxy': true,
          ...(overrides.stubs || {})
        },
        mocks: {
          $settings: {},
          $_: { isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
          ...(overrides.mocks || {})
        }
      }
    })
  }

  it('should render', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('should render with empty modelValue', () => {
    const wrapper = createWrapper({ props: { modelValue: [], locale: 'en-US' } })
    expect(wrapper.exists()).toBe(true)
  })

  describe('computedFields', () => {
    it('should group fields into a single array when no full-size space separator exists', () => {
      const fields = [
        makeField({ customField: { _id: 'f1', label: 'Field 1', fieldType: 'input' }, text: 'val1' }),
        makeField({ customField: { _id: 'f2', label: 'Field 2', fieldType: 'input' }, text: 'val2' })
      ]
      const wrapper = createWrapper({ props: { modelValue: fields, locale: 'en-US' } })

      expect(wrapper.vm.computedFields).toHaveLength(1)
      expect(wrapper.vm.computedFields[0]).toHaveLength(2)
    })

    it('should split fields when a full-size space separator is encountered', () => {
      const fields = [
        makeField({ customField: { _id: 'f1', label: 'Field 1', fieldType: 'input' }, text: 'val1' }),
        makeField({ customField: { _id: 'space1', label: 'Spacer', fieldType: 'space', size: 12 }, text: '' }),
        makeField({ customField: { _id: 'f2', label: 'Field 2', fieldType: 'input' }, text: 'val2' })
      ]
      const wrapper = createWrapper({ props: { modelValue: fields, locale: 'en-US' } })

      // Before space: [Field 1], empty separator: [], after space: [Field 2]
      expect(wrapper.vm.computedFields).toHaveLength(3)
      expect(wrapper.vm.computedFields[0]).toHaveLength(1)
      expect(wrapper.vm.computedFields[0][0].customField._id).toBe('f1')
      expect(wrapper.vm.computedFields[1]).toHaveLength(0)
      expect(wrapper.vm.computedFields[2]).toHaveLength(1)
      expect(wrapper.vm.computedFields[2][0].customField._id).toBe('f2')
    })

    it('should not split on space fields that are not full size', () => {
      const fields = [
        makeField({ customField: { _id: 'f1', label: 'Field 1', fieldType: 'input' }, text: 'val1' }),
        makeField({ customField: { _id: 'space1', label: 'Spacer', fieldType: 'space', size: 6 }, text: '' }),
        makeField({ customField: { _id: 'f2', label: 'Field 2', fieldType: 'input' }, text: 'val2' })
      ]
      const wrapper = createWrapper({ props: { modelValue: fields, locale: 'en-US' } })

      // No split since size is 6 not 12
      expect(wrapper.vm.computedFields).toHaveLength(1)
      expect(wrapper.vm.computedFields[0]).toHaveLength(3)
    })

    it('should handle multiple consecutive space separators', () => {
      const fields = [
        makeField({ customField: { _id: 'space1', label: 'Spacer1', fieldType: 'space', size: 12 }, text: '' }),
        makeField({ customField: { _id: 'space2', label: 'Spacer2', fieldType: 'space', size: 12 }, text: '' })
      ]
      const wrapper = createWrapper({ props: { modelValue: fields, locale: 'en-US' } })

      // First space: push empty tmpArray, push empty separator. Second space: push empty tmpArray, push empty separator.
      expect(wrapper.vm.computedFields).toHaveLength(4)
    })
  })

  describe('isTextInCustomFields', () => {
    it('should return false when diff is null', () => {
      const field = makeField({ customField: { _id: 'cf1', label: 'Test', fieldType: 'input' }, text: 'value' })
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US', diff: null }
      })

      expect(wrapper.vm.isTextInCustomFields(field)).toBe(false)
    })

    it('should return false when field text matches the diff text (no difference)', () => {
      const field = makeField({ customField: { _id: 'cf1', label: 'Test', fieldType: 'input' }, text: 'same value' })
      const diffField = { customField: { _id: 'cf1' }, text: 'same value' }
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US', diff: [diffField] }
      })

      expect(wrapper.vm.isTextInCustomFields(field)).toBe(false)
    })

    it('should return true when field text differs from diff text', () => {
      const field = makeField({ customField: { _id: 'cf1', label: 'Test', fieldType: 'input' }, text: 'new value' })
      const diffField = { customField: { _id: 'cf1' }, text: 'old value' }
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US', diff: [diffField] }
      })

      expect(wrapper.vm.isTextInCustomFields(field)).toBe(true)
    })

    it('should return true when field is not found in diff', () => {
      const field = makeField({ customField: { _id: 'cf1', label: 'Test', fieldType: 'input' }, text: 'value' })
      const diffField = { customField: { _id: 'other-id' }, text: 'value' }
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US', diff: [diffField] }
      })

      expect(wrapper.vm.isTextInCustomFields(field)).toBe(true)
    })
  })

  describe('getTextDiffInCustomFields', () => {
    it('should return empty string when diff is null', () => {
      const field = makeField({ customField: { _id: 'cf1', label: 'Test', fieldType: 'text' }, text: 'value' })
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US', diff: null }
      })

      expect(wrapper.vm.getTextDiffInCustomFields(field)).toBe('')
    })

    it('should return diff text when field is found in diff', () => {
      const field = makeField({ customField: { _id: 'cf1', label: 'Test', fieldType: 'text' }, text: 'new value' })
      const diffField = { customField: { _id: 'cf1' }, text: 'old value' }
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US', diff: [diffField] }
      })

      expect(wrapper.vm.getTextDiffInCustomFields(field)).toBe('old value')
    })

    it('should return empty string when field is not found in diff', () => {
      const field = makeField({ customField: { _id: 'cf1', label: 'Test', fieldType: 'text' }, text: 'value' })
      const diffField = { customField: { _id: 'other-id' }, text: 'other value' }
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US', diff: [diffField] }
      })

      expect(wrapper.vm.getTextDiffInCustomFields(field)).toBe('')
    })
  })

  describe('requiredFieldsEmpty', () => {
    it('should return false when no required fields exist', () => {
      const field = makeField({ customField: { _id: 'cf1', label: 'Test', fieldType: 'input', required: false }, text: 'value' })
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US' },
        stubs: {
          'q-input': { template: '<div />', methods: { validate: vi.fn() } }
        }
      })

      // Mock $refs to avoid errors during validate()
      Object.defineProperty(wrapper.vm, '$refs', { value: {}, writable: true, configurable: true })
      expect(wrapper.vm.requiredFieldsEmpty()).toBe(false)
    })

    it('should return true when a required field has empty text', () => {
      const field = makeField({ customField: { _id: 'cf1', label: 'Test', fieldType: 'input', required: true }, text: '' })
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US' }
      })

      vi.spyOn(wrapper.vm, 'validate').mockImplementation(() => {})
      expect(wrapper.vm.requiredFieldsEmpty()).toBe(true)
    })

    it('should return false when all required fields have values', () => {
      const field = makeField({ customField: { _id: 'cf1', label: 'Test', fieldType: 'input', required: true }, text: 'filled' })
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US' }
      })

      vi.spyOn(wrapper.vm, 'validate').mockImplementation(() => {})
      expect(wrapper.vm.requiredFieldsEmpty()).toBe(false)
    })

    it('should ignore space fieldType when checking required fields', () => {
      const fields = [
        makeField({ customField: { _id: 'space1', label: 'Spacer', fieldType: 'space', required: true }, text: '' })
      ]
      const wrapper = createWrapper({
        props: { modelValue: fields, locale: 'en-US' }
      })

      Object.defineProperty(wrapper.vm, '$refs', { value: {}, writable: true, configurable: true })
      expect(wrapper.vm.requiredFieldsEmpty()).toBe(false)
    })
  })

  describe('getOptionsGroup', () => {
    it('should filter options by locale and map to label/value format', () => {
      const options = [
        { locale: 'en-US', value: 'Option A' },
        { locale: 'fr-FR', value: 'Option B' },
        { locale: 'en-US', value: 'Option C' }
      ]
      const field = makeField({
        customField: { _id: 'cf1', label: 'Test', fieldType: 'radio', options },
        text: ''
      })
      const wrapper = createWrapper({
        props: { modelValue: [field], locale: 'en-US' }
      })

      const result = wrapper.vm.getOptionsGroup(options)
      expect(result).toEqual([
        { label: 'Option A', value: 'Option A' },
        { label: 'Option C', value: 'Option C' }
      ])
    })

    it('should return empty array when no options match the locale', () => {
      const options = [
        { locale: 'fr-FR', value: 'Option B' }
      ]
      const wrapper = createWrapper({
        props: { modelValue: [makeField()], locale: 'en-US' }
      })

      const result = wrapper.vm.getOptionsGroup(options)
      expect(result).toEqual([])
    })

    it('should return empty array for empty options', () => {
      const wrapper = createWrapper()
      const result = wrapper.vm.getOptionsGroup([])
      expect(result).toEqual([])
    })
  })

  describe('props', () => {
    it('should use default customElement of div', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.customElement).toBe('div')
    })

    it('should accept a custom customElement', () => {
      const wrapper = createWrapper({
        props: { ...defaultProps, customElement: 'span' }
      })
      expect(wrapper.vm.customElement).toBe('span')
    })

    it('should default readonly to false', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.readonly).toBe(false)
    })

    it('should default commentMode to false', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.commentMode).toBe(false)
    })

    it('should default canCreateComment to false', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.canCreateComment).toBe(false)
    })

    it('should default noSyncEditor to false', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.noSyncEditor).toBe(false)
    })

    it('should default diff to null', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.diff).toBeNull()
    })

    it('should default commentIdList to empty array', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.commentIdList).toEqual([])
    })

    it('should default fieldHighlighted to empty string', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.fieldHighlighted).toBe('')
    })
  })
})
