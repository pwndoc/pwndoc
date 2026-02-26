import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

// Mock the user store before importing the component
vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => ({
    roles: '',
    isAllowed: vi.fn(() => false)
  }))
}))

import CustomPage from '@/pages/data/custom/index.vue'

// Mock services used by the page
vi.mock('@/services/data', () => ({
  default: {
    getLanguages: vi.fn(),
    createLanguage: vi.fn(),
    updateLanguages: vi.fn(),
    getAuditTypes: vi.fn(),
    createAuditType: vi.fn(),
    updateAuditTypes: vi.fn(),
    getVulnerabilityTypes: vi.fn(),
    createVulnerabilityType: vi.fn(),
    updateVulnTypes: vi.fn(),
    getVulnerabilityCategories: vi.fn(),
    createVulnerabilityCategory: vi.fn(),
    updateVulnerabilityCategories: vi.fn(),
    getCustomFields: vi.fn(),
    createCustomField: vi.fn(),
    updateCustomFields: vi.fn(),
    deleteCustomField: vi.fn(),
    getSections: vi.fn(),
    createSection: vi.fn(),
    updateSections: vi.fn()
  }
}))

vi.mock('@/services/template', () => ({
  default: {
    getTemplates: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    syncEditors: vi.fn(),
    htmlEncode: vi.fn((v) => v),
    strongPassword: vi.fn()
  }
}))

vi.mock('@/boot/i18n', () => ({
  $t: (key) => key
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Dialog: {
      create: vi.fn(() => ({ onOk: vi.fn().mockReturnThis(), onCancel: vi.fn().mockReturnThis() }))
    },
    Notify: {
      create: vi.fn()
    }
  }
})

import DataService from '@/services/data'
import TemplateService from '@/services/template'
import Utils from '@/services/utils'
import { Notify, Dialog } from 'quasar'

