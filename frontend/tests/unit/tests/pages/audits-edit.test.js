import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

// Must mock stores/user before component import - component calls useUserStore() at module scope
const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    id: '1',
    username: 'testuser',
    role: 'admin',
    firstname: 'Test',
    lastname: 'User',
    roles: '*',
    isLoggedIn: true,
    isAllowed: vi.fn(() => true)
  }
}))

// Mock dependencies before importing the component
vi.mock('@/services/audit', () => ({
  default: {
    getAudit: vi.fn(),
    getAuditChildren: vi.fn(),
    generateAuditReport: vi.fn(),
    updateAuditSortFindings: vi.fn(),
    updateAuditFindingPosition: vi.fn(),
    toggleApproval: vi.fn(),
    updateReadyForReview: vi.fn(),
    getRetest: vi.fn(),
    createRetest: vi.fn(),
    deleteAuditParent: vi.fn(),
    getAuditComments: vi.fn()
  }
}))

vi.mock('@/services/data', () => ({
  default: {
    getVulnerabilityCategories: vi.fn(),
    getCustomFields: vi.fn(),
    getAuditTypes: vi.fn(),
    getSections: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    AUDIT_VIEW_STATE: {
      EDIT: 0,
      EDIT_READONLY: 1,
      REVIEW: 2,
      REVIEW_EDITOR: 3,
      REVIEW_APPROVED: 4,
      REVIEW_ADMIN: 5,
      REVIEW_ADMIN_APPROVED: 6,
      REVIEW_READONLY: 7,
      APPROVED: 8,
      APPROVED_APPROVED: 9,
      APPROVED_READONLY: 10
    },
    strongPassword: vi.fn()
  }
}))

vi.mock('@/boot/i18n', () => ({
  $t: (key) => key
}))

vi.mock('ae-cvss-calculator', () => ({
  Cvss4P0: vi.fn(function() {
    this.createJsonSchema = () => ({ baseScore: 9.8, baseSeverity: 'Critical', environmentalSeverity: 'Critical', temporalSeverity: 'Critical' })
  }),
  Cvss3P1: vi.fn(function() {
    this.createJsonSchema = () => ({ baseScore: 7.5, baseSeverity: 'High', environmentalSeverity: 'High', temporalSeverity: 'High' })
  })
}))

vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore)
}))

vi.mock('vuedraggable', () => ({
  default: {
    name: 'draggable',
    template: '<div><slot /></div>',
    props: ['list', 'handle', 'ghostClass', 'itemKey']
  }
}))

vi.mock('components/comments-list', () => ({
  default: {
    name: 'CommentsList',
    template: '<div />'
  }
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Dialog: {
      create: vi.fn().mockReturnValue({
        onOk: vi.fn().mockReturnThis(),
        onCancel: vi.fn().mockReturnThis()
      })
    },
    Notify: {
      create: vi.fn().mockReturnValue(vi.fn())
    },
    Loading: {
      show: vi.fn(),
      hide: vi.fn()
    },
    QSpinnerGears: {},
    LocalStorage: {
      getItem: vi.fn().mockReturnValue('en-US'),
      set: vi.fn()
    }
  }
})

import AuditService from '@/services/audit'
import DataService from '@/services/data'
import AuditEditPage from '@/pages/audits/edit/index.vue'
import { Dialog, Notify } from 'quasar'

// Mock lodash globally (component uses _ globally)
globalThis._ = {
  chain: (input) => {
    let result = Array.isArray(input) ? input : Object.values(input || {})
    return {
      groupBy: function(key) {
        const grouped = {}
        result.forEach(item => {
          const k = item[key] || 'undefined'
          if (!grouped[k]) grouped[k] = []
          grouped[k].push(item)
        })
        result = grouped
        return this
      },
      map: function(fn) {
        result = Object.entries(result).map(([key, value]) => fn(value, key))
        return this
      },
      value: function() {
        return result
      }
    }
  }
}

