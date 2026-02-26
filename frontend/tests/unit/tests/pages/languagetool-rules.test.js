import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import LanguageToolRulesPage from '@/pages/data/languagetool-rules/index.vue'

// Mock services
vi.mock('@/services/languagetool-rules', () => ({
  default: {
    getAll: vi.fn(),
    getLanguages: vi.fn(),
    create: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    customFilter: vi.fn((rows, terms) => rows)
  }
}))

vi.mock('@/boot/i18n', () => {
  const messages = {
    'noRulesFound': 'No rules found',
    'rulesAreLoadedFromGrammarXml': 'Rules are loaded from grammar.xml',
    'name': 'Name',
    'language': 'Language',
    'ruleXml': 'Rule XML',
    'search': 'Search',
    'view': 'View',
    'viewRule': 'View Rule',
    'createRule': 'Create Rule',
    'id': 'ID',
    'rule': 'rule',
    'rules': 'rules',
    'resultsPerPage': 'Results per page',
    'ruleXmlHint': 'Ensure the lang attribute matches the selected language',
    'btn.create': 'Create',
    'btn.cancel': 'Cancel',
    'btn.close': 'Close',
    'btn.confirm': 'Confirm',
    'tooltip.delete': 'Delete',
    'msg.fieldRequired': 'This field is required',
    'msg.invalidXml': 'Invalid XML',
    'msg.ruleCreated': 'Rule created successfully',
    'msg.ruleDeleted': 'Rule deleted successfully',
    'msg.errorLoading': 'Error loading data',
    'msg.errorCreating': 'Error creating rule',
    'msg.errorDeleting': 'Error deleting rule',
    'msg.unauthorized': 'Unauthorized',
    'msg.confirmSuppression': 'Confirm deletion',
    'msg.deleteNotice': 'will be permanently deleted'
  }
  return {
    $t: (key) => messages[key] || key
  }
})

// Mock quasar Notify and Dialog
vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Notify: {
      create: vi.fn()
    },
    Dialog: {
      create: vi.fn(() => ({
        onOk: vi.fn((cb) => {
          // Store callback for testing
          Dialog._onOkCallback = cb
          return { onCancel: vi.fn() }
        })
      }))
    }
  }
})

// Must import after mocks
import LanguageToolRulesService from '@/services/languagetool-rules'
import { Notify, Dialog } from 'quasar'

// Mock the user store
const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    isAllowed: vi.fn(() => true),
    roles: '*'
  }
}))

vi.mock('@/stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore)
}))