describe('Data Custom Page', () => {
  let router, pinia, i18n

  const mockLanguages = [
    { locale: 'en-US', language: 'English' },
    { locale: 'fr-FR', language: 'French' }
  ]
  const mockAuditTypes = [
    { _id: '1', name: 'Web', templates: [], sections: [], hidden: [], stage: 'default' }
  ]
  const mockVulnTypes = [
    { _id: '1', name: 'XSS', locale: 'en-US' },
    { _id: '2', name: 'SQLi', locale: 'en-US' }
  ]
  const mockVulnCategories = [
    { _id: '1', name: 'Web', sortValue: 'cvssScore', sortOrder: 'desc', sortAuto: true }
  ]
  const mockCustomFields = [
    { _id: '1', label: 'Field1', fieldType: 'input', display: 'general', displaySub: '', displayList: [], size: 12, offset: 0, required: false, text: [], options: [], position: 0 }
  ]
  const mockSections = [
    { _id: '1', field: 'exec_summary', name: 'Executive Summary', icon: '' }
  ]
  const mockTemplates = [
    { _id: 't1', name: 'Default Template' }
  ]

  function setupServiceMocks() {
    DataService.getLanguages.mockResolvedValue({ data: { datas: mockLanguages } })
    DataService.getAuditTypes.mockResolvedValue({ data: { datas: mockAuditTypes } })
    DataService.getVulnerabilityTypes.mockResolvedValue({ data: { datas: mockVulnTypes } })
    DataService.getVulnerabilityCategories.mockResolvedValue({ data: { datas: mockVulnCategories } })
    DataService.getCustomFields.mockResolvedValue({ data: { datas: mockCustomFields } })
    DataService.getSections.mockResolvedValue({ data: { datas: mockSections } })
    TemplateService.getTemplates.mockResolvedValue({ data: { datas: mockTemplates } })
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/data/custom', component: CustomPage }
      ]
    })

    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      fallbackLocale: 'en-US',
      messages: { 'en-US': {} }
    })

    vi.clearAllMocks()
    setupServiceMocks()
  })

  const createWrapper = (options = {}) => {
    return mount(CustomPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-tabs': true,
          'q-tab': true,
          'q-tab-panels': true,
          'q-tab-panel': true,
          'q-page': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-input': true,
          'q-btn': true,
          'q-select': true,
          'q-item': true,
          'q-item-section': true,
          'q-separator': true,
          'q-toolbar': true,
          'q-space': true,
          'q-tooltip': true,
          'q-icon': true,
          'q-expansion-item': true,
          'q-radio': true,
          'q-checkbox': true,
          'q-toggle': true,
          'q-chip': true,
          'q-list': true,
          'q-field': true,
          'q-menu': true,
          'q-popup-proxy': true,
          'q-date': true,
          'q-avatar': true,
          'q-option-group': true,
          'basic-editor': true,
          'custom-fields': true,
          'draggable': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $settings: {},
          $_: { cloneDeep: (v) => JSON.parse(JSON.stringify(v)) },
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should load all data on mount', async () => {
      createWrapper()
      await vi.waitFor(() => {
        expect(TemplateService.getTemplates).toHaveBeenCalled()
        expect(DataService.getLanguages).toHaveBeenCalled()
        expect(DataService.getAuditTypes).toHaveBeenCalled()
        expect(DataService.getVulnerabilityTypes).toHaveBeenCalled()
        expect(DataService.getVulnerabilityCategories).toHaveBeenCalled()
        expect(DataService.getSections).toHaveBeenCalled()
        expect(DataService.getCustomFields).toHaveBeenCalled()
      })
    })

    it('should set default selectedTab to languages', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.selectedTab).toBe('languages')
    })

    it('should populate languages from service response', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.languages).toEqual(mockLanguages)
    })

    it('should set default vulnType locale and cfLocale from first language', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.newVulnType.locale).toBe('en-US')
      expect(wrapper.vm.cfLocale).toBe('en-US')
    })

    it('should populate templates from service response', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.templates).toEqual(mockTemplates)
    })

    it('should populate auditTypes from service response', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.auditTypes).toEqual(mockAuditTypes)
    })

    it('should populate vulnTypes from service response', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.vulnTypes).toEqual(mockVulnTypes)
    })

    it('should populate vulnCategories from service response', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.vulnCategories).toEqual(mockVulnCategories)
    })

    it('should filter customFields to only those with display property', async () => {
      DataService.getCustomFields.mockResolvedValue({
        data: {
          datas: [
            { _id: '1', label: 'HasDisplay', display: 'general', displayList: [] },
            { _id: '2', label: 'NoDisplay', display: '', displayList: [] }
          ]
        }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.customFields).toEqual([
        { _id: '1', label: 'HasDisplay', display: 'general', displayList: [] }
      ])
    })

    it('should populate sections from service response', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.sections).toEqual(mockSections)
    })
  })

  describe('Languages', () => {
    it('should create language and refresh list on success', async () => {
      DataService.createLanguage.mockResolvedValue({ data: { datas: {} } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.newLanguage = { locale: 'de-DE', language: 'German' }
      wrapper.vm.selectedTab = 'languages'

      // Capture the args before the component mutates them after resolution
      let capturedArgs = null
      DataService.createLanguage.mockImplementation((arg) => {
        capturedArgs = JSON.parse(JSON.stringify(arg))
        return Promise.resolve({ data: { datas: {} } })
      })

      try { wrapper.vm.createLanguage() } catch (e) { /* $refs access may throw */ }
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(capturedArgs).toEqual({ locale: 'de-DE', language: 'German' })
    })

    it('should show error notification on create language failure', async () => {
      DataService.createLanguage.mockRejectedValue({
        response: { data: { datas: 'Language already exists' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.newLanguage = { locale: 'en-US', language: 'English' }

      try { wrapper.vm.createLanguage() } catch (e) { /* $refs access may throw */ }
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Language already exists', color: 'negative' })
      )
    })

    it('should update languages and refresh on success', async () => {
      DataService.updateLanguages.mockResolvedValue({ data: { datas: {} } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.editLanguages = [{ locale: 'en-US', language: 'English Updated' }]
      wrapper.vm.editLanguage = true

      wrapper.vm.updateLanguages()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(DataService.updateLanguages).toHaveBeenCalledWith([{ locale: 'en-US', language: 'English Updated' }])
    })

    it('should remove language from editLanguages by locale', () => {
      const wrapper = createWrapper()
      wrapper.vm.editLanguages = [
        { locale: 'en-US', language: 'English' },
        { locale: 'fr-FR', language: 'French' }
      ]

      wrapper.vm.removeLanguage('en-US')

      expect(wrapper.vm.editLanguages).toEqual([{ locale: 'fr-FR', language: 'French' }])
    })
  })

  describe('Audit Types', () => {
    it('should create audit type and refresh on success', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.newAuditType = { name: 'Network', templates: ['t1', 't2'], sections: [], hidden: [], stage: 'default' }
      wrapper.vm.selectedTab = 'audit-types'

      // Capture the args before the component mutates them after resolution
      let capturedArgs = null
      DataService.createAuditType.mockImplementation((arg) => {
        capturedArgs = JSON.parse(JSON.stringify(arg))
        return Promise.resolve({ data: { datas: {} } })
      })

      try { wrapper.vm.createAuditType() } catch (e) { /* $refs access may throw */ }
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(capturedArgs).toEqual(
        expect.objectContaining({ name: 'Network' })
      )
    })

    it('should update audit types and toggle edit mode on success', async () => {
      DataService.updateAuditTypes.mockResolvedValue({ data: { datas: {} } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.editAuditTypes = [{ _id: '1', name: 'Updated Web' }]
      wrapper.vm.editAuditType = true

      wrapper.vm.updateAuditTypes()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(DataService.updateAuditTypes).toHaveBeenCalledWith([{ _id: '1', name: 'Updated Web' }])
      expect(wrapper.vm.editAuditType).toBe(false)
    })

    it('should remove audit type from edit list by name', () => {
      const wrapper = createWrapper()
      wrapper.vm.editAuditTypes = [
        { name: 'Web', stage: 'default' },
        { name: 'Mobile', stage: 'default' }
      ]

      wrapper.vm.removeAuditType({ name: 'Web' })

      expect(wrapper.vm.editAuditTypes).toEqual([{ name: 'Mobile', stage: 'default' }])
    })

    it('should return template options for a given locale', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const options = wrapper.vm.getTemplateOptionsLanguage('en-US')

      expect(options).toEqual([
        { name: 'Default Template', locale: 'en-US', template: 't1' }
      ])
    })
  })

  describe('Vulnerability Types', () => {
    it('should create vulnerability type and refresh on success', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.newVulnType = { name: 'CSRF', locale: 'en-US' }

      // Capture the args before the component mutates them after resolution
      let capturedArgs = null
      DataService.createVulnerabilityType.mockImplementation((arg) => {
        capturedArgs = JSON.parse(JSON.stringify(arg))
        return Promise.resolve({ data: { datas: {} } })
      })

      wrapper.vm.createVulnerabilityType()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(capturedArgs).toEqual({ name: 'CSRF', locale: 'en-US' })
    })

    it('should validate name is required when creating vulnerability type', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newVulnType = { name: '', locale: 'en-US' }
      wrapper.vm.createVulnerabilityType()

      expect(wrapper.vm.errors.vulnType).toBe('Name required')
      expect(DataService.createVulnerabilityType).not.toHaveBeenCalled()
    })

    it('should update vulnerability types and toggle edit mode on success', async () => {
      DataService.updateVulnTypes.mockResolvedValue({ data: { datas: {} } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.editVulnTypes = [{ _id: '1', name: 'XSS Updated', locale: 'en-US' }]
      wrapper.vm.editVulnType = true

      wrapper.vm.updateVulnTypes()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(DataService.updateVulnTypes).toHaveBeenCalledWith([{ _id: '1', name: 'XSS Updated', locale: 'en-US' }])
      expect(wrapper.vm.editVulnType).toBe(false)
    })

    it('should remove vulnerability type from edit list by name and locale', () => {
      const wrapper = createWrapper()
      wrapper.vm.editVulnTypes = [
        { name: 'XSS', locale: 'en-US' },
        { name: 'XSS', locale: 'fr-FR' },
        { name: 'SQLi', locale: 'en-US' }
      ]

      wrapper.vm.removeVulnType({ name: 'XSS', locale: 'en-US' })

      expect(wrapper.vm.editVulnTypes).toEqual([
        { name: 'XSS', locale: 'fr-FR' },
        { name: 'SQLi', locale: 'en-US' }
      ])
    })

    it('should compute vulnTypesLocale based on selected locale', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.newVulnType.locale = 'en-US'

      expect(wrapper.vm.vulnTypesLocale).toEqual([
        { _id: '1', name: 'XSS', locale: 'en-US' },
        { _id: '2', name: 'SQLi', locale: 'en-US' }
      ])
    })
  })

  describe('Vulnerability Categories', () => {
    it('should create vulnerability category and refresh on success', async () => {
      DataService.createVulnerabilityCategory.mockResolvedValue({ data: { datas: {} } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newVulnCat = { name: 'Network', sortValue: 'cvssScore', sortOrder: 'desc', sortAuto: true }

      wrapper.vm.createVulnerabilityCategory()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(DataService.createVulnerabilityCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Network' })
      )
    })

    it('should validate name is required when creating vulnerability category', () => {
      const wrapper = createWrapper()

      wrapper.vm.newVulnCat = { name: '', sortValue: 'cvssScore', sortOrder: 'desc', sortAuto: true }
      wrapper.vm.createVulnerabilityCategory()

      expect(wrapper.vm.errors.vulnCat).toBe('Name required')
      expect(DataService.createVulnerabilityCategory).not.toHaveBeenCalled()
    })

    it('should reset newVulnCat after successful creation', async () => {
      DataService.createVulnerabilityCategory.mockResolvedValue({ data: { datas: {} } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newVulnCat = { name: 'TestCat', sortValue: 'priority', sortOrder: 'asc', sortAuto: false }
      wrapper.vm.createVulnerabilityCategory()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.newVulnCat).toEqual({
        name: '',
        sortValue: 'cvssScore',
        sortOrder: 'desc',
        sortAuto: true
      })
    })

    it('should update vulnerability categories and toggle edit mode on success', async () => {
      DataService.updateVulnerabilityCategories.mockResolvedValue({ data: { datas: {} } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.editCategories = [{ _id: '1', name: 'Updated' }]
      wrapper.vm.editCategory = true

      wrapper.vm.updateVulnCategories()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(DataService.updateVulnerabilityCategories).toHaveBeenCalledWith([{ _id: '1', name: 'Updated' }])
      expect(wrapper.vm.editCategory).toBe(false)
    })

    it('should remove category from edit list by name', () => {
      const wrapper = createWrapper()
      wrapper.vm.editCategories = [
        { name: 'Web' },
        { name: 'Network' }
      ]

      wrapper.vm.removeCategory({ name: 'Web' })

      expect(wrapper.vm.editCategories).toEqual([{ name: 'Network' }])
    })

    it('should return sort options including custom fields for a category', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Add a custom field that should appear in sort options
      wrapper.vm.customFields = [
        { label: 'Priority Level', fieldType: 'select', display: 'finding', displaySub: 'Web' }
      ]

      const options = wrapper.vm.getSortOptions('Web')

      // Should include base options plus the custom field
      expect(options.length).toBeGreaterThan(5)
      expect(options.find(o => o.label === 'Priority Level')).toBeTruthy()
    })

    it('should not include non-matching custom fields in sort options', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.customFields = [
        { label: 'Text Field', fieldType: 'text', display: 'finding', displaySub: '' }
      ]

      const options = wrapper.vm.getSortOptions('Web')

      // text fieldType is not in allowed list, should not appear
      expect(options.find(o => o.label === 'Text Field')).toBeFalsy()
    })
  })

  describe('Custom Fields', () => {
    it('should update custom fields with position and refresh on success', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.customFields = [
        { _id: '1', label: 'Field A' },
        { _id: '2', label: 'Field B' }
      ]

      // Capture the args before getCustomFields() resets customFields after resolution
      let capturedArgs = null
      DataService.updateCustomFields.mockImplementation((arg) => {
        capturedArgs = JSON.parse(JSON.stringify(arg))
        return Promise.resolve({ data: { datas: {} } })
      })

      wrapper.vm.updateCustomFields()

      // Positions should be assigned synchronously before the service call
      expect(capturedArgs[0].position).toBe(0)
      expect(capturedArgs[1].position).toBe(1)
      expect(capturedArgs).toEqual([
        { _id: '1', label: 'Field A', position: 0 },
        { _id: '2', label: 'Field B', position: 1 }
      ])
    })

    it('should add custom field option and reset newCustomOption', () => {
      const wrapper = createWrapper()
      wrapper.vm.cfLocale = 'en-US'
      wrapper.vm.newCustomOption = 'Option A'

      const options = []
      wrapper.vm.addCustomFieldOption(options)

      expect(options).toEqual([{ locale: 'en-US', value: 'Option A' }])
      expect(wrapper.vm.newCustomOption).toBe('')
    })

    it('should remove custom field option by locale and value', () => {
      const wrapper = createWrapper()
      const options = [
        { locale: 'en-US', value: 'Option A' },
        { locale: 'en-US', value: 'Option B' },
        { locale: 'fr-FR', value: 'Option A' }
      ]

      wrapper.vm.removeCustomFieldOption(options, { locale: 'en-US', value: 'Option A' })

      expect(options).toEqual([
        { locale: 'en-US', value: 'Option B' },
        { locale: 'fr-FR', value: 'Option A' }
      ])
    })

    it('should filter options by locale in getOptionsGroup', () => {
      const wrapper = createWrapper()
      wrapper.vm.cfLocale = 'en-US'

      const options = [
        { locale: 'en-US', value: 'Yes' },
        { locale: 'fr-FR', value: 'Oui' },
        { locale: 'en-US', value: 'No' }
      ]

      const result = wrapper.vm.getOptionsGroup(options)

      expect(result).toEqual([
        { label: 'Yes', value: 'Yes' },
        { label: 'No', value: 'No' }
      ])
    })

    it('should filter lang options by locale', () => {
      const wrapper = createWrapper()
      wrapper.vm.cfLocale = 'fr-FR'

      const options = [
        { locale: 'en-US', value: 'Yes' },
        { locale: 'fr-FR', value: 'Oui' }
      ]

      const result = wrapper.vm.getFieldLangOptions(options)

      expect(result).toEqual([{ locale: 'fr-FR', value: 'Oui' }])
    })

    it('should compute newCustomFieldLangOptions based on cfLocale', async () => {
      const wrapper = createWrapper()
      wrapper.vm.cfLocale = 'en-US'
      wrapper.vm.newCustomField.options = [
        { locale: 'en-US', value: 'Opt1' },
        { locale: 'fr-FR', value: 'Opt2' },
        { locale: 'en-US', value: 'Opt3' }
      ]

      expect(wrapper.vm.newCustomFieldLangOptions).toEqual([
        { locale: 'en-US', value: 'Opt1' },
        { locale: 'en-US', value: 'Opt3' }
      ])
    })

    it('should determine canDisplayCustomField correctly', () => {
      const wrapper = createWrapper()
      wrapper.vm.newCustomField.display = 'general'
      wrapper.vm.newCustomField.displaySub = ''

      expect(wrapper.vm.canDisplayCustomField({ display: 'general', displaySub: '' })).toBe(true)
      expect(wrapper.vm.canDisplayCustomField({ display: 'finding', displaySub: '' })).toBe(false)
    })

    it('should handle finding/vulnerability display equivalence in canDisplayCustomField', () => {
      const wrapper = createWrapper()
      wrapper.vm.newCustomField.display = 'finding'
      wrapper.vm.newCustomField.displaySub = ''

      expect(wrapper.vm.canDisplayCustomField({ display: 'finding', displaySub: '' })).toBe(true)
      expect(wrapper.vm.canDisplayCustomField({ display: 'vulnerability', displaySub: '' })).toBe(true)
      expect(wrapper.vm.canDisplayCustomField({ display: 'general', displaySub: '' })).toBe(false)
    })

    it('should return true from canDisplayCustomFields if any field matches', () => {
      const wrapper = createWrapper()
      wrapper.vm.newCustomField.display = 'general'
      wrapper.vm.newCustomField.displaySub = ''
      wrapper.vm.customFields = [
        { display: 'general', displaySub: '' },
        { display: 'finding', displaySub: '' }
      ]

      expect(wrapper.vm.canDisplayCustomFields()).toBe(true)
    })

    it('should return false from canDisplayCustomFields if no field matches', () => {
      const wrapper = createWrapper()
      wrapper.vm.newCustomField.display = 'section'
      wrapper.vm.newCustomField.displaySub = ''
      wrapper.vm.customFields = [
        { display: 'general', displaySub: '' }
      ]

      expect(wrapper.vm.canDisplayCustomFields()).toBe(false)
    })

    it('should get field locale text index and push default value if not found', () => {
      const wrapper = createWrapper()
      wrapper.vm.cfLocale = 'en-US'
      wrapper.vm.customFields = [
        { _id: '1', fieldType: 'input', text: [{ locale: 'fr-FR', value: 'test' }] }
      ]

      const idx = wrapper.vm.getFieldLocaleText(0)

      // Should have pushed a new entry for en-US
      expect(wrapper.vm.customFields[0].text.length).toBe(2)
      expect(wrapper.vm.customFields[0].text[idx]).toEqual({ locale: 'en-US', value: '' })
    })

    it('should return existing locale text index if found', () => {
      const wrapper = createWrapper()
      wrapper.vm.cfLocale = 'en-US'
      wrapper.vm.customFields = [
        { _id: '1', fieldType: 'input', text: [{ locale: 'en-US', value: 'existing' }] }
      ]

      const idx = wrapper.vm.getFieldLocaleText(0)

      expect(idx).toBe(0)
      expect(wrapper.vm.customFields[0].text.length).toBe(1)
    })

    it('should push array default value for select-multiple and checkbox field types', () => {
      const wrapper = createWrapper()
      wrapper.vm.cfLocale = 'de-DE'
      wrapper.vm.customFields = [
        { _id: '1', fieldType: 'select-multiple', text: [] }
      ]

      const idx = wrapper.vm.getFieldLocaleText(0)

      expect(wrapper.vm.customFields[0].text[idx]).toEqual({ locale: 'de-DE', value: [] })
    })
  })

  describe('Sections', () => {
    it('should create section and refresh on success', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newSection = { field: 'scope', name: 'Scope', icon: '' }

      // Capture the args before the component mutates them after resolution
      let capturedArgs = null
      DataService.createSection.mockImplementation((arg) => {
        capturedArgs = JSON.parse(JSON.stringify(arg))
        return Promise.resolve({ data: { datas: {} } })
      })

      wrapper.vm.createSection()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(capturedArgs).toEqual({ field: 'scope', name: 'Scope', icon: '' })
    })

    it('should validate field is required when creating section', () => {
      const wrapper = createWrapper()

      wrapper.vm.newSection = { field: '', name: 'Test', icon: '' }
      wrapper.vm.createSection()

      expect(wrapper.vm.errors.sectionField).toBe('Field required')
      expect(DataService.createSection).not.toHaveBeenCalled()
    })

    it('should validate name is required when creating section', () => {
      const wrapper = createWrapper()

      wrapper.vm.newSection = { field: 'test', name: '', icon: '' }
      wrapper.vm.createSection()

      expect(wrapper.vm.errors.sectionName).toBe('Name required')
      expect(DataService.createSection).not.toHaveBeenCalled()
    })

    it('should reset section form after successful creation', async () => {
      DataService.createSection.mockResolvedValue({ data: { datas: {} } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newSection = { field: 'scope', name: 'Scope', icon: 'mdi-target' }
      wrapper.vm.createSection()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.newSection.field).toBe('')
      expect(wrapper.vm.newSection.name).toBe('')
      expect(wrapper.vm.newSection.icon).toBe('')
    })

    it('should update sections and toggle edit mode on success', async () => {
      DataService.updateSections.mockResolvedValue({ data: { datas: {} } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.editSections = [{ _id: '1', field: 'updated', name: 'Updated' }]
      wrapper.vm.editSection = true

      wrapper.vm.updateSections()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Utils.syncEditors).toHaveBeenCalled()
      expect(DataService.updateSections).toHaveBeenCalledWith([{ _id: '1', field: 'updated', name: 'Updated' }])
      expect(wrapper.vm.editSection).toBe(false)
    })

    it('should remove section from edit list by index', () => {
      const wrapper = createWrapper()
      wrapper.vm.editSections = [
        { name: 'Section A' },
        { name: 'Section B' },
        { name: 'Section C' }
      ]

      wrapper.vm.removeSection(1)

      expect(wrapper.vm.editSections).toEqual([
        { name: 'Section A' },
        { name: 'Section C' }
      ])
    })
  })

  describe('Error Handling', () => {
    it('should clean all errors via cleanErrors method', () => {
      const wrapper = createWrapper()
      wrapper.vm.errors.locale = 'error'
      wrapper.vm.errors.language = 'error'
      wrapper.vm.errors.auditType = 'error'
      wrapper.vm.errors.vulnType = 'error'
      wrapper.vm.errors.vulnCat = 'error'
      wrapper.vm.errors.fieldLabel = 'error'
      wrapper.vm.errors.fieldType = 'error'
      wrapper.vm.errors.sectionField = 'error'
      wrapper.vm.errors.sectionName = 'error'

      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.locale).toBe('')
      expect(wrapper.vm.errors.language).toBe('')
      expect(wrapper.vm.errors.auditType).toBe('')
      expect(wrapper.vm.errors.vulnType).toBe('')
      expect(wrapper.vm.errors.vulnCat).toBe('')
      expect(wrapper.vm.errors.fieldLabel).toBe('')
      expect(wrapper.vm.errors.fieldType).toBe('')
      expect(wrapper.vm.errors.sectionField).toBe('')
      expect(wrapper.vm.errors.sectionName).toBe('')
    })

    it('should handle getLanguages service error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getLanguages.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle getAuditTypes service error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getAuditTypes.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should show error notification on update languages failure', async () => {
      DataService.updateLanguages.mockRejectedValue({
        response: { data: { datas: 'Update failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.editLanguages = [{ locale: 'en-US', language: 'English' }]
      wrapper.vm.updateLanguages()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Update failed', color: 'negative' })
      )
    })

    it('should show error notification on create section failure', async () => {
      DataService.createSection.mockRejectedValue({
        response: { data: { datas: 'Section exists' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newSection = { field: 'test', name: 'Test', icon: '' }
      wrapper.vm.createSection()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Section exists', color: 'negative' })
      )
    })
  })

  describe('Data Properties', () => {
    it('should have correct default data structure', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.templates).toEqual([])
      expect(wrapper.vm.newLanguage).toEqual({ locale: '', language: '' })
      expect(wrapper.vm.editLanguage).toBe(false)
      expect(wrapper.vm.newAuditType).toEqual(
        expect.objectContaining({ name: '', templates: [], sections: [], hidden: [], stage: 'default' })
      )
      expect(wrapper.vm.editAuditType).toBe(false)
      expect(wrapper.vm.newVulnCat).toEqual(
        expect.objectContaining({ name: '', sortValue: 'cvssScore', sortOrder: 'desc', sortAuto: true })
      )
      expect(wrapper.vm.editCategory).toBe(false)
      expect(wrapper.vm.newSection).toEqual({ field: '', name: '', icon: '' })
      expect(wrapper.vm.editSection).toBe(false)
      expect(wrapper.vm.newCustomField).toEqual(
        expect.objectContaining({
          label: '',
          fieldType: '',
          display: 'general',
          displaySub: '',
          size: 12,
          offset: 0,
          required: false,
          inline: false,
          description: '',
          text: [],
          options: []
        })
      )
      expect(wrapper.vm.newCustomOption).toBe('')
    })

    it('should have correct cfDisplayOptions', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.cfDisplayOptions.length).toBe(4)
      expect(wrapper.vm.cfDisplayOptions.map(o => o.value)).toEqual([
        'general', 'finding', 'section', 'vulnerability'
      ])
    })

    it('should have correct cfComponentOptions', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.cfComponentOptions.length).toBe(8)
      expect(wrapper.vm.cfComponentOptions.map(o => o.value)).toEqual([
        'checkbox', 'date', 'text', 'input', 'radio', 'select', 'select-multiple', 'space'
      ])
    })

    it('should have correct sortOrderOptions', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.sortOrderOptions.length).toBe(2)
      expect(wrapper.vm.sortOrderOptions.map(o => o.value)).toEqual(['asc', 'desc'])
    })
  })
})