describe('Audit Edit Page', () => {
  let router
  let pinia
  let i18n
  let wrappers

  const mockAudit = {
    _id: 'audit-123',
    name: 'Test Audit',
    type: 'default',
    state: 'EDIT',
    auditType: 'Web Application',
    findings: [
      { _id: 'f1', title: 'XSS', category: 'Web', cvssv3: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N', status: 0 },
      { _id: 'f2', title: 'SQLi', category: 'Web', cvssv3: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', status: 1 }
    ],
    sections: [
      { _id: 's1', name: 'Introduction', field: 'introduction' },
      { _id: 's2', name: 'Scope', field: 'scope' }
    ],
    sortFindings: [],
    creator: { _id: 'user-1' },
    collaborators: [],
    reviewers: [],
    approvals: [],
    comments: []
  }

  const mockVulnCategories = [
    { name: 'Web', sortValue: 'cvssScore', sortOrder: 'desc', sortAuto: true }
  ]

  const mockAuditTypes = [
    { name: 'Web Application', stage: 'default', hidden: [] },
    { name: 'Retest Web', stage: 'retest', hidden: [] }
  ]

  const mockCustomFields = [
    { label: 'Priority', display: 'finding', fieldType: 'select' }
  ]

  const mockSections = [
    { field: 'introduction', icon: 'notes', name: 'Introduction' },
    { field: 'scope', icon: 'search', name: 'Scope' }
  ]

  beforeEach(() => {
    wrappers = []
    // Reset mockUserStore to defaults
    mockUserStore.id = '1'
    mockUserStore.username = 'testuser'
    mockUserStore.role = 'admin'
    mockUserStore.firstname = 'Test'
    mockUserStore.lastname = 'User'
    mockUserStore.roles = '*'
    mockUserStore.isLoggedIn = true
    mockUserStore.isAllowed = vi.fn(() => true)

    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/audits/:auditId',
          component: AuditEditPage,
          children: [
            { path: 'general', name: 'general', component: { template: '<div>General</div>' } },
            { path: 'network', name: 'network', component: { template: '<div>Network</div>' } },
            { path: 'findings/add', name: 'addFindings', component: { template: '<div>Add</div>' } },
            { path: 'findings/:findingId', name: 'editFinding', component: { template: '<div>Edit</div>' } },
            { path: 'sections/:sectionId', name: 'editSection', component: { template: '<div>Section</div>' } },
            { path: 'audits/add', name: 'addAudits', component: { template: '<div>AddAudits</div>' } }
          ]
        },
        { path: '/403', name: '403', component: { template: '<div>403</div>' } },
        { path: '/404', name: '404', component: { template: '<div>404</div>' } }
      ]
    })

    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: { 'en-US': {} }
    })

    // Setup default mock responses
    DataService.getVulnerabilityCategories.mockResolvedValue({ data: { datas: mockVulnCategories } })
    DataService.getCustomFields.mockResolvedValue({ data: { datas: mockCustomFields } })
    DataService.getAuditTypes.mockResolvedValue({ data: { datas: mockAuditTypes } })
    DataService.getSections.mockResolvedValue({ data: { datas: mockSections } })
    AuditService.getAudit.mockResolvedValue({ data: { datas: { ...mockAudit } } })
    AuditService.getAuditChildren.mockResolvedValue({ data: { datas: [] } })
    AuditService.getRetest.mockRejectedValue(new Error('No retest'))

    vi.clearAllMocks()

    // Re-setup mocks after clearAllMocks
    DataService.getVulnerabilityCategories.mockResolvedValue({ data: { datas: mockVulnCategories } })
    DataService.getCustomFields.mockResolvedValue({ data: { datas: mockCustomFields } })
    DataService.getAuditTypes.mockResolvedValue({ data: { datas: mockAuditTypes } })
    DataService.getSections.mockResolvedValue({ data: { datas: mockSections } })
    AuditService.getAudit.mockResolvedValue({ data: { datas: JSON.parse(JSON.stringify(mockAudit)) } })
    AuditService.getAuditChildren.mockResolvedValue({ data: { datas: [] } })
    AuditService.getRetest.mockRejectedValue(new Error('No retest'))
  })

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount())
    wrappers = []
  })

  const createWrapper = async (options = {}) => {
    await router.push(`/audits/audit-123/general`)
    await router.isReady()

    const wrapper = mount(AuditEditPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-drawer': { template: '<div><slot /></div>' },
          'q-splitter': { template: '<div><slot name="before" /><slot name="after" /></div>', props: ['modelValue'] },
          'q-list': { template: '<div><slot /></div>' },
          'q-item': { template: '<div><slot /></div>', props: ['to'] },
          'q-item-section': { template: '<div><slot /></div>', props: ['avatar', 'side'] },
          'q-item-label': { template: '<div><slot /></div>', props: ['header'] },
          'q-icon': true,
          'q-chip': true,
          'q-btn': true,
          'q-tooltip': true,
          'q-menu': true,
          'q-separator': true,
          'q-toggle': true,
          'q-option-group': true,
          'router-view': true,
          'draggable': { template: '<div><slot /></div>', props: ['list', 'handle', 'ghostClass', 'itemKey'] },
          'comments-list': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $settings: {
            reviews: { enabled: false },
            report: {
              public: {
                cvssColors: {
                  noneColor: 'blue',
                  lowColor: 'green',
                  mediumColor: 'orange',
                  highColor: 'red',
                  criticalColor: 'black'
                },
                scoringMethods: {
                  CVSS3: true,
                  CVSS4: false
                }
              }
            }
          },
          $socket: {
            emit: vi.fn(),
            on: vi.fn(),
            off: vi.fn()
          },
          ...(options.mocks || {})
        }
      }
    })

    wrappers.push(wrapper)

    return wrapper
  }

  describe('Initialization', () => {
    it('should set auditId from route params on creation', async () => {
      const wrapper = await createWrapper()

      expect(wrapper.vm.auditId).toBe('audit-123')
    })

    it('should call data loading services on creation', async () => {
      await createWrapper()

      expect(DataService.getCustomFields).toHaveBeenCalled()
      expect(DataService.getAuditTypes).toHaveBeenCalled()
      expect(DataService.getVulnerabilityCategories).toHaveBeenCalled()
    })

    it('should call getAudit which also fetches vulnerability categories', async () => {
      await createWrapper()

      expect(DataService.getVulnerabilityCategories).toHaveBeenCalled()
      expect(AuditService.getAudit).toHaveBeenCalledWith('audit-123')
    })

    it('should call getAuditChildren on creation', async () => {
      await createWrapper()

      expect(AuditService.getAuditChildren).toHaveBeenCalledWith('audit-123')
    })

    it('should call getRetest on creation', async () => {
      await createWrapper()

      expect(AuditService.getRetest).toHaveBeenCalledWith('audit-123')
    })

    it('should load audit types and filter retest types', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      expect(wrapper.vm.auditTypes).toEqual(mockAuditTypes)
      expect(wrapper.vm.auditTypesRetest).toEqual([{ name: 'Retest Web', stage: 'retest', hidden: [] }])
    })

    it('should load custom fields', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      expect(wrapper.vm.customFields).toEqual(mockCustomFields)
    })

    it('should store sections after loading', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      expect(wrapper.vm.sections).toEqual(mockSections)
    })
  })

  describe('Audit Loading', () => {
    it('should populate audit data after loading', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      expect(wrapper.vm.audit.name).toBe('Test Audit')
      expect(wrapper.vm.audit.type).toBe('default')
    })

    it('should handle 403 error by redirecting', async () => {
      DataService.getVulnerabilityCategories.mockResolvedValue({ data: { datas: mockVulnCategories } })
      AuditService.getAudit.mockRejectedValue({
        response: { status: 403, data: { datas: 'Forbidden' } }
      })

      const wrapper = await createWrapper()
      await flushPromises()

      // Router should have been pushed to 403
      expect(router.currentRoute.value.name).toBe('403')
    })

    it('should handle 404 error by redirecting', async () => {
      DataService.getVulnerabilityCategories.mockResolvedValue({ data: { datas: mockVulnCategories } })
      AuditService.getAudit.mockRejectedValue({
        response: { status: 404, data: { datas: 'Not Found' } }
      })

      const wrapper = await createWrapper()
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('404')
    })

    it('should store children after loading', async () => {
      const mockChildren = [
        { _id: 'child-1', name: 'Child Audit 1', auditType: 'Web' }
      ]
      AuditService.getAuditChildren.mockResolvedValue({ data: { datas: mockChildren } })

      const wrapper = await createWrapper()
      await flushPromises()

      expect(wrapper.vm.children).toEqual(mockChildren)
    })
  })

  describe('UI State Management', () => {
    it('should set EDIT state when reviews are disabled and user is editor', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      // The user store needs to have the creator's ID
      mockUserStore.id = 'user-1'

      // Manually call getUIState after setting user
      wrapper.vm.getUIState()

      expect(wrapper.vm.frontEndAuditState).toBe(0) // EDIT
    })

    it('should set EDIT_READONLY when user is not editor and reviews disabled', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      mockUserStore.id = 'other-user'
      mockUserStore.roles = ''
      mockUserStore.isAllowed = vi.fn(() => false)

      wrapper.vm.getUIState()

      expect(wrapper.vm.frontEndAuditState).toBe(1) // EDIT_READONLY
    })

    it('should set REVIEW state for reviewer when audit is in REVIEW state', async () => {
      const wrapper = await createWrapper({
        mocks: {
          $settings: {
            reviews: { enabled: true },
            report: {
              public: {
                cvssColors: { noneColor: 'blue' },
                scoringMethods: { CVSS3: true, CVSS4: false }
              }
            }
          }
        }
      })
      await flushPromises()

      mockUserStore.id = 'reviewer-1'
      mockUserStore.roles = ''
      mockUserStore.isAllowed = vi.fn(() => false)

      wrapper.vm.audit.state = 'REVIEW'
      wrapper.vm.audit.reviewers = [{ _id: 'reviewer-1' }]
      wrapper.vm.audit.approvals = []

      wrapper.vm.getUIState()

      expect(wrapper.vm.frontEndAuditState).toBe(2) // REVIEW
    })
  })

  describe('User Role Detection', () => {
    it('should identify user as editor when they are the creator', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      mockUserStore.id = 'user-1'

      expect(wrapper.vm.isUserAnEditor()).toBe(true)
    })

    it('should identify user as editor when they are a collaborator', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      mockUserStore.id = 'collab-1'

      wrapper.vm.audit.collaborators = [{ _id: 'collab-1' }]

      expect(wrapper.vm.isUserAnEditor()).toBe(true)
    })

    it('should not identify user as editor when they are neither creator nor collaborator', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      mockUserStore.id = 'other-user'
      mockUserStore.roles = ''
      mockUserStore.isAllowed = vi.fn(() => false)

      expect(wrapper.vm.isUserAnEditor()).toBe(false)
    })

    it('should identify user as reviewer when they are in reviewers list and not editor', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      mockUserStore.id = 'reviewer-1'
      mockUserStore.roles = ''
      mockUserStore.isAllowed = vi.fn(() => false)

      wrapper.vm.audit.reviewers = [{ _id: 'reviewer-1' }]

      expect(wrapper.vm.isUserAReviewer()).toBe(true)
    })

    it('should not identify creator as reviewer even if in reviewers list', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      mockUserStore.id = 'user-1'

      wrapper.vm.audit.reviewers = [{ _id: 'user-1' }]

      expect(wrapper.vm.isUserAReviewer()).toBe(false)
    })

    it('should detect if user has already approved', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      mockUserStore.id = 'reviewer-1'

      wrapper.vm.audit.approvals = [{ _id: 'reviewer-1' }]

      expect(wrapper.vm.userHasAlreadyApproved()).toBe(true)
    })

    it('should detect if user has not approved', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      mockUserStore.id = 'reviewer-1'

      wrapper.vm.audit.approvals = []

      expect(wrapper.vm.userHasAlreadyApproved()).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('should filter generalUsers correctly', async () => {
      const wrapper = await createWrapper()
      wrapper.vm.users = [
        { username: 'user1', menu: 'general', color: '#77C84E' },
        { username: 'user2', menu: 'network', color: '#FF0000' },
        { username: 'user3', menu: 'general', color: '#0000FF' }
      ]

      expect(wrapper.vm.generalUsers).toHaveLength(2)
      expect(wrapper.vm.generalUsers[0].username).toBe('user1')
    })

    it('should filter networkUsers correctly', async () => {
      const wrapper = await createWrapper()
      wrapper.vm.users = [
        { username: 'user1', menu: 'general', color: '#77C84E' },
        { username: 'user2', menu: 'network', color: '#FF0000' }
      ]

      expect(wrapper.vm.networkUsers).toHaveLength(1)
      expect(wrapper.vm.networkUsers[0].username).toBe('user2')
    })

    it('should filter findingUsers correctly', async () => {
      const wrapper = await createWrapper()
      wrapper.vm.users = [
        { username: 'user1', menu: 'editFinding', finding: 'f1', color: '#77C84E' },
        { username: 'user2', menu: 'general', color: '#FF0000' }
      ]

      expect(wrapper.vm.findingUsers).toHaveLength(1)
    })

    it('should filter sectionUsers correctly', async () => {
      const wrapper = await createWrapper()
      wrapper.vm.users = [
        { username: 'user1', menu: 'editSection', section: 's1', color: '#77C84E' },
        { username: 'user2', menu: 'general', color: '#FF0000' }
      ]

      expect(wrapper.vm.sectionUsers).toHaveLength(1)
    })

    it('should find currentAuditType from auditTypes', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.auditType = 'Web Application'

      expect(wrapper.vm.currentAuditType).toEqual(mockAuditTypes[0])
    })

    it('should return undefined for currentAuditType when not found', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.auditType = 'Nonexistent'

      expect(wrapper.vm.currentAuditType).toBeUndefined()
    })

    it('should compute commentIdList from audit comments', async () => {
      const wrapper = await createWrapper()
      wrapper.vm.audit.comments = [
        { _id: 'c1', text: 'Comment 1' },
        { _id: 'c2', text: 'Comment 2' }
      ]

      expect(wrapper.vm.commentIdList).toEqual(['c1', 'c2'])
    })

    it('should compute replyingComment correctly', async () => {
      const wrapper = await createWrapper()
      wrapper.vm.audit.comments = [
        { _id: 'c1', text: 'Comment 1' },
        { _id: 'c2', text: 'Comment 2', replyTemp: 'typing...' }
      ]

      expect(wrapper.vm.replyingComment).toBe(true)
    })

    it('should compute replyingComment as false when no replies in progress', async () => {
      const wrapper = await createWrapper()
      wrapper.vm.audit.comments = [
        { _id: 'c1', text: 'Comment 1' },
        { _id: 'c2', text: 'Comment 2' }
      ]

      expect(wrapper.vm.replyingComment).toBe(false)
    })
  })

  describe('Finding Severity and Color', () => {
    it('should return severity based on CVSS3 score', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.sortFindings = []
      const finding = { cvssv3: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', category: 'Web' }

      const severity = wrapper.vm.getFindingSeverity(finding)

      // The mocked Cvss3P1 returns baseSeverity 'High'
      expect(severity).toBe('High')
    })

    it('should return None when no CVSS data is available', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.sortFindings = []
      const finding = { category: 'Web' }

      const severity = wrapper.vm.getFindingSeverity(finding)

      expect(severity).toBe('None')
    })

    it('should return color based on settings cvssColors', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.sortFindings = []
      const finding = { cvssv3: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', category: 'Web' }

      const color = wrapper.vm.getFindingColor(finding)

      // getFindingSeverity returns 'High', so it uses highColor
      expect(color).toBe('red')
    })

    it('should return noneColor for unrecognized severity', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.sortFindings = []
      const finding = { category: 'Web' }

      const color = wrapper.vm.getFindingColor(finding)

      // No CVSS, severity is 'None', noneColor is 'blue'
      expect(color).toBe('blue')
    })

    it('should use fallback colors when $settings.report is not available', async () => {
      const wrapper = await createWrapper({
        mocks: {
          $settings: {
            reviews: { enabled: false }
          }
        }
      })
      await flushPromises()

      wrapper.vm.audit.sortFindings = []
      const finding = { category: 'Web' }

      const color = wrapper.vm.getFindingColor(finding)

      expect(color).toBe('blue') // default for 'None'
    })
  })

  describe('Section Icon', () => {
    it('should return section icon when section is found', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      const icon = wrapper.vm.getSectionIcon({ field: 'scope' })

      expect(icon).toBe('search')
    })

    it('should return notes when section icon is not defined', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.sections = [{ field: 'custom', name: 'Custom' }]

      const icon = wrapper.vm.getSectionIcon({ field: 'custom' })

      expect(icon).toBe('notes')
    })

    it('should return notes when section is not found', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      const icon = wrapper.vm.getSectionIcon({ field: 'unknown' })

      expect(icon).toBe('notes')
    })
  })

  describe('Sort Options', () => {
    it('should return default sort options', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      const options = wrapper.vm.getSortOptions('Web')

      expect(options.length).toBeGreaterThanOrEqual(5)
      expect(options[0]).toEqual({ label: 'cvssScore', value: 'cvssScore' })
      expect(options[1]).toEqual({ label: 'cvssTemporalScore', value: 'cvssTemporalScore' })
    })

    it('should include custom fields in sort options', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.customFields = [
        { label: 'Priority', display: 'finding', fieldType: 'select' }
      ]

      const options = wrapper.vm.getSortOptions('Web')

      const priorityOption = options.find(o => o.label === 'Priority')
      expect(priorityOption).toBeDefined()
    })

    it('should not include custom fields with wrong display type', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.customFields = [
        { label: 'CustomField', display: 'audit', fieldType: 'select' }
      ]

      const options = wrapper.vm.getSortOptions('Web')

      const customOption = options.find(o => o.label === 'CustomField')
      expect(customOption).toBeUndefined()
    })

    it('should call updateAuditSortFindings when updating sort', async () => {
      AuditService.updateAuditSortFindings.mockResolvedValue({})
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.sortFindings = [{ category: 'Web', sortValue: 'cvssScore', sortOrder: 'desc', sortAuto: true }]

      wrapper.vm.updateSortFindings()

      expect(AuditService.updateAuditSortFindings).toHaveBeenCalledWith('audit-123', {
        sortFindings: wrapper.vm.audit.sortFindings
      })
    })
  })

  describe('Finding Position', () => {
    it('should call updateAuditFindingPosition with correct indices', async () => {
      AuditService.updateAuditFindingPosition.mockResolvedValue({})
      // Need to re-mock getAudit for the refresh call
      AuditService.getAudit.mockResolvedValue({ data: { datas: JSON.parse(JSON.stringify(mockAudit)) } })

      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.findings = [
        { _id: 'f1', title: 'XSS', category: 'Web' },
        { _id: 'f2', title: 'SQLi', category: 'Web' }
      ]

      wrapper.vm.moveFindingPosition({ oldIndex: 0, newIndex: 1 }, 'Web')

      expect(AuditService.updateAuditFindingPosition).toHaveBeenCalledWith('audit-123', {
        oldIndex: 0,
        newIndex: 1
      })
    })

    it('should not call API when category is not found in findings', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.findings = [
        { _id: 'f1', title: 'XSS', category: 'Web' }
      ]

      wrapper.vm.moveFindingPosition({ oldIndex: 0, newIndex: 1 }, 'NonexistentCategory')

      expect(AuditService.updateAuditFindingPosition).not.toHaveBeenCalled()
    })
  })

  describe('Review Management', () => {
    it('should toggle review state from EDIT to REVIEW', async () => {
      AuditService.updateReadyForReview.mockResolvedValue({})
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.state = 'EDIT'

      wrapper.vm.toggleAskReview()

      expect(AuditService.updateReadyForReview).toHaveBeenCalledWith('audit-123', { state: 'REVIEW' })
    })

    it('should toggle review state from REVIEW to EDIT', async () => {
      AuditService.updateReadyForReview.mockResolvedValue({})
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.state = 'REVIEW'

      wrapper.vm.toggleAskReview()

      expect(AuditService.updateReadyForReview).toHaveBeenCalledWith('audit-123', { state: 'EDIT' })
    })

    it('should update audit state after successful toggle', async () => {
      AuditService.updateReadyForReview.mockResolvedValue({})
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.state = 'EDIT'
      wrapper.vm.audit.creator = { _id: 'user-1' }
      wrapper.vm.audit.collaborators = []
      wrapper.vm.audit.reviewers = []
      wrapper.vm.audit.approvals = []

      wrapper.vm.toggleAskReview()
      await flushPromises()

      expect(wrapper.vm.audit.state).toBe('REVIEW')
    })

    it('should show error notification on review toggle failure', async () => {
      AuditService.updateReadyForReview.mockRejectedValue({
        response: { data: { datas: 'Review toggle failed' } }
      })
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.state = 'EDIT'

      wrapper.vm.toggleAskReview()
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Review toggle failed',
        color: 'negative'
      }))
    })
  })

  describe('Approval Management', () => {
    it('should call toggleApproval API', async () => {
      AuditService.toggleApproval.mockResolvedValue({})
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.toggleApproval()

      expect(AuditService.toggleApproval).toHaveBeenCalledWith('audit-123')
    })

    it('should show success notification after approval toggle', async () => {
      AuditService.toggleApproval.mockResolvedValue({})
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.toggleApproval()
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'msg.auditApprovalUpdateOk',
        color: 'positive'
      }))
    })

    it('should show error notification on approval toggle failure', async () => {
      AuditService.toggleApproval.mockRejectedValue({
        response: { data: { datas: 'Approval failed' } }
      })
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.toggleApproval()
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Approval failed',
        color: 'negative'
      }))
    })
  })

  describe('Retest Management', () => {
    it('should store retest ID when retest exists', async () => {
      AuditService.getRetest.mockResolvedValue({ data: { datas: { _id: 'retest-123' } } })
      const wrapper = await createWrapper()
      await flushPromises()

      expect(wrapper.vm.auditRetest).toBe('retest-123')
    })

    it('should call createRetest with audit type name', async () => {
      AuditService.createRetest.mockResolvedValue({
        data: { datas: { audit: { _id: 'new-retest' } } }
      })
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.createRetest({ name: 'Retest Web' })

      expect(AuditService.createRetest).toHaveBeenCalledWith('audit-123', { auditType: 'Retest Web' })
    })

    it('should show error notification on createRetest failure', async () => {
      AuditService.createRetest.mockRejectedValue({
        response: { data: { datas: 'Retest creation failed' } }
      })
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.createRetest({ name: 'Retest Web' })
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Retest creation failed',
        color: 'negative'
      }))
    })
  })

  describe('Delete Parent', () => {
    it('should call deleteAuditParent API', async () => {
      AuditService.deleteAuditParent.mockResolvedValue({})
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.deleteParent('child-1')

      expect(AuditService.deleteAuditParent).toHaveBeenCalledWith('child-1')
    })

    it('should show success notification after deleting parent', async () => {
      AuditService.deleteAuditParent.mockResolvedValue({})
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.deleteParent('child-1')
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Audit removed successfully',
        color: 'positive'
      }))
    })

    it('should show error notification on delete failure', async () => {
      AuditService.deleteAuditParent.mockRejectedValue({
        response: { data: { datas: 'Delete failed' } }
      })
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.deleteParent('child-1')
      await flushPromises()

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Delete failed',
        color: 'negative'
      }))
    })

    it('should show confirmation dialog before deleting parent', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.confirmDeleteParent({ _id: 'child-1', name: 'Child Audit' })

      expect(Dialog.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'msg.confirmSuppression'
      }))
    })
  })

  describe('Report Generation', () => {
    it('should call generateAuditReport API', async () => {
      AuditService.generateAuditReport.mockResolvedValue({
        data: new Blob(),
        headers: { 'content-disposition': 'attachment; filename="report.docx"' }
      })
      const wrapper = await createWrapper()
      await flushPromises()

      const mockLink = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') return mockLink
        return document.createElement(tagName)
      })
      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:url')

      try {
        wrapper.vm.generateReport()
        expect(AuditService.generateAuditReport).toHaveBeenCalledWith('audit-123')
      } finally {
        createElementSpy.mockRestore()
        appendChildSpy.mockRestore()
        createObjectURLSpy.mockRestore()
      }
    })

    it('should show download notification during report generation', async () => {
      AuditService.generateAuditReport.mockResolvedValue({
        data: new Blob(),
        headers: { 'content-disposition': 'attachment; filename="report.docx"' }
      })
      const wrapper = await createWrapper()
      await flushPromises()

      const mockLink = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') return mockLink
        return document.createElement(tagName)
      })
      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:url')

      try {
        wrapper.vm.generateReport()

        expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Generating the Report',
          timeout: 0
        }))
      } finally {
        createElementSpy.mockRestore()
        appendChildSpy.mockRestore()
        createObjectURLSpy.mockRestore()
      }
    })
  })

  describe('Menu Section Detection', () => {
    it('should return general menu when on general route', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      // Navigate router to general route
      await router.push('/audits/audit-123/general')
      await flushPromises()

      const section = wrapper.vm.getMenuSection()

      expect(section.menu).toBe('general')
      expect(section.room).toBe('audit-123')
    })

    it('should return network menu when on network route', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      await router.push('/audits/audit-123/network')
      await flushPromises()

      const section = wrapper.vm.getMenuSection()

      expect(section.menu).toBe('network')
    })

    it('should return editFinding menu with finding ID when on finding route', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      await router.push('/audits/audit-123/findings/f1')
      await flushPromises()

      const section = wrapper.vm.getMenuSection()

      expect(section.menu).toBe('editFinding')
      expect(section.finding).toBe('f1')
    })

    it('should return editSection menu with section ID when on section route', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      await router.push('/audits/audit-123/sections/s1')
      await flushPromises()

      const section = wrapper.vm.getMenuSection()

      expect(section.menu).toBe('editSection')
      expect(section.section).toBe('s1')
    })

    it('should return undefined menu when on unknown route', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      // Navigate to a route not handled by getMenuSection
      await router.push('/403')
      await flushPromises()

      const section = wrapper.vm.getMenuSection()

      expect(section.menu).toBe('undefined')
    })
  })

  describe('Comment Mode Watch', () => {
    it('should reset comment-related variables when commentMode is disabled', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.commentMode = true
      wrapper.vm.fieldHighlighted = 'some-field'
      wrapper.vm.focusedComment = 'c1'
      wrapper.vm.editComment = { _id: 'c1' }
      wrapper.vm.editReply = { _id: 'r1' }
      wrapper.vm.commentsFilter = 'active'

      await wrapper.vm.$nextTick()

      wrapper.vm.commentMode = false
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.fieldHighlighted).toBe('')
      expect(wrapper.vm.focusedComment).toBeNull()
      expect(wrapper.vm.editComment).toBeNull()
      expect(wrapper.vm.editReply).toBeNull()
      expect(wrapper.vm.commentsFilter).toBe('all')
    })
  })

  describe('Data Properties', () => {
    it('should have correct initial data properties', async () => {
      const wrapper = await createWrapper()

      expect(wrapper.vm.auditId).toBeDefined()
      expect(wrapper.vm.findings).toEqual([])
      expect(wrapper.vm.users).toEqual([])
      expect(wrapper.vm.splitterRatio).toBe(80)
      expect(wrapper.vm.loading).toBe(true)
      expect(Array.isArray(wrapper.vm.vulnCategories)).toBe(true)
      expect(Array.isArray(wrapper.vm.customFields)).toBe(true)
      expect(Array.isArray(wrapper.vm.auditTypes)).toBe(true)
      expect(wrapper.vm.children).toEqual([])
      expect(wrapper.vm.commentsFilter).toBe('all')
    })

    it('should have AUDIT_VIEW_STATE constants available', async () => {
      const wrapper = await createWrapper()

      expect(wrapper.vm.AUDIT_VIEW_STATE).toBeDefined()
      expect(wrapper.vm.AUDIT_VIEW_STATE.EDIT).toBe(0)
      expect(wrapper.vm.AUDIT_VIEW_STATE.EDIT_READONLY).toBe(1)
      expect(wrapper.vm.AUDIT_VIEW_STATE.REVIEW).toBe(2)
    })
  })

  describe('Finding List Watcher', () => {
    it('should group findings by category', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.findings = [
        { _id: 'f1', title: 'XSS', category: 'Web' },
        { _id: 'f2', title: 'SQLi', category: 'Web' },
        { _id: 'f3', title: 'Misconfiguration', category: 'Infrastructure' }
      ]

      await wrapper.vm.$nextTick()

      expect(wrapper.vm.findingList.length).toBe(2)
      const webCategory = wrapper.vm.findingList.find(f => f.category === 'Web')
      expect(webCategory).toBeDefined()
      expect(webCategory.findings).toHaveLength(2)
    })

    it('should label uncategorized findings as No Category', async () => {
      const wrapper = await createWrapper()
      await flushPromises()

      wrapper.vm.audit.findings = [
        { _id: 'f1', title: 'Test Finding' }
      ]

      await wrapper.vm.$nextTick()

      const noCategory = wrapper.vm.findingList.find(f => f.category === 'No Category')
      expect(noCategory).toBeDefined()
    })
  })
})