describe('LanguageTool Rules Page', () => {
  let router, pinia, i18n

  const setRefs = (wrapper, refs) => {
    Object.entries(refs).forEach(([name, refValue]) => {
      if (wrapper.vm.$refs[name]) {
        Object.assign(wrapper.vm.$refs[name], refValue)
      }
    })
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/data/languagetool-rules', component: LanguageToolRulesPage }
      ]
    })

    i18n = createI18n({
      legacy: false,
      globalInjection: true,
      locale: 'en-US',
      fallbackLocale: 'en-US',
      messages: {
        'en-US': {}
      }
    })

    vi.clearAllMocks()

    // Reset user store to default state
    mockUserStore.isAllowed.mockReturnValue(true)
    mockUserStore.roles = '*'

    // Default mock responses
    LanguageToolRulesService.getAll.mockResolvedValue({
      data: { datas: [] }
    })
    LanguageToolRulesService.getLanguages.mockResolvedValue({
      data: { datas: { languages: ['en', 'fr', 'de'] } }
    })
  })

  const createWrapper = (options = {}) => {
    // Allow controlling canEdit via mock
    if (options.canEdit === false) {
      mockUserStore.isAllowed.mockReturnValue(false)
      mockUserStore.roles = ''
    } else {
      mockUserStore.isAllowed.mockReturnValue(true)
      mockUserStore.roles = '*'
    }

    return mount(LanguageToolRulesPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-page': true,
          'q-banner': true,
          'q-icon': true,
          'q-table': true,
          'q-tr': true,
          'q-td': true,
          'q-input': true,
          'q-btn': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-bar': true,
          'q-space': true,
          'q-dialog': { template: '<div><slot /></div>', methods: { show: vi.fn(), hide: vi.fn() } },
          'q-select': true,
          'q-separator': true,
          'q-tooltip': true,
          'q-pagination': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $settings: {},
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should call getRules on mount', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(LanguageToolRulesService.getAll).toHaveBeenCalled()
    })

    it('should call getLanguages on mount when user can edit', async () => {
      const wrapper = createWrapper({ canEdit: true })
      await wrapper.vm.$nextTick()

      expect(LanguageToolRulesService.getLanguages).toHaveBeenCalled()
    })

    it('should NOT call getLanguages on mount when user cannot edit', async () => {
      const wrapper = createWrapper({ canEdit: false })
      await wrapper.vm.$nextTick()

      expect(LanguageToolRulesService.getLanguages).not.toHaveBeenCalled()
    })

    it('should set loading to true initially', () => {
      const wrapper = createWrapper()
      // loading is set to true in data(), then getRules sets it true again
      expect(wrapper.vm.loading).toBe(true)
    })
  })

  describe('getRules', () => {
    it('should populate rules on success', async () => {
      const mockRules = [
        { _id: '1', id: 'RULE_1', name: 'Test Rule 1', language: 'en', ruleXml: '<rule />' },
        { _id: '2', id: 'RULE_2', name: 'Test Rule 2', language: 'fr', ruleXml: '<rule />' }
      ]
      LanguageToolRulesService.getAll.mockResolvedValue({
        data: { datas: mockRules }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.rules).toEqual(mockRules)
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should set rules to empty array when datas is undefined', async () => {
      LanguageToolRulesService.getAll.mockResolvedValue({
        data: { datas: undefined }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.rules).toEqual([])
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should handle error and show notification', async () => {
      LanguageToolRulesService.getAll.mockRejectedValue({
        response: { data: { datas: 'Server error' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.loading).toBe(false)
      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Server error',
        color: 'negative'
      })
    })
  })

  describe('getLanguages', () => {
    it('should populate languages on success', async () => {
      LanguageToolRulesService.getLanguages.mockResolvedValue({
        data: { datas: { languages: ['en', 'fr'] } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.languages).toEqual([
        { label: 'EN', value: 'en' },
        { label: 'FR', value: 'fr' }
      ])
      expect(wrapper.vm.loadingLanguages).toBe(false)
    })

    it('should handle error when loading languages', async () => {
      LanguageToolRulesService.getLanguages.mockRejectedValue({
        response: { data: { error: 'Language service unavailable' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.loadingLanguages).toBe(false)
      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Language service unavailable',
        color: 'negative'
      })
    })
  })

  describe('viewRule', () => {
    it('should set selectedRule and show modal', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const rule = { _id: '1', id: 'RULE_1', name: 'Test Rule', language: 'en', ruleXml: '<rule />' }

      // Mock the ref with vi.fn() spies
      const showSpy = vi.fn()
      const hideSpy = vi.fn()
      setRefs(wrapper, { viewModal: { show: showSpy, hide: hideSpy } })

      wrapper.vm.viewRule(rule)

      expect(wrapper.vm.selectedRule).toEqual(rule)
      expect(showSpy).toHaveBeenCalled()
    })
  })

  describe('validateCreateForm', () => {
    it('should return false when language is not set', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: null, ruleXml: '<rules />' }

      const result = wrapper.vm.validateCreateForm()

      expect(result).toBe(false)
      expect(wrapper.vm.errors.language).toBe('This field is required')
    })

    it('should return false when ruleXml is empty', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: 'en', ruleXml: '' }

      const result = wrapper.vm.validateCreateForm()

      expect(result).toBe(false)
      expect(wrapper.vm.errors.ruleXml).toBe('This field is required')
    })

    it('should return false when ruleXml is whitespace only', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: 'en', ruleXml: '   ' }

      const result = wrapper.vm.validateCreateForm()

      expect(result).toBe(false)
      expect(wrapper.vm.errors.ruleXml).toBe('This field is required')
    })

    it('should return false for invalid XML', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: 'en', ruleXml: '<invalid><unclosed>' }

      const result = wrapper.vm.validateCreateForm()

      expect(result).toBe(false)
      expect(wrapper.vm.errors.ruleXml).toBe('Invalid XML')
    })

    it('should return true for valid form', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: 'en', ruleXml: '<rules lang="en"><rule id="TEST" name="Test"><pattern><token>test</token></pattern><message>msg</message></rule></rules>' }

      const result = wrapper.vm.validateCreateForm()

      expect(result).toBe(true)
      expect(wrapper.vm.errors).toEqual({})
    })

    it('should clear previous errors before validation', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.errors = { language: 'Old error', ruleXml: 'Old error' }
      wrapper.vm.newRule = { language: 'en', ruleXml: '<rules />' }

      wrapper.vm.validateCreateForm()

      expect(wrapper.vm.errors.language).toBeUndefined()
    })
  })

  describe('createRule', () => {
    it('should not call service when validation fails', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: null, ruleXml: '' }
      wrapper.vm.createRule()

      expect(LanguageToolRulesService.create).not.toHaveBeenCalled()
    })

    it('should call service with correct params on valid form', async () => {
      LanguageToolRulesService.create.mockResolvedValue({ data: { datas: {} } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      setRefs(wrapper, { createModal: { show: vi.fn(), hide: vi.fn() } })
      wrapper.vm.newRule = { language: 'en', ruleXml: '<rules />' }

      wrapper.vm.createRule()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(LanguageToolRulesService.create).toHaveBeenCalledWith('en', '<rules />')
    })

    it('should set creating to true during request', async () => {
      LanguageToolRulesService.create.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: 'en', ruleXml: '<rules />' }
      wrapper.vm.createRule()

      expect(wrapper.vm.creating).toBe(true)
    })

    it('should show success notification and refresh rules on success', async () => {
      LanguageToolRulesService.create.mockResolvedValue({ data: { datas: {} } })
      LanguageToolRulesService.getAll.mockResolvedValue({ data: { datas: [] } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const hideSpy = vi.fn()
      setRefs(wrapper, { createModal: { show: vi.fn(), hide: hideSpy } })
      wrapper.vm.newRule = { language: 'en', ruleXml: '<rules />' }

      wrapper.vm.createRule()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.creating).toBe(false)
      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Rule created successfully',
        color: 'positive'
      })
      // getRules called once on mount, once after create
      expect(LanguageToolRulesService.getAll).toHaveBeenCalledTimes(2)
    })

    it('should handle create error and show notification', async () => {
      LanguageToolRulesService.create.mockRejectedValue({
        response: { data: { datas: 'Invalid XML structure' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: 'en', ruleXml: '<rules />' }
      wrapper.vm.createRule()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.creating).toBe(false)
      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Invalid XML structure',
        color: 'negative'
      })
    })

    it('should set ruleXml error when error message contains XML', async () => {
      LanguageToolRulesService.create.mockRejectedValue({
        response: { data: { datas: 'Invalid XML format' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: 'en', ruleXml: '<rules />' }
      wrapper.vm.createRule()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.errors.ruleXml).toBe('Invalid XML format')
    })

    it('should set language error when error message contains Language', async () => {
      LanguageToolRulesService.create.mockRejectedValue({
        response: { data: { datas: 'Language not supported' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: 'en', ruleXml: '<rules />' }
      wrapper.vm.createRule()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.errors.language).toBe('Language not supported')
    })
  })

  describe('cleanCreateForm', () => {
    it('should reset newRule and errors', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.newRule = { language: 'en', ruleXml: '<rule />' }
      wrapper.vm.errors = { language: 'Error', ruleXml: 'Error' }

      wrapper.vm.cleanCreateForm()

      expect(wrapper.vm.newRule).toEqual({ language: null, ruleXml: '' })
      expect(wrapper.vm.errors).toEqual({})
    })
  })

  describe('openCreateDialog', () => {
    it('should show unauthorized notification when user cannot edit', async () => {
      const wrapper = createWrapper({ canEdit: false })
      await wrapper.vm.$nextTick()

      wrapper.vm.openCreateDialog()

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Unauthorized',
        color: 'negative'
      })
    })

    it('should clean form and show modal when user can edit', async () => {
      const wrapper = createWrapper({ canEdit: true })
      await wrapper.vm.$nextTick()

      const showSpy = vi.fn()
      setRefs(wrapper, { createModal: { show: showSpy, hide: vi.fn() } })
      wrapper.vm.newRule = { language: 'en', ruleXml: 'old' }
      wrapper.vm.errors = { language: 'old error' }

      wrapper.vm.openCreateDialog()

      expect(wrapper.vm.newRule).toEqual({ language: null, ruleXml: '' })
      expect(wrapper.vm.errors).toEqual({})
      expect(showSpy).toHaveBeenCalled()
    })

    it('should fetch languages if not already loaded', async () => {
      const wrapper = createWrapper({ canEdit: true })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Clear the mock call count from mount
      LanguageToolRulesService.getLanguages.mockClear()

      setRefs(wrapper, { createModal: { show: vi.fn(), hide: vi.fn() } })
      wrapper.vm.languages = []

      wrapper.vm.openCreateDialog()

      expect(LanguageToolRulesService.getLanguages).toHaveBeenCalled()
    })

    it('should NOT fetch languages if already loaded', async () => {
      const wrapper = createWrapper({ canEdit: true })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Clear the mock call count from mount
      LanguageToolRulesService.getLanguages.mockClear()

      setRefs(wrapper, { createModal: { show: vi.fn(), hide: vi.fn() } })
      wrapper.vm.languages = [{ label: 'EN', value: 'en' }]

      wrapper.vm.openCreateDialog()

      expect(LanguageToolRulesService.getLanguages).not.toHaveBeenCalled()
    })
  })

  describe('confirmDeleteRule', () => {
    it('should show unauthorized notification when user cannot edit', async () => {
      const wrapper = createWrapper({ canEdit: false })
      await wrapper.vm.$nextTick()

      const rule = { _id: '1', id: 'RULE_1', name: 'Test', language: 'en' }
      wrapper.vm.confirmDeleteRule(rule)

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Unauthorized',
        color: 'negative'
      })
      expect(Dialog.create).not.toHaveBeenCalled()
    })

    it('should show confirmation dialog when user can edit', async () => {
      const wrapper = createWrapper({ canEdit: true })
      await wrapper.vm.$nextTick()

      const rule = { _id: '1', id: 'RULE_1', name: 'Test Rule', language: 'en' }
      wrapper.vm.confirmDeleteRule(rule)

      expect(Dialog.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Confirm deletion'
      }))
    })
  })

  describe('deleteRule', () => {
    it('should show error notification when rule has no language', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteRule({ _id: '1', id: 'RULE_1', name: 'Test' })

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Error loading data',
        color: 'negative'
      })
      expect(LanguageToolRulesService.delete).not.toHaveBeenCalled()
    })

    it('should call service with correct id', async () => {
      LanguageToolRulesService.delete.mockResolvedValue({ data: { datas: {} } })
      LanguageToolRulesService.getAll.mockResolvedValue({ data: { datas: [] } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteRule({ _id: 'abc123', id: 'RULE_1', name: 'Test', language: 'en' })

      expect(LanguageToolRulesService.delete).toHaveBeenCalledWith('abc123')
    })

    it('should show success notification and refresh rules on success', async () => {
      LanguageToolRulesService.delete.mockResolvedValue({ data: { datas: {} } })
      LanguageToolRulesService.getAll.mockResolvedValue({ data: { datas: [] } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      // Clear mock call count from mount before testing delete behavior
      LanguageToolRulesService.getAll.mockClear()

      wrapper.vm.deleteRule({ _id: '1', id: 'RULE_1', name: 'Test', language: 'en' })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.deleting).toBe(false)
      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Rule deleted successfully',
        color: 'positive'
      })
      // getAll should be called as part of the delete refresh flow
      expect(LanguageToolRulesService.getAll).toHaveBeenCalled()
    })

    it('should handle delete error and show notification', async () => {
      LanguageToolRulesService.delete.mockRejectedValue({
        response: { data: { datas: 'Delete failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteRule({ _id: '1', id: 'RULE_1', name: 'Test', language: 'en' })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.deleting).toBe(false)
      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Delete failed',
        color: 'negative'
      })
    })
  })

  describe('Data Properties', () => {
    it('should have correct initial data structure', async () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.rules).toEqual([])
      expect(wrapper.vm.loading).toBe(true)
      expect(wrapper.vm.languages).toEqual([])
      expect(wrapper.vm.loadingLanguages).toBe(true)
      expect(wrapper.vm.creating).toBe(false)
      expect(wrapper.vm.deleting).toBe(false)
      expect(wrapper.vm.selectedRule).toBeNull()
      expect(wrapper.vm.newRule).toEqual({ language: null, ruleXml: '' })
      expect(wrapper.vm.errors).toEqual({})
    })

    it('should have correct pagination defaults', async () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.pagination).toEqual({
        page: 1,
        rowsPerPage: 25,
        sortBy: 'name'
      })
    })

    it('should have correct datatable headers', async () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.dtHeaders).toHaveLength(5)
      expect(wrapper.vm.dtHeaders[0].name).toBe('id')
      expect(wrapper.vm.dtHeaders[1].name).toBe('name')
      expect(wrapper.vm.dtHeaders[2].name).toBe('language')
      expect(wrapper.vm.dtHeaders[3].name).toBe('ruleXml')
      expect(wrapper.vm.dtHeaders[4].name).toBe('action')
    })

    it('should have search filter with id and name', async () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.search).toEqual({ name: '', id: '' })
    })
  })

  describe('Computed Properties', () => {
    it('should return true for canEdit when user has settings:update permission', async () => {
      const wrapper = createWrapper({ canEdit: true })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canEdit).toBe(true)
    })

    it('should return false for canEdit when user lacks permission', async () => {
      const wrapper = createWrapper({ canEdit: false })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canEdit).toBe(false)
    })
  })
})
