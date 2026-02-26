import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import FindingsEdit from '@/pages/audits/edit/findings/edit/index.vue'

// Mock services
vi.mock('@/services/audit', () => ({
  default: {
    getFinding: vi.fn(),
    updateFinding: vi.fn(),
    deleteFinding: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    updateComment: vi.fn()
  }
}))

vi.mock('@/services/data', () => ({
  default: {
    getVulnerabilityTypes: vi.fn()
  }
}))

vi.mock('@/services/vulnerability', () => ({
  default: {
    backupFinding: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    syncEditors: vi.fn(),
    filterCustomFields: vi.fn(() => []),
    AUDIT_VIEW_STATE: { EDIT: 'edit', REVIEW: 'review', APPROVED: 'approved' }
  }
}))

vi.mock('@/boot/i18n', () => ({
  $t: (key) => key
}))

vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => ({
    id: 'user1',
    firstname: 'Test',
    lastname: 'User',
    isAllowed: vi.fn(() => true)
  }))
}))

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
          // Store callback for later testing
          Dialog._lastOnOk = cb
          return { onCancel: vi.fn() }
        }),
        onCancel: vi.fn()
      }))
    }
  }
})

import AuditService from '@/services/audit'
import DataService from '@/services/data'
import VulnService from '@/services/vulnerability'
import Utils from '@/services/utils'
import { Notify, Dialog } from 'quasar'

