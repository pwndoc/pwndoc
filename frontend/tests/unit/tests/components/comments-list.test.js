import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestWrapper } from '../../test-utils'
import CommentsList from '@/components/comments-list.vue'

// Mock the user store with vi.hoisted
const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    isAllowed: vi.fn(() => true)
  }
}))

vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore)
}))

// Mock boot/i18n
vi.mock('@/boot/i18n', () => ({
  $t: vi.fn((key) => key)
}))

describe('CommentsList Component', () => {
  const mockComments = [
    {
      _id: 'comment1',
      text: 'First comment',
      resolved: false,
      author: { firstname: 'John', lastname: 'Doe' },
      replies: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    },
    {
      _id: 'comment2',
      text: 'Second comment',
      resolved: true,
      author: { firstname: 'Jane', lastname: 'Smith' },
      replies: [
        {
          _id: 'reply1',
          text: 'A reply',
          author: { firstname: 'Bob', lastname: 'Brown' },
          createdAt: '2024-01-03T00:00:00Z'
        }
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ]

  const defaultProps = {
    comments: [],
    editComment: '',
    focusedComment: '',
    editReply: '',
    selectedTab: '',
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    focusComment: vi.fn()
  }

  const mockRoute = {
    params: {
      auditId: 'audit123',
      findingId: 'finding456',
      sectionId: 'section789'
    }
  }

  const createWrapper = (overrides = {}) => {
    return createTestWrapper(CommentsList, {
      props: { ...defaultProps, ...overrides.props },
      routes: [
        { path: '/audits/:auditId/findings/:findingId/sections/:sectionId', component: CommentsList }
      ],
      global: {
        mocks: {
          $t: (key) => key,
          $route: mockRoute,
          ...(overrides.mocks || {})
        },
        stubs: {
          'q-scroll-area': { template: '<div><slot /></div>' },
          ...(overrides.stubs || {})
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.isAllowed.mockImplementation(() => true)
  })

  it('should render', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('should display comments text', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('comments')
  })

  describe('props', () => {
    it('should accept comments array', () => {
      const wrapper = createWrapper({
        props: { comments: mockComments }
      })
      expect(wrapper.props('comments')).toEqual(mockComments)
    })

    it('should have default empty comments', () => {
      const wrapper = createTestWrapper(CommentsList, {
        global: {
          mocks: {
            $t: (key) => key,
            $route: mockRoute
          },
          stubs: {
            'q-scroll-area': { template: '<div><slot /></div>' }
          }
        }
      })
      expect(wrapper.props('comments')).toEqual([])
    })
  })

  describe('computed: numberOfFilteredComments', () => {
    it('should show total count when filter is all', () => {
      const wrapper = createWrapper({
        props: { comments: mockComments }
      })
      // Default filter is 'all', 2 comments
      expect(wrapper.vm.numberOfFilteredComments).toContain('2')
      expect(wrapper.vm.numberOfFilteredComments).toContain('items')
    })

    it('should show singular item for single comment', () => {
      const wrapper = createWrapper({
        props: { comments: [mockComments[0]] }
      })
      expect(wrapper.vm.numberOfFilteredComments).toContain('1')
      expect(wrapper.vm.numberOfFilteredComments).toContain('item')
    })

    it('should filter active comments only', async () => {
      const wrapper = createWrapper({
        props: { comments: mockComments }
      })
      wrapper.vm.commentsFilter = 'active'
      await wrapper.vm.$nextTick()
      // Only comment1 is active (not resolved)
      expect(wrapper.vm.numberOfFilteredComments).toContain('1')
    })

    it('should filter resolved comments only', async () => {
      const wrapper = createWrapper({
        props: { comments: mockComments }
      })
      wrapper.vm.commentsFilter = 'resolved'
      await wrapper.vm.$nextTick()
      // Only comment2 is resolved
      expect(wrapper.vm.numberOfFilteredComments).toContain('1')
    })
  })

  describe('computed: replyingComment', () => {
    it('should return false when no comment has replyTemp', () => {
      const wrapper = createWrapper({
        props: { comments: mockComments }
      })
      expect(wrapper.vm.replyingComment).toBe(false)
    })

    it('should return true when a comment has replyTemp', () => {
      const commentsWithReply = [
        { ...mockComments[0], replyTemp: 'typing a reply' }
      ]
      const wrapper = createWrapper({
        props: { comments: commentsWithReply }
      })
      expect(wrapper.vm.replyingComment).toBe(true)
    })
  })

  describe('computed: canUpdateComment', () => {
    it('should return true when user has update permission', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.canUpdateComment).toBe(true)
    })

    it('should return false when user lacks update permission', () => {
      mockUserStore.isAllowed.mockImplementation((perm) => perm !== 'audits:comments:update')
      const wrapper = createWrapper()
      expect(wrapper.vm.canUpdateComment).toBe(false)
    })
  })

  describe('computed: canDeleteComment', () => {
    it('should return true when user has delete permission', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.canDeleteComment).toBe(true)
    })

    it('should return false when user lacks delete permission', () => {
      mockUserStore.isAllowed.mockImplementation((perm) => perm !== 'audits:comments:delete')
      const wrapper = createWrapper()
      expect(wrapper.vm.canDeleteComment).toBe(false)
    })
  })

  describe('methods: displayComment', () => {
    it('should display all comments when filter is all', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.displayComment({ resolved: false })).toBe(true)
      expect(wrapper.vm.displayComment({ resolved: true })).toBe(true)
    })

    it('should hide resolved comments when filter is active', async () => {
      const wrapper = createWrapper()
      wrapper.vm.commentsFilter = 'active'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.displayComment({ resolved: false })).toBe(true)
      expect(wrapper.vm.displayComment({ resolved: true })).toBe(false)
    })

    it('should hide active comments when filter is resolved', async () => {
      const wrapper = createWrapper()
      wrapper.vm.commentsFilter = 'resolved'
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.displayComment({ resolved: true })).toBe(true)
      expect(wrapper.vm.displayComment({ resolved: false })).toBe(false)
    })
  })

  describe('methods: commentHasBeenModified', () => {
    it('should return true when updatedAt is after createdAt', () => {
      const wrapper = createWrapper()
      const comment = {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }
      expect(wrapper.vm.commentHasBeenModified(comment)).toBe(true)
    })

    it('should return false when updatedAt equals createdAt', () => {
      const wrapper = createWrapper()
      const comment = {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      expect(wrapper.vm.commentHasBeenModified(comment)).toBe(false)
    })

    it('should return true as failsafe when timestamps are missing', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.commentHasBeenModified({})).toBe(true)
      expect(wrapper.vm.commentHasBeenModified({ createdAt: '2024-01-01' })).toBe(true)
      expect(wrapper.vm.commentHasBeenModified({ updatedAt: '2024-01-01' })).toBe(true)
    })
  })

  describe('methods: removeReplyFromComment', () => {
    it('should remove the specified reply and call updateComment', () => {
      const updateCommentMock = vi.fn()
      const wrapper = createWrapper({
        props: { updateComment: updateCommentMock }
      })
      const comment = {
        _id: 'c1',
        replies: [
          { _id: 'r1', text: 'reply 1' },
          { _id: 'r2', text: 'reply 2' }
        ]
      }
      wrapper.vm.removeReplyFromComment({ _id: 'r1' }, comment)
      expect(comment.replies).toHaveLength(1)
      expect(comment.replies[0]._id).toBe('r2')
      expect(updateCommentMock).toHaveBeenCalledWith(comment)
    })
  })

  describe('methods: editCommentClicked', () => {
    it('should emit update:editComment and set textTemp', () => {
      const focusCommentMock = vi.fn()
      const wrapper = createWrapper({
        props: { focusComment: focusCommentMock }
      })
      const comment = { _id: 'c1', text: 'hello' }
      wrapper.vm.editCommentClicked(comment)
      expect(wrapper.emitted('update:editComment')).toBeTruthy()
      expect(wrapper.emitted('update:editComment')[0]).toEqual(['c1'])
      expect(comment.textTemp).toBe('hello')
      expect(focusCommentMock).toHaveBeenCalledWith(comment)
    })
  })

  describe('methods: cancelOrDeleteEditComment', () => {
    it('should emit update:editComment null and delete textTemp when comment was modified', () => {
      const wrapper = createWrapper()
      const comment = {
        _id: 'c1',
        text: 'hello',
        textTemp: 'editing',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }
      wrapper.vm.cancelOrDeleteEditComment(comment)
      expect(wrapper.emitted('update:editComment')).toBeTruthy()
      expect(wrapper.emitted('update:editComment')[0]).toEqual([null])
      expect(comment.textTemp).toBeUndefined()
    })

    it('should call deleteComment when comment has not been modified', () => {
      const deleteCommentMock = vi.fn()
      const wrapper = createWrapper({
        props: { deleteComment: deleteCommentMock }
      })
      const comment = {
        _id: 'c1',
        text: 'hello',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      wrapper.vm.cancelOrDeleteEditComment(comment)
      expect(deleteCommentMock).toHaveBeenCalledWith(comment)
    })
  })

  describe('lifecycle: created', () => {
    it('should set auditId from route params', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.auditId).toBe('audit123')
    })

    it('should set findingId from route params when present', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.findingId).toBe('finding456')
    })

    it('should set sectionId from route params when present', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.sectionId).toBe('section789')
    })
  })

  describe('data defaults', () => {
    it('should have default commentsFilter set to all', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.commentsFilter).toBe('all')
    })

    it('should have hoverReply set to null', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.hoverReply).toBeNull()
    })
  })

  describe('rendering with comments', () => {
    it('should render comment author names', () => {
      const wrapper = createWrapper({
        props: { comments: mockComments }
      })
      expect(wrapper.text()).toContain('John')
      expect(wrapper.text()).toContain('Doe')
    })

    it('should render comment text', () => {
      const wrapper = createWrapper({
        props: { comments: mockComments }
      })
      expect(wrapper.text()).toContain('First comment')
    })

    it('should show resolved header for resolved comments', () => {
      const wrapper = createWrapper({
        props: { comments: mockComments }
      })
      expect(wrapper.text()).toContain('resolved')
    })

    it('should render reply text', () => {
      const wrapper = createWrapper({
        props: { comments: mockComments }
      })
      expect(wrapper.text()).toContain('A reply')
    })

    it('should render reply author names', () => {
      const wrapper = createWrapper({
        props: { comments: mockComments }
      })
      expect(wrapper.text()).toContain('Bob')
      expect(wrapper.text()).toContain('Brown')
    })
  })
})
