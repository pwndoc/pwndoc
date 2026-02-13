import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import FindingsAdd from '@/pages/audits/edit/findings/add/index.vue'

// Mock services
vi.mock('@/services/vulnerability', () => ({
  default: {
    getVulnByLanguage: vi.fn()
  }
}))

vi.mock('@/services/audit', () => ({
  default: {
    createFinding: vi.fn()
  }
}))

vi.mock('@/services/data', () => ({
  default: {
    getLanguages: vi.fn(),
    getVulnerabilityCategories: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    htmlEncode: vi.fn((html) => html),
    filterCustomFields: vi.fn(() => []),
    AUDIT_VIEW_STATE: { EDIT: 'edit', REVIEW: 'review', APPROVED: 'approved' }
  }
}))

vi.mock('@/boot/i18n', () => ({
  $t: (key) => key
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

import VulnService from '@/services/vulnerability'
import AuditService from '@/services/audit'
import DataService from '@/services/data'
import Utils from '@/services/utils'
import { Notify } from 'quasar'

describe('Findings Add Page', () => {
  let router, pinia, i18n

  const mockLanguages = [
    { locale: 'en', language: 'English' },
    { locale: 'fr', language: 'French' }
  ]

  const mockVulnerabilities = [
    {
      _id: 'vuln1',
      category: 'Web',
      remediationComplexity: 2,
      priority: 3,
      cvssv3: 'CVSS:3.1/AV:N',
      cvssv4: '',
      detail: {
        title: 'SQL Injection',
        vulnType: 'Injection',
        description: '<p>SQL injection desc</p>',
        observation: '<p>observed</p>',
        remediation: '<p>fix it</p>',
        references: ['ref1'],
        customFields: []
      }
    },
    {
      _id: 'vuln2',
      category: 'Network',
      remediationComplexity: 1,
      priority: 1,
      cvssv3: '',
      cvssv4: '',
      detail: {
        title: 'Open Port',
        vulnType: 'Configuration',
        description: '<p>open port desc</p>',
        observation: '',
        remediation: '<p>close it</p>',
        references: [],
        customFields: []
      }
    },
    {
      _id: 'vuln3',
      category: '',
      remediationComplexity: 1,
      priority: 1,
      cvssv3: '',
      cvssv4: '',
      detail: {
        title: 'No Category Vuln',
        vulnType: '',
        description: '',
        observation: '',
        remediation: '',
        references: [],
        customFields: []
      }
    }
  ]

  const mockCategories = [
    { name: 'Web' },
    { name: 'Network' }
  ]

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/audits/:auditId/findings/add', component: FindingsAdd, name: 'addFindings' }
      ]
    })

    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: { 'en-US': {} }
    })

    vi.clearAllMocks()

    // Default mock responses
    DataService.getLanguages.mockResolvedValue({ data: { datas: mockLanguages } })
    VulnService.getVulnByLanguage.mockResolvedValue({ data: { datas: mockVulnerabilities } })
    DataService.getVulnerabilityCategories.mockResolvedValue({ data: { datas: mockCategories } })
  })

  const createWrapper = (options = {}) => {
    return mount(FindingsAdd, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          breadcrumb: true,
          'q-table': true,
          'q-select': true,
          'q-input': true,
          'q-btn': true,
          'q-btn-dropdown': true,
          'q-space': true,
          'q-tr': true,
          'q-td': true,
          'q-tooltip': true,
          'q-item': true,
          'q-item-section': true,
          'q-item-label': true,
          'q-list': true,
          'q-pagination': true,
          'q-page': true,
          'q-card': true,
          'q-card-section': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $route: {
            params: { auditId: 'audit123' }
          },
          $socket: {
            emit: vi.fn()
          },
          $_: {
            uniq: (arr) => [...new Set(arr)],
            map: (arr, fn) => arr.map(fn)
          },
          ...(options.mocks || {})
        },
        provide: {
          frontEndAuditState: 'edit',
          auditParent: {
            name: 'Test Audit',
            language: { locale: 'en', language: 'English' },
            auditType: 'default',
            state: 'In Progress',
            approvals: [],
            type: 'default',
            parentId: null,
            ...(options.auditParent || {})
          },
          customFields: [],
          ...(options.provide || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should mount successfully', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should set auditId from route params on mount', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.auditId).toBe('audit123')
    })

    it('should fetch languages on mount', () => {
      createWrapper()
      expect(DataService.getLanguages).toHaveBeenCalled()
    })

    it('should fetch vulnerabilities on mount', () => {
      createWrapper()
      expect(VulnService.getVulnByLanguage).toHaveBeenCalled()
    })

    it('should fetch vulnerability categories on mount', () => {
      createWrapper()
      expect(DataService.getVulnerabilityCategories).toHaveBeenCalled()
    })

    it('should emit socket menu event on mount', () => {
      const mockEmit = vi.fn()
      createWrapper({
        mocks: {
          $socket: { emit: mockEmit }
        }
      })
      expect(mockEmit).toHaveBeenCalledWith('menu', { menu: 'addFindings', room: 'audit123' })
    })

    it('should set dtLanguage from auditParent language', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.dtLanguage).toEqual({ locale: 'en', language: 'English' })
    })

    it('should have loading state initially true', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.loading).toBe(true)
    })
  })

  describe('Data Fetching', () => {
    it('should populate languages after getLanguages resolves', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.languages).toEqual(mockLanguages)
    })

    it('should populate vulnerabilities after getVulnerabilities resolves', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.vulnerabilities).toEqual(mockVulnerabilities)
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should populate vulnCategories after getVulnerabilityCategories resolves', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.vulnCategories).toEqual(mockCategories)
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

    it('should handle getVulnerabilities error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      VulnService.getVulnByLanguage.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle getVulnerabilityCategories error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getVulnerabilityCategories.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should set loading to true before fetching vulnerabilities', async () => {
      VulnService.getVulnByLanguage.mockImplementation(() => new Promise(() => {}))
      const wrapper = createWrapper()

      wrapper.vm.getVulnerabilities()
      expect(wrapper.vm.loading).toBe(true)
    })
  })

  describe('Computed Properties', () => {
    it('should compute vulnCategoriesOptions from vulnerabilities', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const options = wrapper.vm.vulnCategoriesOptions
      expect(options).toContain('Web')
      expect(options).toContain('Network')
      expect(options).toContain('noCategory') // for the vuln with empty category
    })

    it('should compute vulnTypeOptions from vulnerabilities', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const options = wrapper.vm.vulnTypeOptions
      expect(options).toContain('Injection')
      expect(options).toContain('Configuration')
      expect(options).toContain('undefined') // for the vuln with empty vulnType
    })
  })

  describe('customFilter', () => {
    it('should filter rows by title', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const result = wrapper.vm.customFilter(
        mockVulnerabilities,
        { title: 'SQL', vulnType: '', category: '' },
        [],
        null
      )

      expect(result).toHaveLength(1)
      expect(result[0]._id).toBe('vuln1')
    })

    it('should filter rows by category', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const result = wrapper.vm.customFilter(
        mockVulnerabilities,
        { title: '', vulnType: '', category: 'Network' },
        [],
        null
      )

      expect(result).toHaveLength(1)
      expect(result[0]._id).toBe('vuln2')
    })

    it('should filter rows by vulnType', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const result = wrapper.vm.customFilter(
        mockVulnerabilities,
        { title: '', vulnType: 'Injection', category: '' },
        [],
        null
      )

      expect(result).toHaveLength(1)
      expect(result[0]._id).toBe('vuln1')
    })

    it('should combine all filters', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const result = wrapper.vm.customFilter(
        mockVulnerabilities,
        { title: 'SQL', vulnType: 'Injection', category: 'Web' },
        [],
        null
      )

      expect(result).toHaveLength(1)
      expect(result[0]._id).toBe('vuln1')
    })

    it('should return all rows when no filters applied', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const result = wrapper.vm.customFilter(
        mockVulnerabilities,
        { title: '', vulnType: '', category: '' },
        [],
        null
      )

      expect(result).toHaveLength(3)
    })

    it('should update filteredRowsCount', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.customFilter(
        mockVulnerabilities,
        { title: 'SQL', vulnType: '', category: '' },
        [],
        null
      )

      expect(wrapper.vm.filteredRowsCount).toBe(1)
    })

    it('should be case insensitive', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const result = wrapper.vm.customFilter(
        mockVulnerabilities,
        { title: 'sql injection', vulnType: '', category: '' },
        [],
        null
      )

      expect(result).toHaveLength(1)
    })
  })

  describe('addFindingFromVuln', () => {
    it('should call AuditService.createFinding with correct data from vulnerability', async () => {
      AuditService.createFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.addFindingFromVuln(mockVulnerabilities[0])

      expect(AuditService.createFinding).toHaveBeenCalledWith('audit123', {
        title: 'SQL Injection',
        vulnType: 'Injection',
        description: '<p>SQL injection desc</p>',
        observation: '<p>observed</p>',
        remediation: '<p>fix it</p>',
        remediationComplexity: 2,
        priority: 3,
        references: ['ref1'],
        cvssv3: 'CVSS:3.1/AV:N',
        cvssv4: '',
        category: 'Web',
        customFields: []
      })
    })

    it('should show success notification on successful creation', async () => {
      AuditService.createFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.addFindingFromVuln(mockVulnerabilities[0])
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'msg.findingCreateOk',
        color: 'positive'
      }))
    })

    it('should clear findingTitle on success', async () => {
      AuditService.createFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.findingTitle = 'some title'
      wrapper.vm.addFindingFromVuln(mockVulnerabilities[0])
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.findingTitle).toBe('')
    })

    it('should show error notification on failure', async () => {
      AuditService.createFinding.mockRejectedValue({
        response: { data: { datas: 'Finding already exists' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.addFindingFromVuln(mockVulnerabilities[0])
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Finding already exists',
        color: 'negative'
      }))
    })

    it('should not call createFinding when vuln is null', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.addFindingFromVuln(null)

      expect(AuditService.createFinding).not.toHaveBeenCalled()
    })

    it('should call Utils.filterCustomFields with correct parameters', async () => {
      AuditService.createFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.addFindingFromVuln(mockVulnerabilities[0])

      expect(Utils.filterCustomFields).toHaveBeenCalledWith(
        'finding',
        'Web',
        [],
        [],
        { locale: 'en', language: 'English' }
      )
    })
  })

  describe('addFinding', () => {
    it('should create finding with category and title', async () => {
      AuditService.createFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.findingTitle = 'New Finding'
      wrapper.vm.addFinding({ name: 'Web' })

      expect(AuditService.createFinding).toHaveBeenCalledWith('audit123', expect.objectContaining({
        title: 'New Finding',
        category: 'Web',
        vulnType: '',
        description: '',
        observation: '',
        remediation: '',
        remediationComplexity: '',
        priority: '',
        references: [],
        cvssv3: '',
        cvssv4: ''
      }))
    })

    it('should create finding without category when only title is set', async () => {
      AuditService.createFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.findingTitle = 'New Finding No Category'
      wrapper.vm.addFinding()

      expect(AuditService.createFinding).toHaveBeenCalledWith('audit123', expect.objectContaining({
        title: 'New Finding No Category'
      }))
      // Should not have category property when no category passed
      const calledWith = AuditService.createFinding.mock.calls[0][1]
      expect(calledWith.category).toBeUndefined()
    })

    it('should not create finding when findingTitle is empty', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.findingTitle = ''
      wrapper.vm.addFinding({ name: 'Web' })

      expect(AuditService.createFinding).not.toHaveBeenCalled()
    })

    it('should not create finding when both category and findingTitle are empty', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.findingTitle = ''
      wrapper.vm.addFinding()

      expect(AuditService.createFinding).not.toHaveBeenCalled()
    })

    it('should show success notification on successful creation', async () => {
      AuditService.createFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.findingTitle = 'Test Finding'
      wrapper.vm.addFinding()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'msg.findingCreateOk',
        color: 'positive'
      }))
    })

    it('should clear findingTitle on successful creation', async () => {
      AuditService.createFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.findingTitle = 'Test Finding'
      wrapper.vm.addFinding()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.findingTitle).toBe('')
    })

    it('should show error notification on failure', async () => {
      AuditService.createFinding.mockRejectedValue({
        response: { data: { datas: 'Creation failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.findingTitle = 'Test Finding'
      wrapper.vm.addFinding()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Creation failed',
        color: 'negative'
      }))
    })
  })

  describe('getDtTitle', () => {
    it('should return title when language matches', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.dtLanguage = { locale: 'en' }
      const row = {
        details: [
          { locale: 'en', title: 'English Title' },
          { locale: 'fr', title: 'French Title' }
        ]
      }

      expect(wrapper.vm.getDtTitle(row)).toBe('English Title')
    })

    it('should return error message when language not found', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.dtLanguage = { locale: 'de' }
      const row = {
        details: [
          { locale: 'en', title: 'English Title' }
        ]
      }

      expect(wrapper.vm.getDtTitle(row)).toBe('err.notDefinedLanguage')
    })
  })

  describe('Initial Data', () => {
    it('should have correct default search filters', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.search).toEqual({ title: '', vulnType: '', category: '' })
    })

    it('should have correct default pagination', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.vulnPagination).toEqual({
        page: 1,
        rowsPerPage: 25,
        sortBy: 'title'
      })
    })

    it('should have correct datatable headers', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.dtVulnHeaders).toHaveLength(4)
      expect(wrapper.vm.dtVulnHeaders[0].name).toBe('title')
      expect(wrapper.vm.dtVulnHeaders[1].name).toBe('category')
      expect(wrapper.vm.dtVulnHeaders[2].name).toBe('vulnType')
      expect(wrapper.vm.dtVulnHeaders[3].name).toBe('action')
    })

    it('should have rows per page options', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.rowsPerPageOptions).toEqual([
        { label: '25', value: 25 },
        { label: '50', value: 50 },
        { label: '100', value: 100 },
        { label: 'All', value: 0 }
      ])
    })
  })
})
