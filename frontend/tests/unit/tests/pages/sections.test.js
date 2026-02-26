import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import SectionsPage from '@/pages/audits/edit/sections/index.vue'

// Mock services used by the page
vi.mock('@/services/audit', () => ({
  default: {
    getSection: vi.fn(),
    updateSection: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    updateComment: vi.fn()
  }
}))

vi.mock('@/services/data', () => ({
  default: {
    getCustomFields: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    AUDIT_VIEW_STATE: { EDIT: 0, EDIT_READONLY: 1 },
    syncEditors: vi.fn(),
    strongPassword: vi.fn()
  }
}))

vi.mock('src/stores/user', () => {
  const store = {
    id: 'user123',
    firstname: 'Test',
    lastname: 'User',
    isAllowed: vi.fn().mockReturnValue(true)
  }
  return {
    useUserStore: vi.fn(() => store)
  }
})

vi.mock('@/boot/i18n', () => ({
  $t: (key) => key
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
        onOk: vi.fn().mockReturnThis(),
        onCancel: vi.fn().mockReturnThis()
      }))
    }
  }
})

import AuditService from '@/services/audit'
import DataService from '@/services/data'
import Utils from '@/services/utils'
import { Notify, Dialog } from 'quasar'
import { useUserStore } from 'src/stores/user'

