import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import AddAudits from '@/pages/audits/edit/add-audits/index.vue'

// Mock services used by the page
vi.mock('@/services/audit', () => ({
  default: {
    getAudits: vi.fn(),
    createAudit: vi.fn(),
    updateAuditParent: vi.fn()
  }
}))

vi.mock('@/services/data', () => ({
  default: {
    getLanguages: vi.fn(),
    getAuditTypes: vi.fn()
  }
}))

vi.mock('@/services/company', () => ({
  default: {
    getCompanies: vi.fn()
  }
}))

vi.mock('@/boot/i18n', () => ({
  $t: (key) => key
}))

vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => ({
    id: '1',
    username: 'testuser',
    role: 'admin',
    firstname: 'Test',
    lastname: 'User',
    roles: '*',
    isLoggedIn: true,
    isAllowed: vi.fn(() => true)
  }))
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Notify: {
      create: vi.fn()
    }
  }
})

import AuditService from '@/services/audit'
import DataService from '@/services/data'
import CompanyService from '@/services/company'
import { Notify } from 'quasar'

describe('Add Audits Page', () => {
  let router
  let pinia
  let i18n

  const mockAuditParent = {
    _id: 'parent-audit-123',
    name: 'Parent Audit',
    auditType: 'Web Application',
    state: 'IN_PROGRESS',
    approvals: [],
    language: 'en',
    type: 'multi',
    parentId: null
  }

  const mockAudits = [
    {
      _id: 'audit-1',
      name: 'Audit One',
      language: 'en',
      company: { name: 'Company A' },
      creator: { username: 'user1' },
      collaborators: [{ username: 'user2' }],
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      _id: 'audit-2',
      name: 'Audit Two',
      language: 'fr',
      company: { name: 'Company B' },
      creator: { username: 'user3' },
      collaborators: [],
      createdAt: '2024-02-20T14:00:00Z',
      parentId: 'some-parent'
    }
  ]

  const mockLanguages = [
    { locale: 'en', language: 'English' },
    { locale: 'fr', language: 'French' }
  ]

  const mockAuditTypes = [
    { name: 'Web Application' },
    { name: 'Internal Network' }
  ]

  const mockCompanies = [
    { name: 'Company A' },
    { name: 'Company B' }
  ]

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/audits/:auditId/add-audits', component: AddAudits },
        { path: '/audits/:auditId', component: { template: '<div>Audit</div>' } }
      ]
    })

    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      fallbackLocale: 'en-US',
      messages: { 'en-US': {} }
    })

    // Set up default mock implementations
    AuditService.getAudits.mockResolvedValue({
      data: { datas: mockAudits }
    })
    DataService.getLanguages.mockResolvedValue({
      data: { datas: mockLanguages }
    })
    DataService.getAuditTypes.mockResolvedValue({
      data: { datas: mockAuditTypes }
    })
    CompanyService.getCompanies.mockResolvedValue({
      data: { datas: mockCompanies }
    })

    vi.clearAllMocks()

    // Re-apply mocks after clearAllMocks
    AuditService.getAudits.mockResolvedValue({
      data: { datas: mockAudits }
    })
    DataService.getLanguages.mockResolvedValue({
      data: { datas: mockLanguages }
    })
    DataService.getAuditTypes.mockResolvedValue({
      data: { datas: mockAuditTypes }
    })
    CompanyService.getCompanies.mockResolvedValue({
      data: { datas: mockCompanies }
    })
  })

  const createWrapper = (options = {}) => {
    return mount(AddAudits, {
      global: {
        plugins: [pinia, router, i18n],
        provide: {
          frontEndAuditState: options.frontEndAuditState || {},
          auditParent: options.auditParent || mockAuditParent
        },
        stubs: {
          'breadcrumb': true,
          'audit-state-icon': true,
          'q-page': true,
          'q-table': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-bar': true,
          'q-input': true,
          'q-btn': true,
          'q-select': true,
          'q-dialog': { template: '<div><slot /></div>' },
          'q-toggle': true,
          'q-space': true,
          'q-td': true,
          'q-tr': true,
          'q-tooltip': true,
          'q-separator': true,
          'q-pagination': true
        },
        mocks: {
          $t: (key) => key,
          $settings: {
            reviews: { enabled: false },
            ...(options.settings || {})
          },
          $socket: {
            emit: vi.fn()
          },
          $route: {
            params: { finding: undefined },
            ...(options.route || {})
          },
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should mount successfully', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should call data loading methods on mount', () => {
      createWrapper()

      expect(AuditService.getAudits).toHaveBeenCalledWith({ type: 'default' })
      expect(DataService.getLanguages).toHaveBeenCalled()
      expect(DataService.getAuditTypes).toHaveBeenCalled()
      expect(CompanyService.getCompanies).toHaveBeenCalled()
    })

    it('should emit socket menu event on mount', () => {
      const socketEmit = vi.fn()
      createWrapper({
        mocks: {
          $socket: { emit: socketEmit }
        }
      })

      expect(socketEmit).toHaveBeenCalledWith('menu', {
        menu: 'addAudits',
        room: 'parent-audit-123'
      })
    })

    it('should set currentAudit language from auditParent on mount', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.currentAudit.language).toBe('en')
    })

    it('should start in loading state', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.loading).toBe(true)
    })

    it('should add reviews to visible columns if reviews are enabled', () => {
      const wrapper = createWrapper({
        settings: { reviews: { enabled: true } }
      })

      expect(wrapper.vm.visibleColumns).toContain('reviews')
    })

    it('should not include reviews in visible columns if reviews are disabled', () => {
      const wrapper = createWrapper({
        settings: { reviews: { enabled: false } }
      })

      expect(wrapper.vm.visibleColumns).not.toContain('reviews')
    })
  })

  describe('Data Loading', () => {
    it('should load and filter audits (exclude those with parentId)', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // mockAudits[1] has parentId so it should be filtered out
      expect(wrapper.vm.audits).toHaveLength(1)
      expect(wrapper.vm.audits[0]._id).toBe('audit-1')
    })

    it('should set loading to false after audits load', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.loading).toBe(false)
    })

    it('should load languages', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.languages).toEqual(mockLanguages)
    })

    it('should load audit types', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.auditTypes).toEqual(mockAuditTypes)
    })

    it('should load companies', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.companies).toEqual(mockCompanies)
    })

    it('should handle getAudits error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      AuditService.getAudits.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle getLanguages error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getLanguages.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should auto-select language when only one language is available and currentAudit.language is not set', async () => {
      DataService.getLanguages.mockResolvedValue({
        data: { datas: [{ locale: 'en', language: 'English' }] }
      })

      const wrapper = createWrapper({
        auditParent: { ...mockAuditParent, language: '' }
      })
      // The mount already sets currentAudit.language from auditParent (empty string)
      // Then getLanguages resolves and the watcher or method auto-selects
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.currentAudit.language).toBe('en')
    })
  })

  describe('Create Audit', () => {
    it('should validate name is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentAudit.name = ''
      wrapper.vm.currentAudit.language = 'en'
      wrapper.vm.currentAudit.auditType = 'Web Application'

      wrapper.vm.createAudit()

      expect(wrapper.vm.errors.name).toBe('Name required')
    })

    it('should validate language is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentAudit.name = 'Test Audit'
      wrapper.vm.currentAudit.language = ''
      wrapper.vm.currentAudit.auditType = 'Web Application'

      wrapper.vm.createAudit()

      expect(wrapper.vm.errors.language).toBe('Language required')
    })

    it('should validate auditType is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentAudit.name = 'Test Audit'
      wrapper.vm.currentAudit.language = 'en'
      wrapper.vm.currentAudit.auditType = ''

      wrapper.vm.createAudit()

      expect(wrapper.vm.errors.auditType).toBe('Assessment required')
    })

    it('should not call AuditService.createAudit when validation fails', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentAudit.name = ''
      wrapper.vm.currentAudit.language = ''
      wrapper.vm.currentAudit.auditType = ''

      wrapper.vm.createAudit()

      expect(AuditService.createAudit).not.toHaveBeenCalled()
    })

    it('should call AuditService.createAudit with correct data when valid', async () => {
      AuditService.createAudit.mockResolvedValue({
        data: { datas: { audit: { _id: 'new-audit-123' } } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentAudit.name = 'New Child Audit'
      wrapper.vm.currentAudit.language = 'en'
      wrapper.vm.currentAudit.auditType = 'Web Application'
      wrapper.vm.currentAudit.type = 'default'

      wrapper.vm.createAudit()

      await wrapper.vm.$nextTick()

      expect(AuditService.createAudit).toHaveBeenCalledWith({
        name: 'New Child Audit',
        language: 'en',
        auditType: 'Web Application',
        type: 'default',
        parentId: 'parent-audit-123'
      })
    })

    it('should set parentId from auditParent before creating', async () => {
      AuditService.createAudit.mockResolvedValue({
        data: { datas: { audit: { _id: 'new-audit-123' } } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentAudit.name = 'Test'
      wrapper.vm.currentAudit.language = 'en'
      wrapper.vm.currentAudit.auditType = 'Web Application'

      wrapper.vm.createAudit()

      await wrapper.vm.$nextTick()

      const callArg = AuditService.createAudit.mock.calls[0][0]
      expect(callArg.parentId).toBe('parent-audit-123')
    })

    it('should handle create audit error with notification', async () => {
      AuditService.createAudit.mockRejectedValue({
        response: { data: { datas: 'Audit creation failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentAudit.name = 'Test'
      wrapper.vm.currentAudit.language = 'en'
      wrapper.vm.currentAudit.auditType = 'Web Application'

      wrapper.vm.createAudit()

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Audit creation failed',
        color: 'negative'
      }))
    })

    it('should clear errors before validation', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.errors.name = 'Previous error'
      wrapper.vm.errors.language = 'Previous error'
      wrapper.vm.errors.auditType = 'Previous error'

      wrapper.vm.currentAudit.name = ''
      wrapper.vm.createAudit()

      // cleanErrors runs first, then new errors are set
      // name should be re-set since it's empty
      expect(wrapper.vm.errors.name).toBe('Name required')
    })
  })

  describe('Update Audit Parent', () => {
    it('should call AuditService.updateAuditParent with correct params', async () => {
      AuditService.updateAuditParent.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const audit = { _id: 'audit-1' }
      wrapper.vm.updateAuditParent(audit)

      expect(AuditService.updateAuditParent).toHaveBeenCalledWith('audit-1', 'parent-audit-123')
    })

    it('should remove audit from list on successful update', async () => {
      AuditService.updateAuditParent.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // At this point audits should be loaded (only audit-1, since audit-2 has parentId)
      expect(wrapper.vm.audits).toHaveLength(1)

      wrapper.vm.updateAuditParent({ _id: 'audit-1' })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.audits).toHaveLength(0)
    })

    it('should show success notification on update', async () => {
      AuditService.updateAuditParent.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.updateAuditParent({ _id: 'audit-1' })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        color: 'positive'
      }))
    })

    it('should show error notification on update failure', async () => {
      AuditService.updateAuditParent.mockRejectedValue({
        response: { data: { datas: 'Update failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.updateAuditParent({ _id: 'audit-1' })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Update failed',
        color: 'negative'
      }))
    })

    it('should not call service if audit is null', () => {
      const wrapper = createWrapper()
      wrapper.vm.updateAuditParent(null)

      expect(AuditService.updateAuditParent).not.toHaveBeenCalled()
    })

    it('should not call service if audit has no _id', () => {
      const wrapper = createWrapper()
      wrapper.vm.updateAuditParent({})

      expect(AuditService.updateAuditParent).not.toHaveBeenCalled()
    })
  })

  describe('Clean Methods', () => {
    it('should clean errors', () => {
      const wrapper = createWrapper()

      wrapper.vm.errors.name = 'Error'
      wrapper.vm.errors.language = 'Error'
      wrapper.vm.errors.auditType = 'Error'

      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.name).toBe('')
      expect(wrapper.vm.errors.language).toBe('')
      expect(wrapper.vm.errors.auditType).toBe('')
    })

    it('should clean current audit and reset to defaults', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentAudit.name = 'Test'
      wrapper.vm.currentAudit.auditType = 'Web Application'
      wrapper.vm.currentAudit.language = 'fr'
      wrapper.vm.currentAudit.type = 'retest'

      wrapper.vm.cleanCurrentAudit()

      expect(wrapper.vm.currentAudit.name).toBe('')
      expect(wrapper.vm.currentAudit.auditType).toBe('')
      expect(wrapper.vm.currentAudit.type).toBe('default')
    })

    it('should auto-select language on clean if only one language available', async () => {
      DataService.getLanguages.mockResolvedValue({
        data: { datas: [{ locale: 'en', language: 'English' }] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.cleanCurrentAudit()

      expect(wrapper.vm.currentAudit.language).toBe('en')
    })

    it('should default to parent language on clean if multiple languages available', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentAudit.language = 'fr'
      wrapper.vm.cleanCurrentAudit()

      expect(wrapper.vm.currentAudit.language).toBe('en')
    })
  })

  describe('Helper Methods', () => {
    it('should convert locale to language name', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.convertLocale('en')).toBe('English')
      expect(wrapper.vm.convertLocale('fr')).toBe('French')
    })

    it('should return empty string for unknown locale', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.convertLocale('de')).toBe('')
    })

    it('should convert participants to comma-separated string', () => {
      const wrapper = createWrapper()

      const row = {
        creator: { username: 'user1' },
        collaborators: [{ username: 'user2' }, { username: 'user3' }]
      }

      expect(wrapper.vm.convertParticipants(row)).toBe('user1, user2, user3')
    })

    it('should handle row with no collaborators', () => {
      const wrapper = createWrapper()

      const row = {
        creator: { username: 'user1' },
        collaborators: []
      }

      expect(wrapper.vm.convertParticipants(row)).toBe('user1')
    })

    it('should handle row with no creator', () => {
      const wrapper = createWrapper()

      const row = {
        collaborators: [{ username: 'user2' }]
      }

      expect(wrapper.vm.convertParticipants(row)).toBe('user2')
    })

    it('should handle row with no collaborators array', () => {
      const wrapper = createWrapper()

      const row = {
        creator: { username: 'user1' }
      }

      expect(wrapper.vm.convertParticipants(row)).toBe('user1')
    })
  })

  describe('Double Click', () => {
    it('should call updateAuditParent when row is double clicked', async () => {
      AuditService.updateAuditParent.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const row = { _id: 'audit-1' }
      wrapper.vm.dblClick({}, row)

      expect(AuditService.updateAuditParent).toHaveBeenCalledWith('audit-1', 'parent-audit-123')
    })

    it('should not call updateAuditParent when row is falsy', () => {
      const wrapper = createWrapper()
      wrapper.vm.dblClick({}, null)

      expect(AuditService.updateAuditParent).not.toHaveBeenCalled()
    })
  })

  describe('Computed Properties', () => {
    it('should compute shouldHideLanguageField as false when multiple languages', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.shouldHideLanguageField).toBe(false)
    })

    it('should compute shouldHideLanguageField as true when one language matches display language', async () => {
      // Mock localStorage
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('en')

      DataService.getLanguages.mockResolvedValue({
        data: { datas: [{ locale: 'en', language: 'English' }] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.shouldHideLanguageField).toBe(true)

      getItemSpy.mockRestore()
    })

    it('should compute shouldHideLanguageField as false when one language does not match display language', async () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('fr')

      DataService.getLanguages.mockResolvedValue({
        data: { datas: [{ locale: 'en', language: 'English' }] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.shouldHideLanguageField).toBe(false)

      getItemSpy.mockRestore()
    })

    it('should compute displayLanguage from localStorage', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('en-US')

      const wrapper = createWrapper()

      expect(wrapper.vm.displayLanguage).toBe('en-US')

      getItemSpy.mockRestore()
    })

    it('should return null for displayLanguage when not set in localStorage', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)

      const wrapper = createWrapper()

      expect(wrapper.vm.displayLanguage).toBeNull()

      getItemSpy.mockRestore()
    })
  })

  describe('Custom Filter', () => {
    it('should filter rows by name', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const rows = [
        { name: 'Web App Test', language: 'en', company: { name: 'Co' }, creator: { username: 'u1' }, collaborators: [], createdAt: '2024-01-01T00:00:00Z' },
        { name: 'Mobile Test', language: 'en', company: { name: 'Co' }, creator: { username: 'u1' }, collaborators: [], createdAt: '2024-01-01T00:00:00Z' }
      ]

      const terms = { name: 'Web', language: '', company: '', users: '', date: '' }
      const result = wrapper.vm.customFilter(rows, terms, [], () => {})

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Web App Test')
    })

    it('should filter rows by company', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const rows = [
        { name: 'Test 1', language: 'en', company: { name: 'Alpha' }, creator: { username: 'u1' }, collaborators: [], createdAt: '2024-01-01T00:00:00Z' },
        { name: 'Test 2', language: 'en', company: { name: 'Beta' }, creator: { username: 'u1' }, collaborators: [], createdAt: '2024-01-01T00:00:00Z' }
      ]

      const terms = { name: '', language: '', company: 'alpha', users: '', date: '' }
      const result = wrapper.vm.customFilter(rows, terms, [], () => {})

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test 1')
    })

    it('should return all rows when no filters are set', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const rows = [
        { name: 'Test 1', language: 'en', company: { name: 'Co' }, creator: { username: 'u1' }, collaborators: [], createdAt: '2024-01-01T00:00:00Z' },
        { name: 'Test 2', language: 'fr', company: { name: 'Co' }, creator: { username: 'u2' }, collaborators: [], createdAt: '2024-02-01T00:00:00Z' }
      ]

      const terms = { name: '', language: '', company: '', users: '', date: '' }
      const result = wrapper.vm.customFilter(rows, terms, [], () => {})

      expect(result).toHaveLength(2)
    })
  })

  describe('Data Properties', () => {
    it('should have correct initial data values', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.audits).toEqual([])
      expect(wrapper.vm.loading).toBe(true)
      expect(wrapper.vm.auditTypes).toEqual([])
      expect(wrapper.vm.companies).toEqual([])
      expect(wrapper.vm.myAudits).toBe(false)
      expect(wrapper.vm.errors).toEqual({ name: '', language: '', auditType: '' })
      expect(wrapper.vm.currentAudit.type).toBe('default')
    })

    it('should have correct pagination defaults', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.pagination.page).toBe(1)
      expect(wrapper.vm.pagination.rowsPerPage).toBe(25)
      expect(wrapper.vm.pagination.sortBy).toBe('date')
      expect(wrapper.vm.pagination.descending).toBe(true)
    })

    it('should have correct default visible columns', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.visibleColumns).toContain('name')
      expect(wrapper.vm.visibleColumns).toContain('language')
      expect(wrapper.vm.visibleColumns).toContain('company')
      expect(wrapper.vm.visibleColumns).toContain('users')
      expect(wrapper.vm.visibleColumns).toContain('date')
      expect(wrapper.vm.visibleColumns).toContain('action')
    })
  })

  describe('Language Watcher', () => {
    it('should auto-select language when languages array changes to single item', async () => {
      DataService.getLanguages.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper({
        auditParent: { ...mockAuditParent, language: '' }
      })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Now set languages to a single item
      wrapper.vm.languages = [{ locale: 'de', language: 'German' }]
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.currentAudit.language).toBe('de')
    })

    it('should not change language when multiple languages are available', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // currentAudit.language was set from auditParent (en) on mount
      wrapper.vm.languages = [
        { locale: 'en', language: 'English' },
        { locale: 'fr', language: 'French' }
      ]
      await wrapper.vm.$nextTick()

      // Language should remain as set from parent
      expect(wrapper.vm.currentAudit.language).toBe('en')
    })
  })
})
