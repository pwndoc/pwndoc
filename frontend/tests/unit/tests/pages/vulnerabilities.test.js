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

// Mock services used by the page
vi.mock('@/services/vulnerability', () => ({
  default: {
    getVulnerabilities: vi.fn(),
    createVulnerabilities: vi.fn(),
    updateVulnerability: vi.fn(),
    deleteVulnerability: vi.fn(),
    getVulnUpdates: vi.fn(),
    mergeVulnerability: vi.fn()
  }
}))

vi.mock('@/services/data', () => ({
  default: {
    getLanguages: vi.fn(),
    getVulnerabilityTypes: vi.fn(),
    getVulnerabilityCategories: vi.fn(),
    getCustomFields: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    filterCustomFields: vi.fn().mockReturnValue([]),
    htmlEncode: vi.fn(v => v),
    strongPassword: vi.fn()
  }
}))

vi.mock('boot/i18n', () => ({
  $t: (key) => key
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Dialog: {
      create: vi.fn().mockReturnValue({
        onOk: vi.fn().mockReturnValue({ onCancel: vi.fn() }),
        onCancel: vi.fn()
      })
    },
    Notify: {
      create: vi.fn()
    }
  }
})

import VulnerabilityService from '@/services/vulnerability'
import DataService from '@/services/data'
import Utils from '@/services/utils'
import { Dialog, Notify } from 'quasar'
import VulnerabilitiesPage from '@/pages/vulnerabilities/index.vue'

const mockLanguages = [
  { locale: 'en', language: 'English' },
  { locale: 'fr', language: 'French' }
]

const mockVulnTypes = [
  { name: 'Web', locale: 'en' },
  { name: 'Network', locale: 'en' },
  { name: 'Web', locale: 'fr' }
]

const mockCategories = [
  { name: 'Category1' },
  { name: 'Category2' }
]

const mockVulnerabilities = [
  {
    _id: 'vuln1',
    category: 'Category1',
    status: 0,
    cvssv3: '',
    cvssv4: '',
    priority: '',
    remediationComplexity: '',
    details: [
      {
        locale: 'en',
        title: 'SQL Injection',
        vulnType: 'Web',
        description: '<p>desc</p>',
        observation: '',
        remediation: '<p>fix</p>',
        references: [],
        customFields: []
      }
    ]
  },
  {
    _id: 'vuln2',
    category: 'Category2',
    status: 1,
    cvssv3: '',
    cvssv4: '',
    priority: '',
    remediationComplexity: '',
    details: [
      {
        locale: 'en',
        title: 'XSS',
        vulnType: 'Web',
        description: '',
        observation: '',
        remediation: '',
        references: [],
        customFields: []
      }
    ]
  },
  {
    _id: 'vuln3',
    category: null,
    status: 2,
    cvssv3: '',
    cvssv4: '',
    priority: '',
    remediationComplexity: '',
    details: [
      {
        locale: 'en',
        title: 'Open Port',
        vulnType: 'Network',
        description: '',
        observation: '',
        remediation: '',
        references: [],
        customFields: []
      }
    ]
  }
]

function setupDefaultMocks() {
  DataService.getLanguages.mockResolvedValue({ data: { datas: mockLanguages } })
  DataService.getVulnerabilityTypes.mockResolvedValue({ data: { datas: mockVulnTypes } })
  DataService.getVulnerabilityCategories.mockResolvedValue({ data: { datas: mockCategories } })
  DataService.getCustomFields.mockResolvedValue({ data: { datas: [] } })
  VulnerabilityService.getVulnerabilities.mockResolvedValue({ data: { datas: mockVulnerabilities } })
  VulnerabilityService.getVulnUpdates.mockResolvedValue({ data: { datas: [] } })
}

// Helper to set $refs on Vue 3 component instances (can't assign directly through proxy)
function setRefs(wrapper, refs) {
  Object.entries(refs).forEach(([name, refValue]) => {
    if (wrapper.vm.$refs[name]) {
      Object.assign(wrapper.vm.$refs[name], refValue)
    }
  })
}