describe('Findings Edit Page', () => {
  let router, pinia, i18n

  const mockFinding = {
    _id: 'finding1',
    title: 'Test Finding',
    vulnType: 'Injection',
    description: '<p>Description</p>',
    observation: '<p>Observation</p>',
    remediation: '<p>Remediation</p>',
    remediationComplexity: 2,
    priority: 3,
    references: ['ref1', 'ref2'],
    cvssv3: 'CVSS:3.1/AV:N',
    cvssv4: '',
    category: 'Web',
    scope: '<p>scope</p>',
    poc: '<p>poc</p>',
    status: 1,
    customFields: [],
    paragraphs: [],
    retestStatus: '',
    retestDescription: ''
  }

  const mockVulnTypes = [
    { name: 'Injection', locale: 'en' },
    { name: 'XSS', locale: 'en' },
    { name: 'Injection', locale: 'fr' }
  ]

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/audits/:auditId/findings/:findingId', component: FindingsEdit, name: 'editFinding' },
        { path: '/audits/:auditId/findings/add', component: { template: '<div />' }, name: 'addFindings' },
        { path: '/403', component: { template: '<div />' }, name: '403' },
        { path: '/404', component: { template: '<div />' }, name: '404' }
      ]
    })

    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: { 'en-US': {} }
    })

    vi.clearAllMocks()

    // Default mock responses
    AuditService.getFinding.mockResolvedValue({ data: { datas: { ...mockFinding } } })
    DataService.getVulnerabilityTypes.mockResolvedValue({ data: { datas: mockVulnTypes } })
  })

  const createWrapper = (options = {}) => {
    return mount(FindingsEdit, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          breadcrumb: true,
          'basic-editor': true,
          'cvss3-calculator': true,
          'cvss4-calculator': true,
          'textarea-array': true,
          'custom-fields': true,
          'comments-list': true,
          'q-tabs': true,
          'q-tab': true,
          'q-tab-panels': true,
          'q-tab-panel': true,
          'q-card': true,
          'q-card-section': true,
          'q-input': true,
          'q-select': true,
          'q-field': true,
          'q-btn': true,
          'q-toggle': true,
          'q-separator': true,
          'q-space': true,
          'q-badge': true,
          'q-icon': true,
          'q-tooltip': true,
          'q-expansion-item': true,
          'q-splitter': true,
          'q-radio': true,
          'q-scroll-area': true,
          'q-page': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $route: {
            params: { auditId: 'audit123', findingId: 'finding1' },
            query: {}
          },
          $router: {
            push: vi.fn(),
            replace: vi.fn()
          },
          $socket: {
            emit: vi.fn()
          },
          $_: {
            cloneDeep: (obj) => JSON.parse(JSON.stringify(obj)),
            isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b)
          },
          $settings: {
            report: {
              enabled: false,
              public: {
                scoringMethods: { CVSS3: true, CVSS4: false },
                requiredFields: {},
                highlightWarning: false,
                highlightWarningColor: '#ffff00'
              }
            }
          },
          ...(options.mocks || {})
        },
        provide: {
          frontEndAuditState: options.frontEndAuditState || 'edit',
          auditParent: {
            name: 'Test Audit',
            language: 'en',
            auditType: 'default',
            state: 'In Progress',
            approvals: [],
            type: 'default',
            parentId: null,
            findings: [{ _id: 'finding1' }, { _id: 'finding2' }],
            comments: [],
            ...(options.auditParent || {})
          },
          retestSplitView: false,
          retestSplitRatio: 100,
          retestSplitLimits: [100, 100],
          commentMode: false,
          focusedComment: '',
          editComment: null,
          editReply: null,
          replyingComment: null,
          fieldHighlighted: null,
          commentIdList: [],
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

    it('should set auditId and findingId from route params', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.auditId).toBe('audit123')
      expect(wrapper.vm.findingId).toBe('finding1')
    })

    it('should fetch finding on mount', () => {
      createWrapper()
      expect(AuditService.getFinding).toHaveBeenCalledWith('audit123', 'finding1')
    })

    it('should fetch vulnerability types on mount', () => {
      createWrapper()
      expect(DataService.getVulnerabilityTypes).toHaveBeenCalled()
    })

    it('should emit socket menu event on mount', () => {
      const mockEmit = vi.fn()
      createWrapper({
        mocks: {
          $socket: { emit: mockEmit }
        }
      })
      expect(mockEmit).toHaveBeenCalledWith('menu', {
        menu: 'editFinding',
        finding: 'finding1',
        room: 'audit123'
      })
    })

    it('should add keydown event listener on mount', () => {
      const addEventSpy = vi.spyOn(document, 'addEventListener')
      createWrapper()
      expect(addEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function), false)
      addEventSpy.mockRestore()
    })

    it('should add comment event listeners on mount', () => {
      const addEventSpy = vi.spyOn(document, 'addEventListener')
      createWrapper()
      expect(addEventSpy).toHaveBeenCalledWith('comment-added', expect.any(Function))
      expect(addEventSpy).toHaveBeenCalledWith('comment-clicked', expect.any(Function))
      addEventSpy.mockRestore()
    })

    it('should have default selectedTab as definition', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.selectedTab).toBe('definition')
    })
  })

  describe('Data Fetching', () => {
    it('should populate finding after getFinding resolves', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.finding.title).toBe('Test Finding')
      expect(wrapper.vm.finding.vulnType).toBe('Injection')
    })

    it('should populate vulnTypes after getVulnTypes resolves', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.vulnTypes).toEqual(mockVulnTypes)
    })

    it('should handle getFinding error with 403 status', async () => {
      const mockPush = vi.fn()
      AuditService.getFinding.mockRejectedValue({
        response: { status: 403, data: { datas: 'Forbidden' } }
      })

      const wrapper = createWrapper({
        mocks: {
          $router: { push: mockPush, replace: vi.fn() }
        }
      })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockPush).toHaveBeenCalledWith({
        name: '403',
        query: { error: 'Forbidden' }
      })
    })

    it('should handle getFinding error with 404 status', async () => {
      const mockPush = vi.fn()
      AuditService.getFinding.mockRejectedValue({
        response: { status: 404, data: { datas: 'Not Found' } }
      })

      const wrapper = createWrapper({
        mocks: {
          $router: { push: mockPush, replace: vi.fn() }
        }
      })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(mockPush).toHaveBeenCalledWith({
        name: '404',
        query: { error: 'Not Found' }
      })
    })

    it('should handle getFinding error without response gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      AuditService.getFinding.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should log to console when no response
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle getVulnTypes error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getVulnerabilityTypes.mockRejectedValue(new Error('Error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Computed Properties', () => {
    it('should filter vulnTypes by audit language', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      const filtered = wrapper.vm.vulnTypesLang
      expect(filtered).toHaveLength(2)
      expect(filtered.every(t => t.locale === 'en')).toBe(true)
    })

    it('should compute canCreateComment based on user permissions', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.canCreateComment).toBe(true)
    })
  })

  describe('convertParagraphsToHTML', () => {
    it('should convert paragraphs with text only', () => {
      const wrapper = createWrapper()
      const result = wrapper.vm.convertParagraphsToHTML([
        { text: 'Hello', images: [] },
        { text: 'World', images: [] }
      ])
      expect(result).toBe('<p>Hello</p><p>World</p>')
    })

    it('should convert paragraphs with images', () => {
      const wrapper = createWrapper()
      const result = wrapper.vm.convertParagraphsToHTML([
        {
          text: 'Screenshot',
          images: [
            { image: 'data:image/png;base64,abc', caption: 'Screenshot 1' }
          ]
        }
      ])
      expect(result).toBe('<p>Screenshot</p><img src="data:image/png;base64,abc" alt="Screenshot 1" />')
    })

    it('should return empty string for empty paragraphs', () => {
      const wrapper = createWrapper()
      const result = wrapper.vm.convertParagraphsToHTML([])
      expect(result).toBe('')
    })
  })

  describe('unsavedChanges', () => {
    it('should return false when no changes made', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Set findingOrig to match finding
      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))

      expect(wrapper.vm.unsavedChanges()).toBe(false)
    })

    it('should return true when title is changed', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.finding.title = 'Changed Title'

      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })

    it('should return true when description is changed', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.finding.description = '<p>New Description</p>'

      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })

    it('should return true when vulnType is changed', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.finding.vulnType = 'XSS'

      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })

    it('should return true when references are changed', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.finding.references = ['ref1', 'ref2', 'ref3']

      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })

    it('should return false when overrideLeaveCheck is true', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.finding.title = 'Changed'
      wrapper.vm.overrideLeaveCheck = true

      expect(wrapper.vm.unsavedChanges()).toBe(false)
    })

    it('should return true when observation is changed', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.finding.observation = '<p>New Observation</p>'

      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })

    it('should return true when poc is changed', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.finding.poc = '<p>New POC</p>'

      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })

    it('should return true when remediation is changed', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.finding.remediation = '<p>New Remediation</p>'

      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })

    it('should return true when retestStatus is changed', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.finding.retestStatus = 'ok'

      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })

    it('should return true when status is changed', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.finding.status = 0

      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })
  })

  describe('backupFinding', () => {
    it('should call VulnService.backupFinding with correct parameters', async () => {
      VulnService.backupFinding.mockResolvedValue({ data: { datas: 'Backup successful' } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.backupFinding()

      expect(Utils.syncEditors).toHaveBeenCalled()
      expect(VulnService.backupFinding).toHaveBeenCalledWith('en', wrapper.vm.finding)
    })

    it('should show success notification on backup success', async () => {
      VulnService.backupFinding.mockResolvedValue({ data: { datas: 'Backup successful' } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.backupFinding()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Backup successful',
        color: 'positive'
      }))
    })

    it('should show error notification on backup failure', async () => {
      VulnService.backupFinding.mockRejectedValue({
        response: { data: { datas: 'Backup failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.backupFinding()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Backup failed',
        color: 'negative'
      }))
    })
  })

  describe('deleteFinding', () => {
    it('should show confirmation dialog', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteFinding()

      expect(Dialog.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'msg.deleteFindingConfirm',
        message: 'msg.deleteFindingNotice'
      }))
    })
  })

  describe('updateFinding', () => {
    it('should call syncEditors before updating', async () => {
      AuditService.updateFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.updateFinding()

      expect(Utils.syncEditors).toHaveBeenCalled()
    })
  })

  describe('toggleSplitView', () => {
    it('should toggle retestSplitView', () => {
      const wrapper = createWrapper()

      wrapper.vm.retestSplitView = false
      wrapper.vm.toggleSplitView()

      expect(wrapper.vm.retestSplitView).toBe(true)
      expect(wrapper.vm.retestSplitRatio).toBe(50)
      expect(wrapper.vm.retestSplitLimits).toEqual([40, 60])
    })

    it('should reset split view when toggling off', () => {
      const wrapper = createWrapper()

      wrapper.vm.retestSplitView = true
      wrapper.vm.toggleSplitView()

      expect(wrapper.vm.retestSplitView).toBe(false)
      expect(wrapper.vm.retestSplitRatio).toBe(100)
      expect(wrapper.vm.retestSplitLimits).toEqual([100, 100])
    })
  })

  describe('toggleCommentView', () => {
    it('should toggle commentMode', () => {
      const wrapper = createWrapper()
      wrapper.vm.commentMode = false

      wrapper.vm.toggleCommentView()

      expect(wrapper.vm.commentMode).toBe(true)
    })

    it('should clear focusedComment and fieldHighlighted when disabling comment mode', () => {
      const wrapper = createWrapper()
      wrapper.vm.commentMode = true
      wrapper.vm.focusedComment = 'comment1'
      wrapper.vm.fieldHighlighted = 'titleField'

      wrapper.vm.toggleCommentView()

      expect(wrapper.vm.commentMode).toBe(false)
      expect(wrapper.vm.focusedComment).toBe('')
      expect(wrapper.vm.fieldHighlighted).toBeNull()
    })

    it('should call syncEditors', () => {
      const wrapper = createWrapper()
      wrapper.vm.toggleCommentView()
      expect(Utils.syncEditors).toHaveBeenCalled()
    })
  })

  describe('syncEditors', () => {
    it('should set transitionEnd to false and call Utils.syncEditors', () => {
      const wrapper = createWrapper()

      wrapper.vm.syncEditors()

      expect(wrapper.vm.transitionEnd).toBe(false)
      expect(Utils.syncEditors).toHaveBeenCalled()
    })
  })

  describe('updateOrig', () => {
    it('should set transitionEnd to true', () => {
      const wrapper = createWrapper()
      wrapper.vm.transitionEnd = false

      wrapper.vm.updateOrig()

      expect(wrapper.vm.transitionEnd).toBe(true)
    })

    it('should update findingOrig.poc when visiting proofs tab for the first time', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.selectedTab = 'proofs'
      wrapper.vm.proofsTabVisited = false
      wrapper.vm.finding.poc = '<p>Updated POC</p>'

      wrapper.vm.updateOrig()

      expect(wrapper.vm.findingOrig.poc).toBe('<p>Updated POC</p>')
      expect(wrapper.vm.proofsTabVisited).toBe(true)
    })

    it('should update findingOrig.remediation when visiting details tab for the first time', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      wrapper.vm.selectedTab = 'details'
      wrapper.vm.detailsTabVisited = false
      wrapper.vm.finding.remediation = '<p>Updated Remediation</p>'

      wrapper.vm.updateOrig()

      expect(wrapper.vm.findingOrig.remediation).toBe('<p>Updated Remediation</p>')
      expect(wrapper.vm.detailsTabVisited).toBe(true)
    })

    it('should not update findingOrig when tab was already visited', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      wrapper.vm.findingOrig = JSON.parse(JSON.stringify(wrapper.vm.finding))
      const origPoc = wrapper.vm.findingOrig.poc
      wrapper.vm.selectedTab = 'proofs'
      wrapper.vm.proofsTabVisited = true
      wrapper.vm.finding.poc = '<p>Changed</p>'

      wrapper.vm.updateOrig()

      expect(wrapper.vm.findingOrig.poc).toBe(origPoc)
    })
  })

  describe('displayHighlightWarning', () => {
    it('should return null when overrideLeaveCheck is true', () => {
      const wrapper = createWrapper()
      wrapper.vm.overrideLeaveCheck = true

      expect(wrapper.vm.displayHighlightWarning()).toBeNull()
    })

    it('should return null when report settings are not enabled', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.displayHighlightWarning()).toBeNull()
    })

    it('should return null when highlightWarning is disabled', () => {
      const wrapper = createWrapper({
        mocks: {
          $settings: {
            report: {
              enabled: true,
              public: {
                scoringMethods: { CVSS3: true, CVSS4: false },
                requiredFields: {},
                highlightWarning: false,
                highlightWarningColor: '#ffff00'
              }
            }
          }
        }
      })

      expect(wrapper.vm.displayHighlightWarning()).toBeNull()
    })
  })

  describe('createComment', () => {
    it('should call AuditService.createComment with correct data', async () => {
      AuditService.createComment.mockResolvedValue({
        data: { datas: { _id: 'newComment1' } }
      })
      AuditService.updateFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.createComment('titleField', 'commentId1')

      expect(AuditService.createComment).toHaveBeenCalledWith('audit123', {
        findingId: 'finding1',
        fieldName: 'titleField',
        authorId: 'user1',
        author: {
          firstname: 'Test',
          lastname: 'User'
        },
        text: '',
        commentId: 'commentId1'
      })
    })

    it('should create comment without commentId when not provided', async () => {
      AuditService.createComment.mockResolvedValue({
        data: { datas: { _id: 'newComment1' } }
      })
      AuditService.updateFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.createComment('titleField')

      const calledWith = AuditService.createComment.mock.calls[0][1]
      expect(calledWith.commentId).toBeUndefined()
    })

    it('should show error notification on comment creation failure', async () => {
      AuditService.createComment.mockRejectedValue({
        response: { data: { datas: 'Comment creation failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.createComment('titleField')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Comment creation failed',
        color: 'negative'
      }))
    })
  })

  describe('deleteComment', () => {
    it('should call AuditService.deleteComment', async () => {
      AuditService.deleteComment.mockResolvedValue({})
      AuditService.updateFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteComment({ _id: 'comment1' })

      expect(AuditService.deleteComment).toHaveBeenCalledWith('audit123', 'comment1')
    })

    it('should use commentId when _id is not present', async () => {
      AuditService.deleteComment.mockResolvedValue({})
      AuditService.updateFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteComment({ commentId: 'comment2' })

      expect(AuditService.deleteComment).toHaveBeenCalledWith('audit123', 'comment2')
    })

    it('should set editComment to null', async () => {
      AuditService.deleteComment.mockResolvedValue({})
      AuditService.updateFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.editComment = 'comment1'

      wrapper.vm.deleteComment({ _id: 'comment1' })

      expect(wrapper.vm.editComment).toBeNull()
    })
  })

  describe('updateComment', () => {
    it('should update comment text from textTemp', async () => {
      AuditService.updateComment.mockResolvedValue({})
      AuditService.updateFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const comment = { _id: 'comment1', text: 'old', textTemp: 'new text', replies: [] }
      wrapper.vm.updateComment(comment)

      expect(comment.text).toBe('new text')
      expect(AuditService.updateComment).toHaveBeenCalledWith('audit123', comment)
    })

    it('should add reply from replyTemp', async () => {
      AuditService.updateComment.mockResolvedValue({})
      AuditService.updateFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const comment = { _id: 'comment1', text: 'text', replyTemp: 'reply text', replies: [] }
      wrapper.vm.updateComment(comment)

      expect(comment.replies).toHaveLength(1)
      expect(comment.replies[0].text).toBe('reply text')
      expect(comment.replies[0].author).toBe('user1')
    })

    it('should show error notification on update failure', async () => {
      AuditService.updateComment.mockRejectedValue({
        response: { data: { datas: 'Update failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.updateComment({ _id: 'comment1', text: 'text', replies: [] })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Update failed',
        color: 'negative'
      }))
    })
  })

  describe('_listener', () => {
    it('should call updateFinding on Ctrl+S when in edit state', async () => {
      AuditService.updateFinding.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const event = {
        ctrlKey: true,
        metaKey: false,
        keyCode: 83,
        preventDefault: vi.fn()
      }

      wrapper.vm._listener(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(Utils.syncEditors).toHaveBeenCalled()
    })

    it('should not call updateFinding when not in edit state', async () => {
      AuditService.updateFinding.mockResolvedValue({})

      const wrapper = createWrapper({ frontEndAuditState: 'review' })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const event = {
        ctrlKey: true,
        metaKey: false,
        keyCode: 83,
        preventDefault: vi.fn()
      }

      // Reset any prior calls
      vi.clearAllMocks()

      wrapper.vm._listener(event)

      expect(event.preventDefault).toHaveBeenCalled()
      // updateFinding should not be called when not in EDIT state
      expect(AuditService.updateFinding).not.toHaveBeenCalled()
    })
  })

  describe('Initial Data', () => {
    it('should have correct default data properties', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.finding).toEqual({})
      expect(wrapper.vm.findingOrig).toEqual({})
      expect(wrapper.vm.selectedTab).toBe('definition')
      expect(wrapper.vm.proofsTabVisited).toBe(false)
      expect(wrapper.vm.detailsTabVisited).toBe(false)
      expect(wrapper.vm.overrideLeaveCheck).toBe(false)
      expect(wrapper.vm.transitionEnd).toBe(true)
    })

    it('should have comment-related default data', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.commentTemp).toBeNull()
      expect(wrapper.vm.replyTemp).toBeNull()
      expect(wrapper.vm.hoverReply).toBeNull()
    })
  })

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventSpy = vi.spyOn(document, 'removeEventListener')

      const wrapper = createWrapper()
      wrapper.unmount()

      expect(removeEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function), false)
      expect(removeEventSpy).toHaveBeenCalledWith('comment-added', expect.any(Function))
      expect(removeEventSpy).toHaveBeenCalledWith('comment-clicked', expect.any(Function))

      removeEventSpy.mockRestore()
    })
  })
})
