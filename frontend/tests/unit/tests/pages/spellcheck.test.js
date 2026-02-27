import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

// Mock the user store before importing the component
const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    roles: '',
    isAllowed: vi.fn(() => false)
  }
}))
vi.mock('@/stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore)
}))

// Mock services
vi.mock('@/services/spellcheck', () => ({
  default: {
    getWords: vi.fn(),
    addWord: vi.fn(),
    deleteWord: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    customFilter: vi.fn(() => [])
  }
}))

vi.mock('@/boot/i18n', () => ({
  $t: (key) => key
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Dialog: {
      create: vi.fn(() => ({
        onOk: vi.fn((cb) => {
          Dialog._lastOnOk = cb
          return { onCancel: vi.fn() }
        })
      }))
    },
    Notify: {
      create: vi.fn()
    }
  }
})

import SpellcheckService from '@/services/spellcheck'
import { Dialog, Notify } from 'quasar'
import SpellcheckPage from '@/pages/data/spellcheck/index.vue'

// Helper to set up $refs on a wrapper's component instance
function setRefs(wrapper, refs) {
  const internalRefs = wrapper.vm.$.refs
  Object.assign(internalRefs, refs)
}

describe('Spellcheck Page', () => {
  let router, pinia, i18n, wrapper

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/data/spellcheck', component: SpellcheckPage }
      ]
    })

    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: {
        'en-US': {
          word: 'Word',
          createWord: 'Create Word',
          search: 'Search',
          resultsPerPage: 'Results per page',
          ignoredWord: 'ignored word',
          ignoredWords: 'ignored words',
          quantifier: ' ',
          'tooltip.delete': 'Delete',
          'btn.cancel': 'Cancel',
          'btn.create': 'Create',
          'btn.confirm': 'Confirm',
          'msg.fieldRequired': 'Field is required',
          'msg.unauthorized': 'Unauthorized',
          'msg.confirmSuppression': 'Confirm deletion',
          'msg.deleteNotice': 'will be deleted',
          'msg.wordCreated': 'Word created',
          'msg.wordDeleted': 'Word deleted',
          'msg.errorLoading': 'Error loading',
          'msg.errorCreating': 'Error creating',
          'msg.errorDeleting': 'Error deleting'
        }
      }
    })

    vi.clearAllMocks()
    // Reset mockUserStore.isAllowed default
    mockUserStore.isAllowed.mockReturnValue(false)
    SpellcheckService.getWords.mockResolvedValue({
      data: { datas: [] }
    })
  })

  const createWrapper = (options = {}) => {
    return mount(SpellcheckPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-table': true,
          'q-btn': true,
          'q-input': true,
          'q-dialog': { template: '<div><slot /></div>', methods: { show: vi.fn(), hide: vi.fn() } },
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-bar': true,
          'q-space': true,
          'q-td': true,
          'q-tr': true,
          'q-select': true,
          'q-pagination': true,
          'q-tooltip': true,
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
    it('should fetch words on mount', async () => {
      SpellcheckService.getWords.mockResolvedValue({
        data: { datas: [] }
      })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(SpellcheckService.getWords).toHaveBeenCalled()
    })

    it('should set loading to true initially', () => {
      SpellcheckService.getWords.mockResolvedValue({
        data: { datas: [] }
      })

      wrapper = createWrapper()

      // loading starts true (set in getWords before the promise resolves)
      expect(wrapper.vm.loading).toBe(true)
    })

    it('should populate words after successful fetch', async () => {
      const mockWords = [
        { word: 'testword1' },
        { word: 'testword2' },
        { word: 'testword3' }
      ]
      SpellcheckService.getWords.mockResolvedValue({
        data: { datas: mockWords }
      })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.words).toEqual(mockWords)
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should handle fetch error and show notification', async () => {
      const mockError = {
        response: {
          data: { datas: 'Database error' }
        }
      }
      SpellcheckService.getWords.mockRejectedValue(mockError)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.loading).toBe(false)
      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Database error',
        color: 'negative'
      })
    })

    it('should show fallback error message when no response data', async () => {
      const mockError = new Error('Network error')
      SpellcheckService.getWords.mockRejectedValue(mockError)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.loading).toBe(false)
      expect(Notify.create).toHaveBeenCalledWith({
        message: 'msg.errorLoading',
        color: 'negative'
      })
    })
  })

  describe('Data Properties', () => {
    beforeEach(() => {
      SpellcheckService.getWords.mockResolvedValue({
        data: { datas: [] }
      })
    })

    it('should have correct default pagination', () => {
      wrapper = createWrapper()

      expect(wrapper.vm.pagination).toEqual({
        page: 1,
        rowsPerPage: 25,
        sortBy: 'word'
      })
    })

    it('should have correct rows per page options', () => {
      wrapper = createWrapper()

      expect(wrapper.vm.rowsPerPageOptions).toEqual([
        { label: '25', value: 25 },
        { label: '50', value: 50 },
        { label: '100', value: 100 },
        { label: 'All', value: 0 }
      ])
    })

    it('should have empty search filter by default', () => {
      wrapper = createWrapper()

      expect(wrapper.vm.search).toEqual({ word: '' })
    })

    it('should have empty currentWord by default', () => {
      wrapper = createWrapper()

      expect(wrapper.vm.currentWord).toEqual({ word: '' })
    })

    it('should have dtHeaders with word and action columns', () => {
      wrapper = createWrapper()

      expect(wrapper.vm.dtHeaders).toHaveLength(2)
      expect(wrapper.vm.dtHeaders[0].name).toBe('word')
      expect(wrapper.vm.dtHeaders[1].name).toBe('action')
    })
  })

  describe('Computed Properties', () => {
    beforeEach(() => {
      SpellcheckService.getWords.mockResolvedValue({
        data: { datas: [] }
      })
    })

    it('should return true for canEdit when user has settings:update permission', () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      wrapper = createWrapper()

      expect(wrapper.vm.canEdit).toBe(true)
    })

    it('should return false for canEdit when user lacks settings:update permission', () => {
      mockUserStore.isAllowed.mockReturnValue(false)

      wrapper = createWrapper()

      expect(wrapper.vm.canEdit).toBe(false)
    })

    it('should return true for canEdit when user has wildcard roles', () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      wrapper = createWrapper()

      expect(wrapper.vm.canEdit).toBe(true)
    })
  })

  describe('createWord', () => {
    beforeEach(() => {
      SpellcheckService.getWords.mockResolvedValue({
        data: { datas: [] }
      })
    })

    it('should show unauthorized notification when user cannot edit', async () => {
      mockUserStore.isAllowed.mockReturnValue(false)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.createWord()

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'msg.unauthorized',
        color: 'negative'
      })
      expect(SpellcheckService.addWord).not.toHaveBeenCalled()
    })

    it('should validate that word is not empty', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentWord.word = ''
      wrapper.vm.createWord()

      expect(wrapper.vm.errors.name).toBe('msg.fieldRequired')
      expect(SpellcheckService.addWord).not.toHaveBeenCalled()
    })

    it('should validate that word is not only whitespace', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentWord.word = '   '
      wrapper.vm.createWord()

      expect(wrapper.vm.errors.name).toBe('msg.fieldRequired')
      expect(SpellcheckService.addWord).not.toHaveBeenCalled()
    })

    it('should call addWord with trimmed word on success', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      SpellcheckService.addWord.mockResolvedValue({ data: { datas: {} } })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentWord.word = '  myword  '
      wrapper.vm.createWord()

      expect(SpellcheckService.addWord).toHaveBeenCalledWith('myword')
    })

    it('should clear errors before calling service', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      SpellcheckService.addWord.mockResolvedValue({ data: { datas: {} } })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.errors.name = 'Previous error'
      wrapper.vm.currentWord.word = 'newword'
      wrapper.vm.createWord()

      expect(wrapper.vm.errors.name).toBe('')
    })

    it('should show success notification and refresh words after creation', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      SpellcheckService.addWord.mockResolvedValue({ data: { datas: {} } })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      // Set up refs so that hide() doesn't throw in the .then() handler
      setRefs(wrapper, {
        createModal: { hide: vi.fn() }
      })

      wrapper.vm.currentWord.word = 'newword'
      wrapper.vm.createWord()

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'msg.wordCreated',
        color: 'positive'
      })
      // getWords called once on mount, then again after create
      expect(SpellcheckService.getWords).toHaveBeenCalledTimes(2)
    })

    it('should show unauthorized notification on 403 error', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      const mockError = {
        response: {
          status: 403,
          data: { datas: 'Forbidden' }
        }
      }
      SpellcheckService.addWord.mockRejectedValue(mockError)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentWord.word = 'newword'
      wrapper.vm.createWord()

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'msg.unauthorized',
        color: 'negative'
      })
    })

    it('should show error message from response on non-403 error', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      const mockError = {
        response: {
          status: 500,
          data: { error: 'Duplicate word' }
        }
      }
      SpellcheckService.addWord.mockRejectedValue(mockError)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentWord.word = 'newword'
      wrapper.vm.createWord()

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Duplicate word',
        color: 'negative'
      })
    })

    it('should set field error when error message contains word', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      const mockError = {
        response: {
          status: 400,
          data: { error: 'Duplicate word already exists' }
        }
      }
      SpellcheckService.addWord.mockRejectedValue(mockError)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentWord.word = 'existingword'
      wrapper.vm.createWord()

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.errors.name).toBe('Duplicate word already exists')
    })
  })

  describe('deleteWord', () => {
    beforeEach(() => {
      SpellcheckService.getWords.mockResolvedValue({
        data: { datas: [] }
      })
    })

    it('should show unauthorized notification when user cannot edit', async () => {
      mockUserStore.isAllowed.mockReturnValue(false)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteWord({ word: 'testword' })

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'msg.unauthorized',
        color: 'negative'
      })
      expect(SpellcheckService.deleteWord).not.toHaveBeenCalled()
    })

    it('should call deleteWord service with correct word', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      SpellcheckService.deleteWord.mockResolvedValue({ data: { datas: {} } })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteWord({ word: 'testword' })

      expect(SpellcheckService.deleteWord).toHaveBeenCalledWith('testword')
    })

    it('should show success notification and refresh words after deletion', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      SpellcheckService.deleteWord.mockResolvedValue({ data: { datas: {} } })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteWord({ word: 'testword' })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'msg.wordDeleted',
        color: 'positive'
      })
      // getWords called once on mount, then again after delete
      expect(SpellcheckService.getWords).toHaveBeenCalledTimes(2)
    })

    it('should show unauthorized notification on 403 error', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      const mockError = {
        response: {
          status: 403,
          data: {}
        }
      }
      SpellcheckService.deleteWord.mockRejectedValue(mockError)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteWord({ word: 'testword' })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'msg.unauthorized',
        color: 'negative'
      })
    })

    it('should show error message from response on non-403 error', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      const mockError = {
        response: {
          status: 500,
          data: { error: 'Server error' }
        }
      }
      SpellcheckService.deleteWord.mockRejectedValue(mockError)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteWord({ word: 'testword' })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'Server error',
        color: 'negative'
      })
    })
  })

  describe('confirmDeleteWord', () => {
    beforeEach(() => {
      SpellcheckService.getWords.mockResolvedValue({
        data: { datas: [] }
      })
    })

    it('should show unauthorized notification when user cannot edit', async () => {
      mockUserStore.isAllowed.mockReturnValue(false)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.confirmDeleteWord({ word: 'testword' })

      expect(Notify.create).toHaveBeenCalledWith({
        message: 'msg.unauthorized',
        color: 'negative'
      })
      expect(Dialog.create).not.toHaveBeenCalled()
    })

    it('should open confirmation dialog when user can edit', async () => {
      mockUserStore.isAllowed.mockReturnValue(true)

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.confirmDeleteWord({ word: 'testword' })

      expect(Dialog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'msg.confirmSuppression'
        })
      )
    })
  })

  describe('cleanCurrentWord', () => {
    beforeEach(() => {
      SpellcheckService.getWords.mockResolvedValue({
        data: { datas: [] }
      })
    })

    it('should reset currentWord to empty', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentWord.word = 'someword'
      wrapper.vm.cleanCurrentWord()

      expect(wrapper.vm.currentWord).toEqual({ word: '' })
    })

    it('should also clean errors', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.errors.name = 'Some error'
      wrapper.vm.cleanCurrentWord()

      expect(wrapper.vm.errors.name).toBe('')
    })
  })

  describe('cleanErrors', () => {
    beforeEach(() => {
      SpellcheckService.getWords.mockResolvedValue({
        data: { datas: [] }
      })
    })

    it('should clear errors.name', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.errors.name = 'Field is required'
      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.name).toBe('')
    })
  })
})