describe('Vulnerabilities Page', () => {
  let router, pinia, i18n

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/vulnerabilities', name: 'vulnerabilities', component: VulnerabilitiesPage },
        { path: '/audits', name: 'audits', component: { template: '<div>Audits</div>' } },
        { path: '/data/custom', component: { template: '<div>Data</div>' } }
      ]
    })

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
    return mount(VulnerabilitiesPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-table': true,
          'q-select': true,
          'q-toggle': true,
          'q-btn': true,
          'q-btn-dropdown': true,
          'q-dialog': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-bar': true,
          'q-space': true,
          'q-input': true,
          'q-field': true,
          'q-separator': true,
          'q-expansion-item': true,
          'q-list': true,
          'q-item': true,
          'q-item-section': true,
          'q-item-label': true,
          'q-icon': true,
          'q-tooltip': true,
          'q-tr': true,
          'q-td': true,
          'q-radio': true,
          'q-pagination': true,
          'q-scroll-area': true,
          'q-tabs': true,
          'q-tab': true,
          'q-tab-panels': true,
          'q-tab-panel': true,
          'q-badge': true,
          'q-layout': true,
          'q-header': true,
          'q-page-container': true,
          'q-page': true,
          'basic-editor': true,
          'breadcrumb': true,
          'cvss3-calculator': true,
          'cvss4-calculator': true,
          'textarea-array': true,
          'custom-fields': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $settings: {
            report: {
              public: {
                scoringMethods: { CVSS3: true, CVSS4: false }
              }
            }
          },
          $_: {
            cloneDeep: (obj) => JSON.parse(JSON.stringify(obj))
          },
          ...(options.mocks || {})
        }
      }
    })
  }

  const flushPromises = async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  describe('Initialization', () => {
    it('should call data loading methods on mount', async () => {
      createWrapper()
      await flushPromises()

      expect(DataService.getLanguages).toHaveBeenCalled()
      expect(DataService.getVulnerabilityTypes).toHaveBeenCalled()
      expect(DataService.getVulnerabilityCategories).toHaveBeenCalled()
      expect(DataService.getCustomFields).toHaveBeenCalled()
      expect(VulnerabilityService.getVulnerabilities).toHaveBeenCalled()
    })

    it('should set languages from API response', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.languages).toEqual(mockLanguages)
    })

    it('should set dtLanguage to first locale when languages load', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.dtLanguage).toBe('en')
    })

    it('should set loading to false after vulnerabilities load', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.loading).toBe(false)
    })

    it('should store vulnerabilities from API response', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.vulnerabilities).toEqual(mockVulnerabilities)
    })

    it('should set vulnerability categories from API response', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.vulnCategories).toEqual(mockCategories)
    })

    it('should set vulnerability types from API response', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.vulnTypes).toEqual(mockVulnTypes)
    })

    it('should show no language message when languages array is empty', async () => {
      DataService.getLanguages.mockResolvedValue({ data: { datas: [] } })
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.languages.length).toBe(0)
    })
  })

  describe('Computed Properties', () => {
    it('should filter vulnTypesLang by currentLanguage', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentLanguage = 'en'
      expect(wrapper.vm.vulnTypesLang).toEqual([
        { name: 'Web', locale: 'en' },
        { name: 'Network', locale: 'en' }
      ])

      wrapper.vm.currentLanguage = 'fr'
      expect(wrapper.vm.vulnTypesLang).toEqual([
        { name: 'Web', locale: 'fr' }
      ])
    })

    it('should compute computedVulnerabilities for the selected dtLanguage', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.dtLanguage = 'en'
      // All 3 mock vulnerabilities have english details with titles
      expect(wrapper.vm.computedVulnerabilities.length).toBe(3)
    })

    it('should return empty computedVulnerabilities for language with no details', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.dtLanguage = 'fr'
      expect(wrapper.vm.computedVulnerabilities.length).toBe(0)
    })

    it('should compute vulnCategoriesOptions with No Category prepended', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.vulnCategoriesOptions).toEqual(['No Category', 'Category1', 'Category2'])
    })

    it('should compute vulnTypeOptions with Undefined prepended for current dtLanguage', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.dtLanguage = 'en'
      expect(wrapper.vm.vulnTypeOptions).toEqual(['Undefined', 'Web', 'Network'])
    })
  })

  describe('getDtTitle', () => {
    it('should return title for matching locale', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.dtLanguage = 'en'
      const title = wrapper.vm.getDtTitle(mockVulnerabilities[0])
      expect(title).toBe('SQL Injection')
    })

    it('should return error key when locale not found', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.dtLanguage = 'de'
      const title = wrapper.vm.getDtTitle(mockVulnerabilities[0])
      expect(title).toBe('err.notDefinedLanguage')
    })
  })

  describe('getDtType', () => {
    it('should return vulnType for matching locale', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.dtLanguage = 'en'
      const type = wrapper.vm.getDtType(mockVulnerabilities[0])
      expect(type).toBe('Web')
    })

    it('should return Undefined when locale not found', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.dtLanguage = 'de'
      const type = wrapper.vm.getDtType(mockVulnerabilities[0])
      expect(type).toBe('Undefined')
    })
  })

  describe('cleanCurrentVulnerability', () => {
    it('should reset current vulnerability fields', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentVulnerability.cvssv3 = 'CVSS:3.1/AV:N'
      wrapper.vm.currentVulnerability.cvssv4 = 'CVSS:4.0/AV:N'
      wrapper.vm.currentVulnerability.priority = 3
      wrapper.vm.currentVulnerability.remediationComplexity = 2

      wrapper.vm.cleanCurrentVulnerability()

      expect(wrapper.vm.currentVulnerability.cvssv3).toBe('')
      expect(wrapper.vm.currentVulnerability.cvssv4).toBe('')
      expect(wrapper.vm.currentVulnerability.priority).toBe('')
      expect(wrapper.vm.currentVulnerability.remediationComplexity).toBe('')
      expect(wrapper.vm.currentVulnerability.details.length).toBeGreaterThan(0)
    })

    it('should set category from currentCategory if present', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentCategory = { name: 'TestCategory' }
      wrapper.vm.cleanCurrentVulnerability()

      expect(wrapper.vm.currentVulnerability.category).toBe('TestCategory')
    })

    it('should set category to null when no currentCategory', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentCategory = null
      wrapper.vm.cleanCurrentVulnerability()

      expect(wrapper.vm.currentVulnerability.category).toBeNull()
    })

    it('should clear errors', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.errors.title = 'some error'
      wrapper.vm.cleanCurrentVulnerability()

      expect(wrapper.vm.errors.title).toBe('')
    })
  })

  describe('setCurrentDetails', () => {
    it('should create new detail entry when locale does not exist', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentVulnerability.details = []
      wrapper.vm.currentLanguage = 'en'
      wrapper.vm.setCurrentDetails()

      expect(wrapper.vm.currentVulnerability.details.length).toBe(1)
      expect(wrapper.vm.currentVulnerability.details[0].locale).toBe('en')
      expect(wrapper.vm.currentVulnerability.details[0].title).toBe('')
      expect(wrapper.vm.currentDetailsIndex).toBe(0)
    })

    it('should set currentDetailsIndex to existing detail when locale exists', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentVulnerability.details = [
        { locale: 'en', title: 'Test', customFields: [] },
        { locale: 'fr', title: 'TestFR', customFields: [] }
      ]
      wrapper.vm.currentLanguage = 'fr'
      wrapper.vm.setCurrentDetails()

      expect(wrapper.vm.currentDetailsIndex).toBe(1)
    })

    it('should call filterCustomFields from Utils', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentVulnerability.details = []
      wrapper.vm.currentLanguage = 'en'
      wrapper.vm.setCurrentDetails()

      expect(Utils.filterCustomFields).toHaveBeenCalled()
    })
  })

  describe('createVulnerability', () => {
    it('should set title error when no detail has a title', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentVulnerability.details = [
        { locale: 'en', title: '', customFields: [] }
      ]
      wrapper.vm.createVulnerability()

      expect(wrapper.vm.errors.title).toBe('err.titleRequired')
      expect(VulnerabilityService.createVulnerabilities).not.toHaveBeenCalled()
    })

    it('should call createVulnerabilities service when title is present', async () => {
      VulnerabilityService.createVulnerabilities.mockResolvedValue({})
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentVulnerability.details = [
        { locale: 'en', title: 'New Vuln', customFields: [] }
      ]

      setRefs(wrapper, { createModal: { hide: vi.fn() } })
      wrapper.vm.createVulnerability()
      await flushPromises()

      expect(VulnerabilityService.createVulnerabilities).toHaveBeenCalledWith([wrapper.vm.currentVulnerability])
    })

    it('should show notification on create success', async () => {
      VulnerabilityService.createVulnerabilities.mockResolvedValue({})
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentVulnerability.details = [
        { locale: 'en', title: 'New Vuln', customFields: [] }
      ]
      setRefs(wrapper, { createModal: { hide: vi.fn() } })
      wrapper.vm.createVulnerability()
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'msg.vulnerabilityCreatedOk',
        color: 'positive'
      }))
    })

    it('should show error notification on create failure', async () => {
      VulnerabilityService.createVulnerabilities.mockRejectedValue({
        response: { data: { datas: 'Creation failed' } }
      })
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentVulnerability.details = [
        { locale: 'en', title: 'New Vuln', customFields: [] }
      ]
      wrapper.vm.createVulnerability()
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Creation failed',
        color: 'negative'
      }))
    })
  })

  describe('updateVulnerability', () => {
    it('should set title error when no detail has a title', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.currentVulnerability.details = [
        { locale: 'en', title: '', customFields: [] }
      ]
      wrapper.vm.updateVulnerability()

      expect(wrapper.vm.errors.title).toBe('err.titleRequired')
      expect(VulnerabilityService.updateVulnerability).not.toHaveBeenCalled()
    })

    it('should call updateVulnerability service with correct params', async () => {
      VulnerabilityService.updateVulnerability.mockResolvedValue({})
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.vulnerabilityId = 'vuln1'
      wrapper.vm.currentVulnerability.details = [
        { locale: 'en', title: 'Updated Vuln', customFields: [] }
      ]
      setRefs(wrapper, {
        editModal: { hide: vi.fn() },
        updatesModal: { hide: vi.fn() }
      })
      wrapper.vm.updateVulnerability()
      await flushPromises()

      expect(VulnerabilityService.updateVulnerability).toHaveBeenCalledWith(
        'vuln1',
        wrapper.vm.currentVulnerability
      )
    })

    it('should show notification on update success', async () => {
      VulnerabilityService.updateVulnerability.mockResolvedValue({})
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.vulnerabilityId = 'vuln1'
      wrapper.vm.currentVulnerability.details = [
        { locale: 'en', title: 'Updated Vuln', customFields: [] }
      ]
      setRefs(wrapper, {
        editModal: { hide: vi.fn() },
        updatesModal: { hide: vi.fn() }
      })
      wrapper.vm.updateVulnerability()
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'msg.vulnerabilityUpdatedOk',
        color: 'positive'
      }))
    })

    it('should show error notification on update failure', async () => {
      VulnerabilityService.updateVulnerability.mockRejectedValue({
        response: { data: { datas: 'Update failed' } }
      })
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.vulnerabilityId = 'vuln1'
      wrapper.vm.currentVulnerability.details = [
        { locale: 'en', title: 'Updated Vuln', customFields: [] }
      ]
      wrapper.vm.updateVulnerability()
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Update failed',
        color: 'negative'
      }))
    })
  })

  describe('deleteVulnerability', () => {
    it('should call deleteVulnerability service and refresh list on success', async () => {
      VulnerabilityService.deleteVulnerability.mockResolvedValue({})
      const wrapper = createWrapper()
      await flushPromises()

      vi.clearAllMocks()
      setupDefaultMocks()
      VulnerabilityService.deleteVulnerability.mockResolvedValue({})

      wrapper.vm.deleteVulnerability('vuln1')
      await flushPromises()

      expect(VulnerabilityService.deleteVulnerability).toHaveBeenCalledWith('vuln1')
      expect(VulnerabilityService.getVulnerabilities).toHaveBeenCalled()
      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'msg.vulnerabilityDeletedOk',
        color: 'positive'
      }))
    })

    it('should show error notification on delete failure', async () => {
      VulnerabilityService.deleteVulnerability.mockRejectedValue({
        response: { data: { datas: 'Delete failed' } }
      })
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.deleteVulnerability('vuln1')
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Delete failed',
        color: 'negative'
      }))
    })
  })

  describe('confirmDeleteVulnerability', () => {
    it('should open a confirmation dialog', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.confirmDeleteVulnerability({ _id: 'vuln1' })

      expect(Dialog.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'msg.confirmSuppression',
        message: 'msg.vulnerabilityWillBeDeleted'
      }))
    })
  })

  describe('clone', () => {
    it('should deep clone the row into currentVulnerability', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const row = {
        _id: 'vuln1',
        category: 'Category1',
        cvssv3: '',
        cvssv4: '',
        priority: '',
        remediationComplexity: '',
        details: [
          { locale: 'en', title: 'SQL Injection', customFields: [] }
        ],
        status: 0
      }

      wrapper.vm.clone(row)

      expect(wrapper.vm.vulnerabilityId).toBe('vuln1')
      expect(wrapper.vm.currentVulnerability.category).toBe('Category1')
    })
  })

  describe('customSort', () => {
    it('should sort by title ascending', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      wrapper.vm.dtLanguage = 'en'

      const rows = [...mockVulnerabilities]
      const sorted = wrapper.vm.customSort(rows, 'title', false)

      expect(wrapper.vm.getDtTitle(sorted[0])).toBe('Open Port')
      expect(wrapper.vm.getDtTitle(sorted[1])).toBe('SQL Injection')
      expect(wrapper.vm.getDtTitle(sorted[2])).toBe('XSS')
    })

    it('should sort by title descending', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      wrapper.vm.dtLanguage = 'en'

      const rows = [...mockVulnerabilities]
      const sorted = wrapper.vm.customSort(rows, 'title', true)

      expect(wrapper.vm.getDtTitle(sorted[0])).toBe('XSS')
      expect(wrapper.vm.getDtTitle(sorted[2])).toBe('Open Port')
    })

    it('should sort by category', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      wrapper.vm.dtLanguage = 'en'

      const rows = [...mockVulnerabilities]
      const sorted = wrapper.vm.customSort(rows, 'category', false)

      expect(sorted[0].category).toBe('Category1')
      expect(sorted[1].category).toBe('Category2')
    })

    it('should sort by type', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      wrapper.vm.dtLanguage = 'en'

      const rows = [...mockVulnerabilities]
      const sorted = wrapper.vm.customSort(rows, 'type', false)

      expect(wrapper.vm.getDtType(sorted[0])).toBe('Network')
      expect(wrapper.vm.getDtType(sorted[1])).toBe('Web')
    })

    it('should return undefined for null rows', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const result = wrapper.vm.customSort(null, 'title', false)
      expect(result).toBeUndefined()
    })
  })

  describe('customFilter', () => {
    it('should filter by title search term', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      wrapper.vm.dtLanguage = 'en'

      const terms = { title: 'SQL', category: '', type: '', valid: 0, new: 1, updates: 2 }
      const result = wrapper.vm.customFilter(mockVulnerabilities, terms)

      expect(result.length).toBe(1)
      expect(result[0]._id).toBe('vuln1')
    })

    it('should filter by status toggles', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      wrapper.vm.dtLanguage = 'en'

      // Only show valid (status 0), exclude new and updates
      const terms = { title: '', category: '', type: '', valid: 0, new: null, updates: null }
      const result = wrapper.vm.customFilter(mockVulnerabilities, terms)

      expect(result.length).toBe(1)
      expect(result[0]._id).toBe('vuln1')
    })

    it('should update filteredRowsCount', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      wrapper.vm.dtLanguage = 'en'

      const terms = { title: '', category: '', type: '', valid: 0, new: 1, updates: 2 }
      wrapper.vm.customFilter(mockVulnerabilities, terms)

      expect(wrapper.vm.filteredRowsCount).toBe(3)
    })

    it('should filter case-insensitively', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      wrapper.vm.dtLanguage = 'en'

      const terms = { title: 'sql injection', category: '', type: '', valid: 0, new: 1, updates: 2 }
      const result = wrapper.vm.customFilter(mockVulnerabilities, terms)

      expect(result.length).toBe(1)
    })
  })

  describe('goToAudits', () => {
    it('should navigate to audits page with findingTitle query', async () => {
      const wrapper = createWrapper()
      await flushPromises()
      await router.isReady()
      wrapper.vm.dtLanguage = 'en'

      const pushSpy = vi.spyOn(router, 'push')
      wrapper.vm.goToAudits(mockVulnerabilities[0])

      expect(pushSpy).toHaveBeenCalledWith({
        name: 'audits',
        query: { findingTitle: 'SQL Injection' }
      })
    })
  })

  describe('getVulnTitleLocale', () => {
    it('should return title for matching locale', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const title = wrapper.vm.getVulnTitleLocale(mockVulnerabilities[0], 'en')
      expect(title).toBe('SQL Injection')
    })

    it('should return "undefined" when locale not found', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const title = wrapper.vm.getVulnTitleLocale(mockVulnerabilities[0], 'de')
      expect(title).toBe('undefined')
    })
  })

  describe('mergeVulnerabilities', () => {
    it('should call mergeVulnerability service with correct params', async () => {
      VulnerabilityService.mergeVulnerability.mockResolvedValue({})
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.mergeVulnLeft = 'vuln1'
      wrapper.vm.mergeVulnRight = 'vuln2'
      wrapper.vm.mergeLanguageRight = 'fr'

      wrapper.vm.mergeVulnerabilities()
      await flushPromises()

      expect(VulnerabilityService.mergeVulnerability).toHaveBeenCalledWith('vuln1', 'vuln2', 'fr')
    })

    it('should show success notification on merge success', async () => {
      VulnerabilityService.mergeVulnerability.mockResolvedValue({})
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.mergeVulnLeft = 'vuln1'
      wrapper.vm.mergeVulnRight = 'vuln2'
      wrapper.vm.mergeLanguageRight = 'fr'

      wrapper.vm.mergeVulnerabilities()
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'msg.vulnerabilityMergeOk',
        color: 'positive'
      }))
    })

    it('should show error notification on merge failure', async () => {
      VulnerabilityService.mergeVulnerability.mockRejectedValue({
        response: { data: { datas: 'Merge failed' } }
      })
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.mergeVulnLeft = 'vuln1'
      wrapper.vm.mergeVulnRight = 'vuln2'
      wrapper.vm.mergeLanguageRight = 'fr'

      wrapper.vm.mergeVulnerabilities()
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Merge failed',
        color: 'negative'
      }))
    })
  })

  describe('cleanErrors', () => {
    it('should clear title error', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.errors.title = 'some error'
      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.title).toBe('')
    })
  })

  describe('Error handling on data load', () => {
    it('should handle languages load failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getLanguages.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await flushPromises()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle vulnerabilities load failure and show notification', async () => {
      VulnerabilityService.getVulnerabilities.mockRejectedValue({
        response: { data: { datas: 'Failed to load' } }
      })

      const wrapper = createWrapper()
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Failed to load',
        color: 'negative'
      }))
    })
  })

  describe('Data properties', () => {
    it('should have correct initial state', async () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.loading).toBe(true)
      expect(wrapper.vm.vulnerabilities).toEqual([])
      expect(wrapper.vm.search).toEqual({
        title: '', type: '', category: '', valid: 0, new: 1, updates: 2
      })
      expect(wrapper.vm.errors).toEqual({ title: '' })
      expect(wrapper.vm.pagination.rowsPerPage).toBe(25)
      expect(wrapper.vm.pagination.sortBy).toBe('title')
    })

    it('should have correct rowsPerPageOptions', async () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.rowsPerPageOptions).toEqual([
        { label: '25', value: 25 },
        { label: '50', value: 50 },
        { label: '100', value: 100 },
        { label: 'All', value: 0 }
      ])
    })
  })

  describe('Merge computed filters', () => {
    it('should filter vulnerabilities for merge left panel', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.mergeLanguageLeft = 'en'
      wrapper.vm.mergeLanguageRight = 'fr'

      // All vulns have 'en' details but none have 'fr', so they show in left
      const leftFiltered = wrapper.vm.filteredVulnerabilitiesMergeLeft
      expect(leftFiltered.length).toBe(3)
    })

    it('should filter vulnerabilities for merge right panel', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      wrapper.vm.mergeLanguageLeft = 'en'
      wrapper.vm.mergeLanguageRight = 'fr'

      // No vulns have 'fr' details but not 'en', so right is empty
      const rightFiltered = wrapper.vm.filteredVulnerabilitiesMergeRight
      expect(rightFiltered.length).toBe(0)
    })
  })
})