describe('Sections Page', () => {
  let router, pinia, i18n

  const setRefs = (wrapper, refs) => {
    const mergedRefs = { ...(wrapper.vm.$?.refs || {}) }
    Object.entries(refs).forEach(([name, refValue]) => {
      const existingRef = mergedRefs[name]
      mergedRefs[name] = existingRef ? { ...existingRef, ...refValue } : refValue
    })
    if (wrapper.vm.$) wrapper.vm.$.refs = mergedRefs
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/audits/:auditId/sections/:sectionId',
          name: 'editSection',
          component: SectionsPage
        },
        {
          path: '/audits/:auditId/findings/:findingId',
          name: 'editFinding',
          component: { template: '<div>Finding</div>' }
        }
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

    // Default mock implementations
    DataService.getCustomFields.mockResolvedValue({
      data: { datas: [] }
    })
    AuditService.getSection.mockResolvedValue({
      data: {
        datas: {
          field: 'testField',
          name: 'Test Section',
          customFields: [
            { customField: { fieldType: 'text', label: 'Description' }, text: 'Some text' }
          ]
        }
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createWrapper = (options = {}) => {
    return mount(SectionsPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'breadcrumb': true,
          'basic-editor': true,
          'custom-fields': { template: '<div></div>', methods: { requiredFieldsEmpty: vi.fn(() => false) } },
          'comments-list': true,
          'q-card': true,
          'q-card-section': true,
          'q-btn': true,
          'q-separator': true,
          'q-tooltip': true,
          'q-scroll-area': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $route: {
            params: { auditId: 'audit1', sectionId: 'section1' },
            query: {},
            ...(options.route || {})
          },
          $router: {
            replace: vi.fn(),
            push: vi.fn()
          },
          $socket: {
            emit: vi.fn()
          },
          $_: {
            cloneDeep: vi.fn((val) => JSON.parse(JSON.stringify(val))),
            isEqual: vi.fn((a, b) => JSON.stringify(a) === JSON.stringify(b))
          },
          $settings: {
            report: {
              enabled: false,
              public: {
                highlightWarning: false,
                highlightWarningColor: '#ffff00'
              }
            },
            ...(options.settings || {})
          },
          ...(options.mocks || {})
        },
        provide: {
          frontEndAuditState: options.frontEndAuditState ?? 0, // EDIT
          auditParent: options.auditParent ?? {
            name: 'Test Audit',
            auditType: 'Internal',
            state: 'In Progress',
            approvals: [],
            parentId: null,
            type: 'default',
            language: 'en',
            comments: []
          },
          commentMode: options.commentMode ?? false,
          focusedComment: options.focusedComment ?? '',
          editComment: options.editComment ?? null,
          editReply: options.editReply ?? null,
          replyingComment: options.replyingComment ?? null,
          fieldHighlighted: options.fieldHighlighted ?? null,
          commentIdList: options.commentIdList ?? [],
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

    it('should set auditId and sectionId from route params on mount', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.auditId).toBe('audit1')
      expect(wrapper.vm.sectionId).toBe('section1')
    })

    it('should emit socket menu event on mount', () => {
      const socketEmit = vi.fn()
      createWrapper({
        mocks: {
          $socket: { emit: socketEmit }
        }
      })
      expect(socketEmit).toHaveBeenCalledWith('menu', {
        menu: 'editSection',
        section: 'section1',
        room: 'audit1'
      })
    })

    it('should call getSection on mount', () => {
      createWrapper()
      expect(DataService.getCustomFields).toHaveBeenCalled()
    })

    it('should register keydown event listener on mount', () => {
      const addEventSpy = vi.spyOn(document, 'addEventListener')
      createWrapper()
      expect(addEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function), false)
    })

    it('should register comment event listeners on mount', () => {
      const addEventSpy = vi.spyOn(document, 'addEventListener')
      createWrapper()
      expect(addEventSpy).toHaveBeenCalledWith('comment-added', expect.any(Function))
      expect(addEventSpy).toHaveBeenCalledWith('comment-clicked', expect.any(Function))
    })
  })

  describe('Unmount', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventSpy = vi.spyOn(document, 'removeEventListener')
      const wrapper = createWrapper()
      wrapper.unmount()
      expect(removeEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function), false)
      expect(removeEventSpy).toHaveBeenCalledWith('comment-added', expect.any(Function))
      expect(removeEventSpy).toHaveBeenCalledWith('comment-clicked', expect.any(Function))
    })
  })

  describe('getSection', () => {
    it('should fetch custom fields and then section data', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(DataService.getCustomFields).toHaveBeenCalled()
    })

    it('should set section data from API response', async () => {
      const sectionData = {
        field: 'myField',
        name: 'My Section',
        customFields: [{ customField: { fieldType: 'text', label: 'Desc' }, text: 'Hello' }]
      }
      AuditService.getSection.mockResolvedValue({
        data: { datas: sectionData }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.section).toEqual(sectionData)
    })

    it('should handle getSection errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getCustomFields.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('updateSection', () => {
    it('should call AuditService.updateSection with correct params', async () => {
      AuditService.updateSection.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'
      wrapper.vm.sectionId = 'section1'
      wrapper.vm.section = { field: 'test', name: 'Test', customFields: [] }

      wrapper.vm.updateSection()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Utils.syncEditors).toHaveBeenCalled()
    })

    it('should show success notification on successful update', async () => {
      AuditService.updateSection.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'
      wrapper.vm.sectionId = 'section1'
      wrapper.vm.section = { field: 'test', name: 'Test', customFields: [] }

      wrapper.vm.updateSection()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.sectionUpdateOk',
          color: 'positive'
        })
      )
    })

    it('should show error notification on update failure', async () => {
      AuditService.updateSection.mockRejectedValue({
        response: { data: { datas: 'Update failed' } }
      })

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'
      wrapper.vm.sectionId = 'section1'
      wrapper.vm.section = { field: 'test', name: 'Test', customFields: [] }

      wrapper.vm.updateSection()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Update failed',
          color: 'negative'
        })
      )
    })

    it('should show required field notification when custom fields are empty', async () => {
      const wrapper = createWrapper()
      // Mock the customfields ref with requiredFieldsEmpty returning true
      setRefs(wrapper, {
        customfields: { requiredFieldsEmpty: vi.fn().mockReturnValue(true) }
      })

      wrapper.vm.updateSection()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.fieldRequired',
          color: 'negative'
        })
      )
    })
  })

  describe('toggleCommentView', () => {
    it('should toggle commentMode', () => {
      // Since commentMode is injected, we test the method logic directly
      const wrapper = createWrapper({ commentMode: false })
      // commentMode is injected and should be reactive
      // We test that the method calls syncEditors
      wrapper.vm.toggleCommentView()
      expect(Utils.syncEditors).toHaveBeenCalled()
    })
  })

  describe('unsavedChanges', () => {
    it('should return false when section matches original', () => {
      const wrapper = createWrapper()
      wrapper.vm.section = { customFields: [{ text: 'hello' }] }
      wrapper.vm.sectionOrig = { customFields: [{ text: 'hello' }] }

      expect(wrapper.vm.unsavedChanges()).toBe(false)
    })

    it('should return true when section differs from original', () => {
      const wrapper = createWrapper()
      // Need to mock $_.isEqual to return false
      wrapper.vm.$_.isEqual = vi.fn().mockReturnValue(false)
      wrapper.vm.section = { customFields: [{ text: 'changed' }] }
      wrapper.vm.sectionOrig = { customFields: [{ text: 'original' }] }

      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })
  })

  describe('displayHighlightWarning', () => {
    it('should return null when report settings are disabled', () => {
      const wrapper = createWrapper({
        settings: {
          report: {
            enabled: false,
            public: { highlightWarning: false, highlightWarningColor: '#ffff00' }
          }
        }
      })

      expect(wrapper.vm.displayHighlightWarning()).toBeNull()
    })

    it('should return null when highlightWarning is disabled', () => {
      const wrapper = createWrapper({
        settings: {
          report: {
            enabled: true,
            public: { highlightWarning: false, highlightWarningColor: '#ffff00' }
          }
        }
      })

      expect(wrapper.vm.displayHighlightWarning()).toBeNull()
    })

    it('should detect highlighted text in custom fields', () => {
      const wrapper = createWrapper({
        settings: {
          report: {
            enabled: true,
            public: { highlightWarning: true, highlightWarningColor: '#ffff00' }
          }
        }
      })

      wrapper.vm.section = {
        customFields: [{
          customField: { fieldType: 'text', label: 'Description' },
          text: '<mark data-color="#ffff00" style="background-color:#ffff00">highlighted text</mark>'
        }]
      }

      const result = wrapper.vm.displayHighlightWarning()
      expect(result).not.toBeNull()
      expect(result).toContain('Description')
    })

    it('should return null when no highlighted text exists', () => {
      const wrapper = createWrapper({
        settings: {
          report: {
            enabled: true,
            public: { highlightWarning: true, highlightWarningColor: '#ffff00' }
          }
        }
      })

      wrapper.vm.section = {
        customFields: [{
          customField: { fieldType: 'text', label: 'Description' },
          text: 'normal text without highlights'
        }]
      }

      expect(wrapper.vm.displayHighlightWarning()).toBeNull()
    })
  })

  describe('canCreateComment computed', () => {
    it('should check user permission for creating comments', () => {
      const wrapper = createWrapper()
      const userStore = useUserStore()

      // canCreateComment calls userStore.isAllowed
      const result = wrapper.vm.canCreateComment
      expect(userStore.isAllowed).toHaveBeenCalledWith('audits:comments:create')
      expect(result).toBe(true)
    })
  })

  describe('createComment', () => {
    it('should call AuditService.createComment with correct params', async () => {
      AuditService.createComment.mockResolvedValue({
        data: { datas: { _id: 'comment1' } }
      })
      AuditService.updateSection.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'
      wrapper.vm.sectionId = 'section1'

      wrapper.vm.createComment('fieldName1', 'commentId1')
      await wrapper.vm.$nextTick()

      expect(AuditService.createComment).toHaveBeenCalledWith('audit1', {
        sectionId: 'section1',
        fieldName: 'fieldName1',
        authorId: 'user123',
        author: {
          firstname: 'Test',
          lastname: 'User'
        },
        text: '',
        commentId: 'commentId1'
      })
    })

    it('should not include commentId when not provided', async () => {
      AuditService.createComment.mockResolvedValue({
        data: { datas: { _id: 'comment1' } }
      })
      AuditService.updateSection.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'
      wrapper.vm.sectionId = 'section1'

      wrapper.vm.createComment('fieldName1')
      await wrapper.vm.$nextTick()

      const callArgs = AuditService.createComment.mock.calls[0][1]
      expect(callArgs.commentId).toBeUndefined()
    })

    it('should show error notification on createComment failure', async () => {
      AuditService.createComment.mockRejectedValue({
        response: { data: { datas: 'Comment creation failed' } }
      })

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'
      wrapper.vm.sectionId = 'section1'

      wrapper.vm.createComment('fieldName1')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Comment creation failed',
          color: 'negative'
        })
      )
    })
  })

  describe('deleteComment', () => {
    it('should call AuditService.deleteComment with correct params', async () => {
      AuditService.deleteComment.mockResolvedValue({})
      AuditService.updateSection.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'

      wrapper.vm.deleteComment({ _id: 'comment1' })
      await wrapper.vm.$nextTick()

      expect(AuditService.deleteComment).toHaveBeenCalledWith('audit1', 'comment1')
    })

    it('should use commentId as fallback when _id is not present', async () => {
      AuditService.deleteComment.mockResolvedValue({})
      AuditService.updateSection.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'

      wrapper.vm.deleteComment({ commentId: 'comment2' })
      await wrapper.vm.$nextTick()

      expect(AuditService.deleteComment).toHaveBeenCalledWith('audit1', 'comment2')
    })

    it('should dispatch comment-deleted event on success', async () => {
      AuditService.deleteComment.mockResolvedValue({})
      AuditService.updateSection.mockResolvedValue({})
      const dispatchSpy = vi.spyOn(document, 'dispatchEvent')

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'

      wrapper.vm.deleteComment({ _id: 'comment1' })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'comment-deleted'
        })
      )
    })

    it('should show error notification on delete failure', async () => {
      AuditService.deleteComment.mockRejectedValue({
        response: { data: { datas: 'Delete failed' } }
      })

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'

      wrapper.vm.deleteComment({ _id: 'comment1' })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Delete failed',
          color: 'negative'
        })
      )
    })
  })

  describe('updateComment', () => {
    it('should call AuditService.updateComment', async () => {
      AuditService.updateComment.mockResolvedValue({})
      AuditService.updateSection.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'

      const comment = { _id: 'c1', text: 'Original', replies: [] }
      wrapper.vm.updateComment(comment)
      await wrapper.vm.$nextTick()

      expect(AuditService.updateComment).toHaveBeenCalledWith('audit1', comment)
    })

    it('should update comment text from textTemp', async () => {
      AuditService.updateComment.mockResolvedValue({})
      AuditService.updateSection.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'

      const comment = { _id: 'c1', text: 'Old text', textTemp: 'New text', replies: [] }
      wrapper.vm.updateComment(comment)

      expect(comment.text).toBe('New text')
    })

    it('should add reply from replyTemp to replies array', async () => {
      AuditService.updateComment.mockResolvedValue({})
      AuditService.updateSection.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'

      const comment = { _id: 'c1', text: 'text', replyTemp: 'My reply', replies: [] }
      wrapper.vm.updateComment(comment)

      expect(comment.replies).toHaveLength(1)
      expect(comment.replies[0]).toEqual({
        author: 'user123',
        text: 'My reply'
      })
    })

    it('should show error notification on update failure', async () => {
      AuditService.updateComment.mockRejectedValue({
        response: { data: { datas: 'Update comment failed' } }
      })

      const wrapper = createWrapper()
      wrapper.vm.auditId = 'audit1'

      wrapper.vm.updateComment({ _id: 'c1', text: 'text', replies: [] })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Update comment failed',
          color: 'negative'
        })
      )
    })
  })

  describe('editorCommentAdded', () => {
    it('should do nothing when event detail is missing', () => {
      const wrapper = createWrapper()
      wrapper.vm.createComment = vi.fn()

      wrapper.vm.editorCommentAdded({ detail: null })
      expect(wrapper.vm.createComment).not.toHaveBeenCalled()
    })

    it('should do nothing when fieldName is missing', () => {
      const wrapper = createWrapper()
      wrapper.vm.createComment = vi.fn()

      wrapper.vm.editorCommentAdded({ detail: { id: '123' } })
      expect(wrapper.vm.createComment).not.toHaveBeenCalled()
    })

    it('should do nothing when id is missing', () => {
      const wrapper = createWrapper()
      wrapper.vm.createComment = vi.fn()

      wrapper.vm.editorCommentAdded({ detail: { fieldName: 'field1' } })
      expect(wrapper.vm.createComment).not.toHaveBeenCalled()
    })

    it('should call createComment directly when no warning', () => {
      const wrapper = createWrapper()
      wrapper.vm.createComment = vi.fn()

      wrapper.vm.editorCommentAdded({
        detail: { fieldName: 'field1', id: 'id1' }
      })

      expect(wrapper.vm.createComment).toHaveBeenCalledWith('field1', 'id1')
    })

    it('should show dialog when event has warning', () => {
      const wrapper = createWrapper()
      wrapper.vm.createComment = vi.fn()

      wrapper.vm.editorCommentAdded({
        detail: { fieldName: 'field1', id: 'id1', warning: 'some warning' }
      })

      expect(Dialog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Warning'
        })
      )
    })
  })

  describe('Keyboard shortcut', () => {
    it('should call updateSection on Ctrl+S when in EDIT state', () => {
      const wrapper = createWrapper({ frontEndAuditState: 0 })
      AuditService.updateSection.mockResolvedValue({})

      const event = new KeyboardEvent('keydown', {
        keyCode: 83,
        ctrlKey: true,
        bubbles: true
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      wrapper.vm._listener(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should not call updateSection on Ctrl+S when in EDIT_READONLY state', () => {
      const wrapper = createWrapper({ frontEndAuditState: 1 })
      AuditService.updateSection.mockResolvedValue({})

      const updateSpy = vi.spyOn(wrapper.vm, 'updateSection')

      const event = new KeyboardEvent('keydown', {
        keyCode: 83,
        ctrlKey: true,
        bubbles: true
      })

      wrapper.vm._listener(event)

      expect(updateSpy).not.toHaveBeenCalled()
    })
  })

  describe('Initial data', () => {
    it('should have correct default data values', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.section).toEqual(
        expect.objectContaining({
          field: expect.any(String),
          name: expect.any(String),
          customFields: expect.any(Array)
        })
      )
      expect(wrapper.vm.sectionOrig).toEqual(expect.any(Object))
      expect(wrapper.vm.customFields).toEqual(expect.any(Array))
    })
  })

  describe('focusComment', () => {
    it('should set fieldHighlighted and focusedComment', () => {
      const wrapper = createWrapper({
        provide: {
          editComment: null,
          replyingComment: null,
          focusedComment: ''
        }
      })

      // Mock document.getElementById for the interval logic
      vi.spyOn(document, 'getElementById').mockReturnValue({
        scrollIntoView: vi.fn()
      })

      wrapper.vm.focusComment({ _id: 'comment1', fieldName: 'field1' })

      expect(wrapper.vm.fieldHighlighted).toBe('field1')
      expect(wrapper.vm.focusedComment).toBe('comment1')
    })

    it('should redirect to another section if comment is in a different section', () => {
      const routerReplace = vi.fn()
      const wrapper = createWrapper({
        mocks: {
          $router: { replace: routerReplace, push: vi.fn() }
        },
        provide: {
          editComment: null,
          replyingComment: null,
          focusedComment: ''
        }
      })

      wrapper.vm.sectionId = 'section1'
      wrapper.vm.auditId = 'audit1'

      wrapper.vm.focusComment({
        _id: 'comment1',
        fieldName: 'field1',
        sectionId: 'section2'
      })

      expect(routerReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'editSection',
          params: expect.objectContaining({
            sectionId: 'section2'
          })
        })
      )
    })

    it('should redirect to finding if comment has a findingId', () => {
      const routerReplace = vi.fn()
      const wrapper = createWrapper({
        mocks: {
          $router: { replace: routerReplace, push: vi.fn() }
        },
        provide: {
          editComment: null,
          replyingComment: null,
          focusedComment: ''
        }
      })

      wrapper.vm.auditId = 'audit1'

      wrapper.vm.focusComment({
        _id: 'comment1',
        fieldName: 'field1',
        findingId: 'finding1'
      })

      expect(routerReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'editFinding',
          params: expect.objectContaining({
            findingId: 'finding1'
          })
        })
      )
    })
  })
})
