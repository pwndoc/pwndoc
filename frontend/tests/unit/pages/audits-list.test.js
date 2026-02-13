import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import AuditsList from '@/pages/audits/list/index.vue'

// Mock services
vi.mock('@/services/audit', () => ({
  default: {
    getAudits: vi.fn(),
    createAudit: vi.fn(),
    deleteAudit: vi.fn(),
    generateAuditReport: vi.fn()
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
    Dialog: {
      create: vi.fn(() => ({
        onOk: vi.fn((cb) => {
          // Store callback for testing
          Dialog._onOkCb = cb
          return { onCancel: vi.fn() }
        })
      }))
    },
    Notify: {
      create: vi.fn(() => vi.fn())
    },
    QSpinnerGears: {}
  }
})

import AuditService from '@/services/audit'
import DataService from '@/services/data'
import CompanyService from '@/services/company'
import { Dialog, Notify } from 'quasar'

describe('Audits List Page', () => {
  let router
  let pinia
  let i18n

  const mockAudits = [
    {
      _id: 'audit1',
      name: 'Test Audit 1',
      auditType: 'Web',
      language: 'en',
      company: { name: 'Company A' },
      creator: { username: 'testuser' },
      collaborators: [{ username: 'collab1' }],
      createdAt: '2024-01-15T10:00:00Z',
      connected: [],
      approvals: [],
      state: 'EDIT'
    },
    {
      _id: 'audit2',
      name: 'Test Audit 2',
      auditType: 'Mobile',
      language: 'fr',
      company: { name: 'Company B' },
      creator: { username: 'otheruser' },
      collaborators: [],
      createdAt: '2024-02-20T12:00:00Z',
      connected: ['user1'],
      approvals: [],
      state: 'REVIEW'
    }
  ]

  const mockLanguages = [
    { locale: 'en', language: 'English' },
    { locale: 'fr', language: 'French' }
  ]

  const mockAuditTypes = [
    { name: 'Web', stage: 'default' },
    { name: 'Mobile', stage: 'default' },
    { name: 'Multi Test', stage: 'multi' }
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
        { path: '/audits', component: AuditsList },
        { path: '/audits/:id', component: { template: '<div>Audit Detail</div>' } },
        { path: '/data/custom', component: { template: '<div>Custom Data</div>' } },
        { path: '/settings', component: { template: '<div>Settings</div>' } }
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

    // Setup default mocks
    AuditService.getAudits.mockResolvedValue({ data: { datas: mockAudits } })
    DataService.getLanguages.mockResolvedValue({ data: { datas: mockLanguages } })
    DataService.getAuditTypes.mockResolvedValue({ data: { datas: mockAuditTypes } })
    CompanyService.getCompanies.mockResolvedValue({ data: { datas: mockCompanies } })

    vi.clearAllMocks()

    // Re-setup mocks after clearAllMocks
    AuditService.getAudits.mockResolvedValue({ data: { datas: mockAudits } })
    DataService.getLanguages.mockResolvedValue({ data: { datas: mockLanguages } })
    DataService.getAuditTypes.mockResolvedValue({ data: { datas: mockAuditTypes } })
    CompanyService.getCompanies.mockResolvedValue({ data: { datas: mockCompanies } })
  })

  const createWrapper = (options = {}) => {
    return mount(AuditsList, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-table': true,
          'q-input': true,
          'q-btn': true,
          'q-toggle': true,
          'q-select': true,
          'q-dialog': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-bar': true,
          'q-space': true,
          'q-radio': true,
          'q-separator': true,
          'q-td': true,
          'q-tr': true,
          'q-chip': true,
          'q-avatar': true,
          'q-tooltip': true,
          'q-icon': true,
          'q-pagination': true,
          'audit-state-icon': true,
          'breadcrumb': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $settings: {
            reviews: { enabled: true }
          },
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should mount the component', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should call all data-fetching services on mount', async () => {
      createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(AuditService.getAudits).toHaveBeenCalled()
      expect(DataService.getLanguages).toHaveBeenCalled()
      expect(DataService.getAuditTypes).toHaveBeenCalled()
      expect(CompanyService.getCompanies).toHaveBeenCalled()
    })

    it('should set loading to true initially', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.loading).toBe(true)
    })

    it('should populate audits after fetching', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.audits).toEqual(mockAudits)
    })

    it('should set loading to false after audits are fetched', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.loading).toBe(false)
    })

    it('should populate languages after fetching', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.languages).toEqual(mockLanguages)
    })

    it('should populate auditTypes after fetching', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.auditTypes).toEqual(mockAuditTypes)
    })

    it('should populate companies after fetching', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.companies).toEqual(mockCompanies)
    })

    it('should have correct default data values', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.myAudits).toBe(false)
      expect(wrapper.vm.displayConnected).toBe(false)
      expect(wrapper.vm.displayReadyForReview).toBe(false)
      expect(wrapper.vm.pagination.rowsPerPage).toBe(25)
      expect(wrapper.vm.pagination.sortBy).toBe('date')
      expect(wrapper.vm.pagination.descending).toBe(true)
    })
  })

  describe('getAudits', () => {
    it('should pass finding search term to the service', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.search.finding = 'XSS'
      await wrapper.vm.getAudits()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(AuditService.getAudits).toHaveBeenCalledWith({ findingTitle: 'XSS' })
    })

    it('should set loading to true while fetching', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      AuditService.getAudits.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { datas: [] } }), 100)))

      wrapper.vm.getAudits()
      expect(wrapper.vm.loading).toBe(true)
    })

    it('should handle getAudits error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      AuditService.getAudits.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getLanguages', () => {
    it('should auto-select language when only one is available', async () => {
      DataService.getLanguages.mockResolvedValue({ data: { datas: [{ locale: 'en', language: 'English' }] } })

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.currentAudit.language).toBe('en')
    })

    it('should handle getLanguages error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getLanguages.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getAuditTypes', () => {
    it('should handle getAuditTypes error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getAuditTypes.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getCompanies', () => {
    it('should handle getCompanies error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      CompanyService.getCompanies.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('createAudit', () => {
    it('should validate name is required', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.name = ''
      wrapper.vm.currentAudit.language = 'en'
      wrapper.vm.currentAudit.auditType = 'Web'

      wrapper.vm.createAudit()

      expect(wrapper.vm.errors.name).toBe('Name required')
      expect(AuditService.createAudit).not.toHaveBeenCalled()
    })

    it('should validate language is required', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.name = 'Test Audit'
      wrapper.vm.currentAudit.language = ''
      wrapper.vm.currentAudit.auditType = 'Web'

      wrapper.vm.createAudit()

      expect(wrapper.vm.errors.language).toBe('Language required')
      expect(AuditService.createAudit).not.toHaveBeenCalled()
    })

    it('should validate auditType is required', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.name = 'Test Audit'
      wrapper.vm.currentAudit.language = 'en'
      wrapper.vm.currentAudit.auditType = ''

      wrapper.vm.createAudit()

      expect(wrapper.vm.errors.auditType).toBe('Assessment required')
      expect(AuditService.createAudit).not.toHaveBeenCalled()
    })

    it('should validate all fields at once', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.name = ''
      wrapper.vm.currentAudit.language = ''
      wrapper.vm.currentAudit.auditType = ''

      wrapper.vm.createAudit()

      expect(wrapper.vm.errors.name).toBe('Name required')
      expect(wrapper.vm.errors.language).toBe('Language required')
      expect(wrapper.vm.errors.auditType).toBe('Assessment required')
    })

    it('should call AuditService.createAudit with valid data', async () => {
      AuditService.createAudit.mockResolvedValue({
        data: { datas: { audit: { _id: 'new-audit-id' } } }
      })

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.name = 'New Audit'
      wrapper.vm.currentAudit.language = 'en'
      wrapper.vm.currentAudit.auditType = 'Web'
      wrapper.vm.currentAudit.type = 'default'

      wrapper.vm.createAudit()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(AuditService.createAudit).toHaveBeenCalledWith({
        name: 'New Audit',
        language: 'en',
        auditType: 'Web',
        type: 'default'
      })
    })

    it('should handle createAudit error with notification', async () => {
      AuditService.createAudit.mockRejectedValue({
        response: { data: { datas: 'Audit creation failed' } }
      })

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.name = 'New Audit'
      wrapper.vm.currentAudit.language = 'en'
      wrapper.vm.currentAudit.auditType = 'Web'

      wrapper.vm.createAudit()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Audit creation failed',
          color: 'negative'
        })
      )
    })

    it('should clean errors before validation', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.errors.name = 'Previous error'
      wrapper.vm.errors.language = 'Previous error'
      wrapper.vm.errors.auditType = 'Previous error'

      wrapper.vm.currentAudit.name = 'Test'
      wrapper.vm.currentAudit.language = ''
      wrapper.vm.currentAudit.auditType = 'Web'

      wrapper.vm.createAudit()

      // name error should be cleared since name is provided
      expect(wrapper.vm.errors.name).toBe('')
      // language error should be set since language is empty
      expect(wrapper.vm.errors.language).toBe('Language required')
    })
  })

  describe('deleteAudit', () => {
    it('should call AuditService.deleteAudit and refresh list on success', async () => {
      AuditService.deleteAudit.mockResolvedValue()

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Clear mock call counts from mount
      AuditService.getAudits.mockClear()
      AuditService.getAudits.mockResolvedValue({ data: { datas: [] } })

      await wrapper.vm.deleteAudit('audit1')
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(AuditService.deleteAudit).toHaveBeenCalledWith('audit1')
      expect(AuditService.getAudits).toHaveBeenCalled()
      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Audit deleted successfully',
          color: 'positive'
        })
      )
    })

    it('should show error notification on delete failure', async () => {
      AuditService.deleteAudit.mockRejectedValue({
        response: { data: { datas: 'Delete failed' } }
      })

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      await wrapper.vm.deleteAudit('audit1')
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Delete failed',
          color: 'negative'
        })
      )
    })
  })

  describe('confirmDeleteAudit', () => {
    it('should open a confirmation dialog', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.confirmDeleteAudit({ _id: 'audit1', name: 'My Audit' })

      expect(Dialog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Confirm Suppression',
          message: expect.stringContaining('My Audit')
        })
      )
    })
  })

  describe('cleanErrors', () => {
    it('should clear all error messages', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.errors.name = 'Error'
      wrapper.vm.errors.language = 'Error'
      wrapper.vm.errors.auditType = 'Error'

      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.name).toBe('')
      expect(wrapper.vm.errors.language).toBe('')
      expect(wrapper.vm.errors.auditType).toBe('')
    })
  })

  describe('cleanCurrentAudit', () => {
    it('should reset currentAudit fields', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.name = 'Some Audit'
      wrapper.vm.currentAudit.auditType = 'Web'
      wrapper.vm.currentAudit.type = 'multi'

      wrapper.vm.cleanCurrentAudit()

      expect(wrapper.vm.currentAudit.name).toBe('')
      expect(wrapper.vm.currentAudit.auditType).toBe('')
      expect(wrapper.vm.currentAudit.type).toBe('default')
    })

    it('should auto-select language when only one is available', async () => {
      DataService.getLanguages.mockResolvedValue({ data: { datas: [{ locale: 'en', language: 'English' }] } })

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.language = 'fr'
      wrapper.vm.cleanCurrentAudit()

      expect(wrapper.vm.currentAudit.language).toBe('en')
    })

    it('should clear language when multiple languages exist', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.language = 'en'
      wrapper.vm.cleanCurrentAudit()

      expect(wrapper.vm.currentAudit.language).toBe('')
    })

    it('should also clean errors', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.errors.name = 'Error'
      wrapper.vm.cleanCurrentAudit()

      expect(wrapper.vm.errors.name).toBe('')
    })
  })

  describe('convertLocale', () => {
    it('should convert locale code to language name', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.convertLocale('en')).toBe('English')
      expect(wrapper.vm.convertLocale('fr')).toBe('French')
    })

    it('should return empty string for unknown locale', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.convertLocale('de')).toBe('')
    })
  })

  describe('convertParticipants', () => {
    it('should format creator and collaborators', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const row = {
        creator: { username: 'admin' },
        collaborators: [{ username: 'user1' }, { username: 'user2' }]
      }

      expect(wrapper.vm.convertParticipants(row)).toBe('admin, user1, user2')
    })

    it('should handle row with only creator', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const row = {
        creator: { username: 'admin' },
        collaborators: []
      }

      expect(wrapper.vm.convertParticipants(row)).toBe('admin')
    })

    it('should handle row with no creator', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const row = {
        creator: null,
        collaborators: [{ username: 'user1' }]
      }

      expect(wrapper.vm.convertParticipants(row)).toBe('user1')
    })

    it('should handle row with no collaborators', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const row = {
        creator: { username: 'admin' }
      }

      expect(wrapper.vm.convertParticipants(row)).toBe('admin')
    })
  })

  describe('customFilter', () => {
    it('should filter by name', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const terms = { name: 'Test Audit 1', auditType: '', language: '', company: '', users: '', date: '' }
      const result = wrapper.vm.customFilter(mockAudits, terms, [], null)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Audit 1')
    })

    it('should filter by auditType', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const terms = { name: '', auditType: 'Web', language: '', company: '', users: '', date: '' }
      const result = wrapper.vm.customFilter(mockAudits, terms, [], null)

      expect(result).toHaveLength(1)
      expect(result[0].auditType).toBe('Web')
    })

    it('should filter by language', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const terms = { name: '', auditType: '', language: 'fr', company: '', users: '', date: '' }
      const result = wrapper.vm.customFilter(mockAudits, terms, [], null)

      expect(result).toHaveLength(1)
      expect(result[0].language).toBe('fr')
    })

    it('should filter by company', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const terms = { name: '', auditType: '', language: '', company: 'Company A', users: '', date: '' }
      const result = wrapper.vm.customFilter(mockAudits, terms, [], null)

      expect(result).toHaveLength(1)
      expect(result[0].company.name).toBe('Company A')
    })

    it('should filter by participants', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const terms = { name: '', auditType: '', language: '', company: '', users: 'collab1', date: '' }
      const result = wrapper.vm.customFilter(mockAudits, terms, [], null)

      expect(result).toHaveLength(1)
      expect(result[0]._id).toBe('audit1')
    })

    it('should filter by date', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const terms = { name: '', auditType: '', language: '', company: '', users: '', date: '2024-01-15' }
      const result = wrapper.vm.customFilter(mockAudits, terms, [], null)

      expect(result).toHaveLength(1)
      expect(result[0]._id).toBe('audit1')
    })

    it('should filter by myAudits toggle', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.myAudits = true
      const terms = { name: '', auditType: '', language: '', company: '', users: '', date: '' }
      const result = wrapper.vm.customFilter(mockAudits, terms, [], null)

      // testuser is the creator of audit1
      expect(result).toHaveLength(1)
      expect(result[0]._id).toBe('audit1')
    })

    it('should filter by connected users toggle', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.displayConnected = true
      const terms = { name: '', auditType: '', language: '', company: '', users: '', date: '' }
      const result = wrapper.vm.customFilter(mockAudits, terms, [], null)

      // Only audit2 has connected users
      expect(result).toHaveLength(1)
      expect(result[0]._id).toBe('audit2')
    })

    it('should return all rows when no filters applied', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const terms = { name: '', auditType: '', language: '', company: '', users: '', date: '' }
      const result = wrapper.vm.customFilter(mockAudits, terms, [], null)

      expect(result).toHaveLength(2)
    })

    it('should handle null rows', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      const terms = { name: '', auditType: '', language: '', company: '', users: '', date: '' }
      const result = wrapper.vm.customFilter(null, terms, [], null)

      expect(result).toBeNull()
    })
  })

  describe('modalAuditTypes computed', () => {
    it('should filter audit types by current audit stage (default)', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.type = 'default'
      const result = wrapper.vm.modalAuditTypes

      expect(result).toHaveLength(2)
      expect(result.map(t => t.name)).toEqual(['Web', 'Mobile'])
    })

    it('should filter audit types by current audit stage (multi)', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.currentAudit.type = 'multi'
      const result = wrapper.vm.modalAuditTypes

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Multi Test')
    })
  })

  describe('shouldHideLanguageField computed', () => {
    it('should not hide when multiple languages exist', async () => {
      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.shouldHideLanguageField).toBe(false)
    })

    it('should not hide when no display language is set', async () => {
      DataService.getLanguages.mockResolvedValue({ data: { datas: [{ locale: 'en', language: 'English' }] } })
      localStorage.removeItem('system_language')

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.shouldHideLanguageField).toBe(false)
    })

    it('should hide when single language matches display language', async () => {
      DataService.getLanguages.mockResolvedValue({ data: { datas: [{ locale: 'en', language: 'English' }] } })
      localStorage.setItem('system_language', 'en')

      const wrapper = createWrapper()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.shouldHideLanguageField).toBe(true)

      localStorage.removeItem('system_language')
    })
  })

  describe('dblClick', () => {
    it('should navigate to audit detail page', async () => {
      const wrapper = createWrapper()
      await router.isReady()
      await new Promise(resolve => setTimeout(resolve, 10))

      const pushSpy = vi.spyOn(router, 'push')
      wrapper.vm.dblClick({}, { _id: 'audit123' })

      expect(pushSpy).toHaveBeenCalledWith('/audits/audit123')
    })
  })

  describe('Data Properties', () => {
    it('should have all expected data properties', () => {
      const wrapper = createWrapper()

      expect('audits' in wrapper.vm).toBe(true)
      expect('loading' in wrapper.vm).toBe(true)
      expect('auditTypes' in wrapper.vm).toBe(true)
      expect('companies' in wrapper.vm).toBe(true)
      expect('languages' in wrapper.vm).toBe(true)
      expect('search' in wrapper.vm).toBe(true)
      expect('myAudits' in wrapper.vm).toBe(true)
      expect('displayConnected' in wrapper.vm).toBe(true)
      expect('displayReadyForReview' in wrapper.vm).toBe(true)
      expect('errors' in wrapper.vm).toBe(true)
      expect('currentAudit' in wrapper.vm).toBe(true)
      expect('pagination' in wrapper.vm).toBe(true)
    })

    it('should have correct search filter defaults', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.search).toEqual(
        expect.objectContaining({
          auditType: '',
          name: '',
          language: '',
          company: '',
          users: '',
          date: ''
        })
      )
    })

    it('should have correct currentAudit defaults', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.currentAudit.name).toBe('')
      expect(wrapper.vm.currentAudit.auditType).toBe('')
      expect(wrapper.vm.currentAudit.type).toBe('default')
    })
  })
})
