import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

// Must mock stores/user before component import - axios.js calls useUserStore() at module scope
const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    roles: '',
    isAllowed: vi.fn(() => true)
  }
}))
vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore)
}))
vi.mock('stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore)
}))
vi.mock('src/boot/axios.js', () => ({ default: {} }))

import GeneralPage from '@/pages/audits/edit/general/index.vue'

// Mock services
vi.mock('@/services/audit', () => ({
  default: {
    getAuditGeneral: vi.fn(),
    updateAuditGeneral: vi.fn()
  }
}))

vi.mock('@/services/client', () => ({
  default: {
    getClients: vi.fn()
  }
}))

vi.mock('@/services/company', () => ({
  default: {
    getCompanies: vi.fn()
  }
}))

vi.mock('@/services/collaborator', () => ({
  default: {
    getCollabs: vi.fn()
  }
}))

vi.mock('@/services/reviewer', () => ({
  default: {
    getReviewers: vi.fn()
  }
}))

vi.mock('@/services/template', () => ({
  default: {
    getTemplates: vi.fn()
  }
}))

vi.mock('@/services/data', () => ({
  default: {
    getCustomFields: vi.fn(),
    getLanguages: vi.fn(),
    getAuditTypes: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    AUDIT_VIEW_STATE: { EDIT: 'edit', REVIEW: 'review', APPROVED: 'approved' },
    syncEditors: vi.fn(),
    normalizeString: vi.fn((val) => (val || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  }
}))

vi.mock('@/boot/i18n', () => ({
  $t: (key) => key
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Notify: { create: vi.fn() },
    Dialog: { create: vi.fn(() => ({ onOk: vi.fn(() => ({ onCancel: vi.fn() })) })) }
  }
})

import AuditService from '@/services/audit'
import ClientService from '@/services/client'
import CompanyService from '@/services/company'
import CollabService from '@/services/collaborator'
import ReviewerService from '@/services/reviewer'
import TemplateService from '@/services/template'
import DataService from '@/services/data'
import Utils from '@/services/utils'
import { Notify, Dialog } from 'quasar'

describe('Audit Edit General Page', () => {
  let router, pinia, i18n

  const setRefs = (wrapper, refs) => {
    const mergedRefs = { ...(wrapper.vm.$?.refs || {}) }
    Object.entries(refs).forEach(([name, refValue]) => {
      const existingRef = mergedRefs[name]
      mergedRefs[name] = existingRef ? { ...existingRef, ...refValue } : refValue
    })
    if (wrapper.vm.$) wrapper.vm.$.refs = mergedRefs
  }

  const mockAudit = {
    creator: { _id: 'creator1', firstname: 'John', lastname: 'Doe' },
    name: 'Test Audit',
    auditType: 'default',
    client: { email: 'client@test.com', company: { name: 'TestCo' } },
    company: { _id: 'comp1', name: 'TestCo' },
    collaborators: [],
    reviewers: [],
    date: '2025-01-15',
    date_start: '2025-01-01',
    date_end: '2025-01-31',
    scope: ['scope1'],
    language: 'en',
    template: 'tmpl1',
    customFields: [],
    approvals: []
  }

  const mockClients = [
    { email: 'client1@test.com', company: { name: 'TestCo' } },
    { email: 'client2@test.com', company: { name: 'OtherCo' } },
    { email: 'client3@test.com', company: null }
  ]

  const mockCompanies = [
    { _id: 'comp1', name: 'TestCo' },
    { _id: 'comp2', name: 'OtherCo' }
  ]

  const mockCollaborators = [
    { _id: 'collab1', username: 'user1', firstname: 'Alice', lastname: 'Smith' },
    { _id: 'creator1', username: 'creator', firstname: 'John', lastname: 'Doe' }
  ]

  const mockReviewers = [
    { _id: 'rev1', username: 'reviewer1', firstname: 'Bob', lastname: 'Jones' },
    { _id: 'creator1', username: 'creator', firstname: 'John', lastname: 'Doe' }
  ]

  const mockTemplates = [
    { _id: 'tmpl1', name: 'Template 1' },
    { _id: 'tmpl2', name: 'Template 2' }
  ]

  const mockLanguages = [
    { locale: 'en', language: 'English' },
    { locale: 'fr', language: 'French' }
  ]

  const mockAuditTypes = [
    { name: 'default' },
    { name: 'multi' },
    { name: 'retest' }
  ]

  const mockCustomFields = [
    { _id: 'cf1', fieldType: 'text', label: 'Custom Field 1' }
  ]

  function setupDefaultMocks() {
    DataService.getCustomFields.mockResolvedValue({ data: { datas: mockCustomFields } })
    AuditService.getAuditGeneral.mockResolvedValue({ data: { datas: { ...mockAudit } } })
    ClientService.getClients.mockResolvedValue({ data: { datas: [...mockClients] } })
    CompanyService.getCompanies.mockResolvedValue({ data: { datas: [...mockCompanies] } })
    CollabService.getCollabs.mockResolvedValue({ data: { datas: [...mockCollaborators] } })
    ReviewerService.getReviewers.mockResolvedValue({ data: { datas: [...mockReviewers] } })
    TemplateService.getTemplates.mockResolvedValue({ data: { datas: [...mockTemplates] } })
    DataService.getLanguages.mockResolvedValue({ data: { datas: [...mockLanguages] } })
    DataService.getAuditTypes.mockResolvedValue({ data: { datas: [...mockAuditTypes] } })
  }

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/audits/:auditId/general', component: GeneralPage, name: 'audit-general' }
      ]
    })

    // Navigate to a route with auditId param
    router.push('/audits/audit123/general')
    await router.isReady()

    i18n = createI18n({
      legacy: false,
      globalInjection: true,
      locale: 'en-US',
      fallbackLocale: 'en-US',
      messages: { 'en-US': {} }
    })

    vi.clearAllMocks()
    setupDefaultMocks()
  })

  const createWrapper = (options = {}) => {
    return mount(GeneralPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          breadcrumb: true,
          'textarea-array': true,
          'custom-fields': true,
          'q-card': true,
          'q-card-section': true,
          'q-input': true,
          'q-select': true,
          'q-btn': true,
          'q-chip': true,
          'q-icon': true,
          'q-expansion-item': true,
          'q-popup-proxy': true,
          'q-date': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $route: { params: { auditId: 'audit123' } },
          $socket: { emit: vi.fn() },
          $_: { cloneDeep: vi.fn((obj) => JSON.parse(JSON.stringify(obj))), clone: vi.fn((obj) => JSON.parse(JSON.stringify(obj))), isEqual: vi.fn((a, b) => JSON.stringify(a) === JSON.stringify(b)) },
          $settings: {
            report: {
              enabled: false,
              public: {
                highlightWarning: false,
                highlightWarningColor: '#ff0',
                requiredFields: {
                  company: false,
                  client: false,
                  dateStart: false,
                  dateEnd: false,
                  dateReport: false,
                  scope: false
                }
              }
            },
            reviews: { enabled: false }
          },
          ...(options.mocks || {})
        },
        provide: {
          frontEndAuditState: options.frontEndAuditState || 'edit',
          auditParent: options.auditParent || { name: 'Test Audit', auditType: 'default', state: 'EDIT', approvals: [], parentId: null, type: 'default' },
          ...(options.provide || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should set auditId from route params on mount', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.auditId).toBe('audit123')
    })

    it('should emit socket menu event on mount', async () => {
      const socketEmit = vi.fn()
      const wrapper = createWrapper({
        mocks: { $socket: { emit: socketEmit } }
      })
      await wrapper.vm.$nextTick()

      expect(socketEmit).toHaveBeenCalledWith('menu', { menu: 'general', room: 'audit123' })
    })

    it('should register keydown listener on mount', async () => {
      const addEventSpy = vi.spyOn(document, 'addEventListener')
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(addEventSpy).toHaveBeenCalledWith('keydown', wrapper.vm._listener, false)
      addEventSpy.mockRestore()
    })

    it('should remove keydown listener on unmount', async () => {
      const removeEventSpy = vi.spyOn(document, 'removeEventListener')
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const listener = wrapper.vm._listener
      wrapper.unmount()

      expect(removeEventSpy).toHaveBeenCalledWith('keydown', listener, false)
      removeEventSpy.mockRestore()
    })

    it('should call getAuditGeneral on mount', async () => {
      createWrapper()
      await wrapper_flushPromises()

      expect(DataService.getCustomFields).toHaveBeenCalled()
      expect(AuditService.getAuditGeneral).toHaveBeenCalledWith('audit123')
    })

    it('should call getTemplates, getLanguages, and getAuditTypes on mount', async () => {
      createWrapper()
      await wrapper_flushPromises()

      expect(TemplateService.getTemplates).toHaveBeenCalled()
      expect(DataService.getLanguages).toHaveBeenCalled()
      expect(DataService.getAuditTypes).toHaveBeenCalled()
    })
  })

  describe('getAuditGeneral', () => {
    it('should fetch custom fields then audit data', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(DataService.getCustomFields).toHaveBeenCalled()
      expect(AuditService.getAuditGeneral).toHaveBeenCalledWith('audit123')
    })

    it('should populate audit data from response', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(wrapper.vm.audit.name).toBe('Test Audit')
      expect(wrapper.vm.audit.auditType).toBe('default')
      expect(wrapper.vm.audit.language).toBe('en')
    })

    it('should store a deep clone of audit as auditOrig', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      // auditOrig should be a deep clone, verified via $_.cloneDeep being called
      expect(wrapper.vm.$_.cloneDeep).toHaveBeenCalled()
    })

    it('should fetch collaborators and reviewers after audit data', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(CollabService.getCollabs).toHaveBeenCalled()
      expect(ReviewerService.getReviewers).toHaveBeenCalled()
    })

    it('should fetch clients after audit data', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(ClientService.getClients).toHaveBeenCalled()
    })

    it('should handle getAuditGeneral error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getCustomFields.mockRejectedValue({ response: 'error' })

      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getCollaborators', () => {
    it('should filter out the creator from collaborators list', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      // Creator has _id 'creator1', so collaborators list should exclude them
      const filteredCollabs = wrapper.vm.collaborators
      expect(filteredCollabs).toHaveLength(1)
      expect(filteredCollabs[0]._id).toBe('collab1')
    })
  })

  describe('getReviewers', () => {
    it('should filter out the creator from reviewers list', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      const filteredReviewers = wrapper.vm.reviewers
      expect(filteredReviewers).toHaveLength(1)
      expect(filteredReviewers[0]._id).toBe('rev1')
    })
  })

  describe('getTemplates', () => {
    it('should populate templates list', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(wrapper.vm.templates).toEqual(mockTemplates)
    })

    it('should handle error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      TemplateService.getTemplates.mockRejectedValue(new Error('fail'))

      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getLanguages', () => {
    it('should populate languages list', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(wrapper.vm.languages).toEqual(mockLanguages)
    })
  })

  describe('getAuditTypes', () => {
    it('should populate auditTypes list', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(wrapper.vm.auditTypes).toEqual(mockAuditTypes)
    })
  })

  describe('getClients', () => {
    it('should populate clients list and then fetch companies', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(ClientService.getClients).toHaveBeenCalled()
      expect(CompanyService.getCompanies).toHaveBeenCalled()
    })
  })

  describe('getCompanies', () => {
    it('should populate companies list and call filterClients', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      expect(wrapper.vm.companies).toEqual(mockCompanies)
    })
  })

  describe('filterClients', () => {
    it('should filter clients by selected company', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      // Audit has company TestCo set from mock
      wrapper.vm.audit.company = { name: 'TestCo' }
      wrapper.vm.filterClients('init')

      // Only client1 has company TestCo
      expect(wrapper.vm.selectClients).toHaveLength(1)
      expect(wrapper.vm.selectClients[0].email).toBe('client1@test.com')
    })

    it('should show all clients when no company is selected', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      wrapper.vm.audit.company = null
      wrapper.vm.filterClients('init')

      expect(wrapper.vm.selectClients).toHaveLength(mockClients.length)
    })

    it('should reset client when step is not init', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      wrapper.vm.audit.client = { email: 'someone@test.com' }
      wrapper.vm.audit.company = { name: 'TestCo' }
      wrapper.vm.filterClients('update')

      expect(wrapper.vm.audit.client).toBeNull()
    })

    it('should not reset client when step is init', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      wrapper.vm.audit.client = { email: 'someone@test.com' }
      wrapper.vm.audit.company = { name: 'TestCo' }
      wrapper.vm.filterClients('init')

      expect(wrapper.vm.audit.client).toEqual({ email: 'someone@test.com' })
    })
  })

  describe('setCompanyFromClient', () => {
    it('should set company from client selection', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      wrapper.vm.companies = [...mockCompanies]
      wrapper.vm.setCompanyFromClient({ email: 'test@test.com', company: { name: 'TestCo' } })

      expect(wrapper.vm.audit.company).toEqual({ _id: 'comp1', name: 'TestCo' })
    })

    it('should set company to null when client has no company', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      wrapper.vm.setCompanyFromClient({ email: 'test@test.com' })

      expect(wrapper.vm.audit.company).toBeNull()
    })

    it('should do nothing when value is falsy', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      const originalCompany = wrapper.vm.audit.company
      wrapper.vm.setCompanyFromClient(null)

      // Company should remain unchanged
      expect(wrapper.vm.audit.company).toEqual(originalCompany)
    })
  })

  describe('createSelectCompany', () => {
    it('should use existing company if found by normalized name', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      wrapper.vm.companies = [...mockCompanies]
      Utils.normalizeString.mockImplementation((val) => (val || '').toLowerCase())

      const done = vi.fn()
      wrapper.vm.createSelectCompany('testco', done)

      expect(done).toHaveBeenCalledWith(mockCompanies[0], 'add-unique')
    })

    it('should create new company object if not found', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      wrapper.vm.companies = [...mockCompanies]
      Utils.normalizeString.mockImplementation((val) => (val || '').toLowerCase())

      const done = vi.fn()
      wrapper.vm.createSelectCompany('NewCompany', done)

      expect(done).toHaveBeenCalledWith({ name: 'NewCompany' }, 'add-unique')
    })
  })

  describe('filterSelectCompany', () => {
    it('should show all companies when val is empty', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      wrapper.vm.companies = [...mockCompanies]
      const update = vi.fn((cb) => cb())
      wrapper.vm.filterSelectCompany('', update)

      expect(update).toHaveBeenCalled()
      expect(wrapper.vm.selectCompanies).toEqual(mockCompanies)
    })

    it('should filter companies by normalized search value', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      wrapper.vm.companies = [...mockCompanies]
      Utils.normalizeString.mockImplementation((val) => (val || '').toLowerCase())

      const update = vi.fn((cb) => cb())
      wrapper.vm.filterSelectCompany('test', update)

      expect(update).toHaveBeenCalled()
      expect(wrapper.vm.selectCompanies).toHaveLength(1)
      expect(wrapper.vm.selectCompanies[0].name).toBe('TestCo')
    })
  })

  describe('updateAuditGeneral', () => {
    it('should call syncEditors before saving', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      AuditService.updateAuditGeneral.mockResolvedValue({})

      wrapper.vm.updateAuditGeneral()
      await wrapper.vm.$nextTick()

      expect(Utils.syncEditors).toHaveBeenCalled()
    })

    it('should call AuditService.updateAuditGeneral on successful save', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      // Mock refs for requiredFieldsEmpty
      setRefs(wrapper, {
        customfields: null,
        nameField: { validate: vi.fn(), hasError: false },
        companyField: { validate: vi.fn(), hasError: false },
        clientField: { validate: vi.fn(), hasError: false },
        dateStartField: { validate: vi.fn(), hasError: false },
        dateEndField: { validate: vi.fn(), hasError: false },
        dateReportField: { validate: vi.fn(), hasError: false },
        scopeField: { validate: vi.fn(), hasError: false }
      })

      AuditService.updateAuditGeneral.mockResolvedValue({})

      wrapper.vm.updateAuditGeneral()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(AuditService.updateAuditGeneral).toHaveBeenCalledWith('audit123', wrapper.vm.audit)
    })

    it('should show success notification on save', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      setRefs(wrapper, {
        customfields: null,
        nameField: { validate: vi.fn(), hasError: false },
        companyField: { validate: vi.fn(), hasError: false },
        clientField: { validate: vi.fn(), hasError: false },
        dateStartField: { validate: vi.fn(), hasError: false },
        dateEndField: { validate: vi.fn(), hasError: false },
        dateReportField: { validate: vi.fn(), hasError: false },
        scopeField: { validate: vi.fn(), hasError: false }
      })

      AuditService.updateAuditGeneral.mockResolvedValue({})

      wrapper.vm.updateAuditGeneral()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await wrapper_flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.auditUpdateOk',
          color: 'positive'
        })
      )
    })

    it('should show error notification on save failure', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      setRefs(wrapper, {
        customfields: null,
        nameField: { validate: vi.fn(), hasError: false },
        companyField: { validate: vi.fn(), hasError: false },
        clientField: { validate: vi.fn(), hasError: false },
        dateStartField: { validate: vi.fn(), hasError: false },
        dateEndField: { validate: vi.fn(), hasError: false },
        dateReportField: { validate: vi.fn(), hasError: false },
        scopeField: { validate: vi.fn(), hasError: false }
      })

      AuditService.updateAuditGeneral.mockRejectedValue({
        response: { data: { datas: 'Update failed' } }
      })

      wrapper.vm.updateAuditGeneral()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await wrapper_flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Update failed',
          color: 'negative'
        })
      )
    })

    it('should not save when required fields are empty', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      setRefs(wrapper, {
        customfields: null,
        nameField: { validate: vi.fn(), hasError: true },
        companyField: { validate: vi.fn(), hasError: false },
        clientField: { validate: vi.fn(), hasError: false },
        dateStartField: { validate: vi.fn(), hasError: false },
        dateEndField: { validate: vi.fn(), hasError: false },
        dateReportField: { validate: vi.fn(), hasError: false },
        scopeField: { validate: vi.fn(), hasError: false }
      })

      wrapper.vm.updateAuditGeneral()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.fieldRequired',
          color: 'negative'
        })
      )
      expect(AuditService.updateAuditGeneral).not.toHaveBeenCalled()
    })

    it('should not save when custom fields are required and empty', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      setRefs(wrapper, {
        customfields: { requiredFieldsEmpty: vi.fn(() => true) },
        nameField: { validate: vi.fn(), hasError: false },
        companyField: { validate: vi.fn(), hasError: false },
        clientField: { validate: vi.fn(), hasError: false },
        dateStartField: { validate: vi.fn(), hasError: false },
        dateEndField: { validate: vi.fn(), hasError: false },
        dateReportField: { validate: vi.fn(), hasError: false },
        scopeField: { validate: vi.fn(), hasError: false }
      })

      wrapper.vm.updateAuditGeneral()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.fieldRequired',
          color: 'negative'
        })
      )
      expect(AuditService.updateAuditGeneral).not.toHaveBeenCalled()
    })
  })

  describe('_listener (Ctrl+S)', () => {
    it('should call updateAuditGeneral on Ctrl+S when in EDIT state', async () => {
      const wrapper = createWrapper({ frontEndAuditState: 'edit' })
      await wrapper_flushPromises()

      const updateSpy = vi.spyOn(wrapper.vm, 'updateAuditGeneral').mockImplementation(() => {})
      const event = new KeyboardEvent('keydown', { keyCode: 83, ctrlKey: true })
      const preventSpy = vi.spyOn(event, 'preventDefault')

      wrapper.vm._listener(event)

      expect(preventSpy).toHaveBeenCalled()
      expect(updateSpy).toHaveBeenCalled()
    })

    it('should not call updateAuditGeneral on Ctrl+S when not in EDIT state', async () => {
      const wrapper = createWrapper({ frontEndAuditState: 'review' })
      await wrapper_flushPromises()

      const updateSpy = vi.spyOn(wrapper.vm, 'updateAuditGeneral').mockImplementation(() => {})
      const event = new KeyboardEvent('keydown', { keyCode: 83, ctrlKey: true })

      wrapper.vm._listener(event)

      expect(updateSpy).not.toHaveBeenCalled()
    })
  })

  describe('displayHighlightWarning', () => {
    it('should return null when report is not enabled', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      const result = wrapper.vm.displayHighlightWarning()
      expect(result).toBeNull()
    })

    it('should return null when highlightWarning is not enabled', async () => {
      const wrapper = createWrapper({
        mocks: {
          $settings: {
            report: {
              enabled: true,
              public: {
                highlightWarning: false,
                highlightWarningColor: '#ff0',
                requiredFields: {}
              }
            },
            reviews: { enabled: false }
          }
        }
      })
      await wrapper_flushPromises()

      const result = wrapper.vm.displayHighlightWarning()
      expect(result).toBeNull()
    })

    it('should return null when no custom fields have highlights', async () => {
      const wrapper = createWrapper({
        mocks: {
          $settings: {
            report: {
              enabled: true,
              public: {
                highlightWarning: true,
                highlightWarningColor: '#ff0',
                requiredFields: {}
              }
            },
            reviews: { enabled: false }
          }
        }
      })
      await wrapper_flushPromises()

      wrapper.vm.audit.customFields = [
        { customField: { fieldType: 'text', label: 'My Field' }, text: 'normal text' }
      ]

      const result = wrapper.vm.displayHighlightWarning()
      expect(result).toBeNull()
    })

    it('should return highlighted text when found in custom field', async () => {
      const wrapper = createWrapper({
        mocks: {
          $settings: {
            report: {
              enabled: true,
              public: {
                highlightWarning: true,
                highlightWarningColor: '#ff0',
                requiredFields: {}
              }
            },
            reviews: { enabled: false }
          }
        }
      })
      await wrapper_flushPromises()

      wrapper.vm.audit.customFields = [
        {
          customField: { fieldType: 'text', label: 'My Field' },
          text: '<mark data-color="#ff0" style="background:#ff0">highlighted text</mark>'
        }
      ]

      const result = wrapper.vm.displayHighlightWarning()
      expect(result).not.toBeNull()
      expect(result).toContain('My Field')
    })
  })

  describe('requiredFieldsEmpty', () => {
    it('should validate all required field refs', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      const mockRefs = {
        nameField: { validate: vi.fn(), hasError: false },
        companyField: { validate: vi.fn(), hasError: false },
        clientField: { validate: vi.fn(), hasError: false },
        dateStartField: { validate: vi.fn(), hasError: false },
        dateEndField: { validate: vi.fn(), hasError: false },
        dateReportField: { validate: vi.fn(), hasError: false },
        scopeField: { validate: vi.fn(), hasError: false }
      }
      setRefs(wrapper, mockRefs)

      const result = wrapper.vm.requiredFieldsEmpty()

      expect(mockRefs.nameField.validate).toHaveBeenCalled()
      expect(mockRefs.companyField.validate).toHaveBeenCalled()
      expect(mockRefs.clientField.validate).toHaveBeenCalled()
      expect(mockRefs.dateStartField.validate).toHaveBeenCalled()
      expect(mockRefs.dateEndField.validate).toHaveBeenCalled()
      expect(mockRefs.dateReportField.validate).toHaveBeenCalled()
      expect(mockRefs.scopeField.validate).toHaveBeenCalled()
      expect(result).toBe(false)
    })

    it('should return true when any required field has error', async () => {
      const wrapper = createWrapper()
      await wrapper_flushPromises()

      setRefs(wrapper, {
        nameField: { validate: vi.fn(), hasError: true },
        companyField: { validate: vi.fn(), hasError: false },
        clientField: { validate: vi.fn(), hasError: false },
        dateStartField: { validate: vi.fn(), hasError: false },
        dateEndField: { validate: vi.fn(), hasError: false },
        dateReportField: { validate: vi.fn(), hasError: false },
        scopeField: { validate: vi.fn(), hasError: false }
      })

      const result = wrapper.vm.requiredFieldsEmpty()
      expect(result).toBe(true)
    })
  })

  describe('Data Properties', () => {
    it('should initialize with correct default audit structure', () => {
      // Temporarily prevent mount side effects
      DataService.getCustomFields.mockReturnValue(new Promise(() => {}))
      TemplateService.getTemplates.mockReturnValue(new Promise(() => {}))
      DataService.getLanguages.mockReturnValue(new Promise(() => {}))
      DataService.getAuditTypes.mockReturnValue(new Promise(() => {}))

      const wrapper = createWrapper()

      expect(wrapper.vm.audit).toBeDefined()
      expect(wrapper.vm.audit.name).toBe('')
      expect(wrapper.vm.audit.auditType).toBe('')
      expect(wrapper.vm.audit.collaborators).toEqual([])
      expect(wrapper.vm.audit.reviewers).toEqual([])
      expect(wrapper.vm.audit.scope).toEqual([])
      expect(wrapper.vm.audit.customFields).toEqual([])
    })

    it('should initialize with empty lists', () => {
      DataService.getCustomFields.mockReturnValue(new Promise(() => {}))
      TemplateService.getTemplates.mockReturnValue(new Promise(() => {}))
      DataService.getLanguages.mockReturnValue(new Promise(() => {}))
      DataService.getAuditTypes.mockReturnValue(new Promise(() => {}))

      const wrapper = createWrapper()

      expect(wrapper.vm.clients).toEqual([])
      expect(wrapper.vm.collaborators).toEqual([])
      expect(wrapper.vm.reviewers).toEqual([])
      expect(wrapper.vm.companies).toEqual([])
      expect(wrapper.vm.templates).toEqual([])
      expect(wrapper.vm.languages).toEqual([])
      expect(wrapper.vm.auditTypes).toEqual([])
      expect(wrapper.vm.customFields).toEqual([])
    })
  })
})

// Helper to flush all pending promises
function wrapper_flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 50))
}
