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
vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore)
}))

// Mock services used by the page
vi.mock('@/services/collaborator', () => ({
  default: {
    getCollabs: vi.fn(),
    createCollab: vi.fn(),
    updateCollab: vi.fn(),
    deleteCollab: vi.fn()
  }
}))

vi.mock('@/services/data', () => ({
  default: {
    getRoles: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    customFilter: vi.fn(),
    strongPassword: vi.fn()
  }
}))

vi.mock('@/boot/i18n', () => {
  const messages = {
    'msg.lastnameRequired': 'Last name required',
    'msg.firstnameRequired': 'First name required',
    'msg.usernameRequired': 'Username required',
    'msg.passwordRequired': 'Password required',
    'msg.collaboratorCreatedOk': 'Collaborator created successfully',
    'msg.collaboratorUpdatedOk': 'Collaborator updated successfully',
    'msg.passwordComplexity': 'Password does not meet complexity requirements'
  }
  return {
    $t: (key) => messages[key] || key
  }
})

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Notify: {
      create: vi.fn()
    }
  }
})

// Must import after mocks are set up
import CollabService from '@/services/collaborator'
import DataService from '@/services/data'
import { Notify } from 'quasar'
import CollaboratorsPage from '@/pages/data/collaborators/index.vue'

// Helper to set up $refs on a wrapper's component instance
function setRefs(wrapper, refs) {
  const instanceRefs = wrapper.vm.$?.refs
  Object.entries(refs).forEach(([name, refValue]) => {
    if (instanceRefs) {
      const existingRef = instanceRefs[name]
      instanceRefs[name] = existingRef ? { ...existingRef, ...refValue } : refValue
      return
    }

    const existingRef = wrapper.vm.$refs?.[name]
    if (existingRef && typeof existingRef === 'object') {
      Object.assign(existingRef, refValue)
    }
  })
}

describe('Collaborators Page', () => {
  let router, pinia, i18n

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/data/collaborators', component: CollaboratorsPage }
      ]
    })

    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: {
        'en-US': {
          username: 'Username',
          firstname: 'First Name',
          lastname: 'Last Name',
          email: 'Email',
          phone: 'Phone',
          jobTitle: 'Job Title',
          role: 'Role',
          password: 'Password',
          search: 'Search',
          addCollaborator: 'Add Collaborator',
          editCollaborator: 'Edit Collaborator',
          collaborators: 'collaborators',
          collatorator: 'collaborator',
          quantifier: '',
          resultsPerPage: 'Results per page',
          'btn.cancel': 'Cancel',
          'btn.create': 'Create',
          'btn.update': 'Update',
          'btn.accountEnabled': 'Account Enabled',
          'btn.accountDisabled': 'Account Disabled',
          'btn.accountsEnabled': 'Accounts Enabled',
          'btn.accountsDisabled': 'Accounts Disabled',
          'msg.lastnameRequired': 'Last name required',
          'msg.firstnameRequired': 'First name required',
          'msg.usernameRequired': 'Username required',
          'msg.passwordRequired': 'Password required',
          'msg.collaboratorCreatedOk': 'Collaborator created successfully',
          'msg.collaboratorUpdatedOk': 'Collaborator updated successfully'
        }
      }
    })

    vi.clearAllMocks()

    // Reset mockUserStore.isAllowed default
    mockUserStore.isAllowed.mockReturnValue(false)

    // Re-set default mocks after clearAllMocks
    CollabService.getCollabs.mockResolvedValue({
      data: { datas: [] }
    })
    DataService.getRoles.mockResolvedValue({
      data: { datas: ['admin', 'user'] }
    })
  })

  const createWrapper = (options = {}) => {
    return mount(CollaboratorsPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-table': true,
          'q-dialog': { template: '<div><slot /></div>', methods: { show: vi.fn(), hide: vi.fn() } },
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-bar': true,
          'q-input': true,
          'q-btn': true,
          'q-select': true,
          'q-toggle': true,
          'q-separator': true,
          'q-space': true,
          'q-tooltip': true,
          'q-td': true,
          'q-tr': true,
          'q-pagination': true,
          'q-page': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => i18n.global.t(key),
          $settings: {},
          $_: { clone: vi.fn((obj) => JSON.parse(JSON.stringify(obj))) },
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should fetch collaborators on mount', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(CollabService.getCollabs).toHaveBeenCalled()
    })

    it('should fetch roles on mount', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(DataService.getRoles).toHaveBeenCalled()
    })

    it('should have correct initial data state', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.collabs).toEqual([])
      expect(wrapper.vm.loading).toBe(true)
      expect(wrapper.vm.currentCollab).toEqual({
        lastname: '',
        firstname: '',
        username: '',
        role: '',
        email: '',
        phone: '',
        jobTitle: '',
        password: '',
        totpEnabled: false
      })
      expect(wrapper.vm.idUpdate).toBe('')
      expect(wrapper.vm.errors).toEqual({
        lastname: '',
        firstname: '',
        username: ''
      })
    })

    it('should have correct pagination defaults', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.pagination).toEqual({
        page: 1,
        rowsPerPage: 25,
        sortBy: 'username'
      })
    })

    it('should have correct search defaults', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.search).toEqual({
        username: '',
        firstname: '',
        lastname: '',
        role: '',
        email: '',
        jobTitle: '',
        enabled: true
      })
    })
  })

  describe('getCollabs', () => {
    it('should populate collabs on success', async () => {
      const mockCollabs = [
        { _id: '1', username: 'user1', firstname: 'John', lastname: 'Doe', role: 'admin' },
        { _id: '2', username: 'user2', firstname: 'Jane', lastname: 'Smith', role: 'user' }
      ]
      CollabService.getCollabs.mockResolvedValue({
        data: { datas: mockCollabs }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.collabs).toEqual(mockCollabs)
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should set loading to true before fetching', () => {
      CollabService.getCollabs.mockReturnValue(new Promise(() => {})) // never resolves

      const wrapper = createWrapper()

      expect(wrapper.vm.loading).toBe(true)
    })

    it('should handle getCollabs error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      CollabService.getCollabs.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getRoles', () => {
    it('should populate roles on success', async () => {
      const mockRoles = ['admin', 'user', 'reviewer']
      DataService.getRoles.mockResolvedValue({
        data: { datas: mockRoles }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.roles).toEqual(mockRoles)
    })

    it('should handle getRoles error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      DataService.getRoles.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('createCollab', () => {
    it('should validate lastname is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: '',
        firstname: 'John',
        username: 'john',
        password: 'Password123',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      wrapper.vm.createCollab()

      expect(wrapper.vm.errors.lastname).toBe('Last name required')
    })

    it('should validate firstname is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: '',
        username: 'john',
        password: 'Password123',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      wrapper.vm.createCollab()

      expect(wrapper.vm.errors.firstname).toBe('First name required')
    })

    it('should validate username is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: 'John',
        username: '',
        password: 'Password123',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      wrapper.vm.createCollab()

      expect(wrapper.vm.errors.username).toBe('Username required')
    })

    it('should validate password is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: 'John',
        username: 'john',
        password: '',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      wrapper.vm.createCollab()

      expect(wrapper.vm.errors.password).toBe('Password required')
    })

    it('should clear errors before validation', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.errors.lastname = 'Previous error'
      wrapper.vm.errors.firstname = 'Previous error'
      wrapper.vm.errors.username = 'Previous error'

      wrapper.vm.currentCollab = {
        lastname: '',
        firstname: '',
        username: '',
        password: '',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      wrapper.vm.createCollab()

      // Errors are cleaned first, then re-set by validation
      expect(wrapper.vm.errors.lastname).toBe('Last name required')
      expect(wrapper.vm.errors.firstname).toBe('First name required')
      expect(wrapper.vm.errors.username).toBe('Username required')
    })

    it('should call CollabService.createCollab with valid data', async () => {
      CollabService.createCollab.mockResolvedValue({})
      // Re-mock getCollabs for the refresh after create
      CollabService.getCollabs.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const collabData = {
        lastname: 'Doe',
        firstname: 'John',
        username: 'johndoe',
        password: 'Password123',
        role: 'user',
        email: 'john@example.com',
        phone: '1234567890',
        jobTitle: 'Tester'
      }
      wrapper.vm.currentCollab = { ...collabData }

      // Set up refs via internal refs object
      setRefs(wrapper, {
        pwdCreateRef: { validate: vi.fn().mockReturnValue(true) },
        createModal: { hide: vi.fn() }
      })

      wrapper.vm.createCollab()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(CollabService.createCollab).toHaveBeenCalledWith(collabData)
    })

    it('should show success notification on create', async () => {
      CollabService.createCollab.mockResolvedValue({})
      CollabService.getCollabs.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: 'John',
        username: 'johndoe',
        password: 'Password123',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      setRefs(wrapper, {
        pwdCreateRef: { validate: vi.fn().mockReturnValue(true) },
        createModal: { hide: vi.fn() }
      })

      wrapper.vm.createCollab()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Collaborator created successfully',
          color: 'positive'
        })
      )
    })

    it('should show error notification on create failure', async () => {
      CollabService.createCollab.mockRejectedValue({
        response: { data: { datas: 'Username already exists' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: 'John',
        username: 'johndoe',
        password: 'Password123',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      setRefs(wrapper, {
        pwdCreateRef: { validate: vi.fn().mockReturnValue(true) },
        createModal: { hide: vi.fn() }
      })

      wrapper.vm.createCollab()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Username already exists',
          color: 'negative'
        })
      )
    })

    it('should not call service if validation fails', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: '',
        firstname: '',
        username: '',
        password: '',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      wrapper.vm.createCollab()

      expect(CollabService.createCollab).not.toHaveBeenCalled()
    })
  })

  describe('updateCollab', () => {
    it('should validate lastname is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: '',
        firstname: 'John',
        username: 'johndoe',
        password: '',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      wrapper.vm.updateCollab()

      expect(wrapper.vm.errors.lastname).toBe('Last name required')
    })

    it('should validate firstname is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: '',
        username: 'johndoe',
        password: '',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      wrapper.vm.updateCollab()

      expect(wrapper.vm.errors.firstname).toBe('First name required')
    })

    it('should validate username is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: 'John',
        username: '',
        password: '',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      wrapper.vm.updateCollab()

      expect(wrapper.vm.errors.username).toBe('Username required')
    })

    it('should call CollabService.updateCollab with id and data', async () => {
      CollabService.updateCollab.mockResolvedValue({})
      CollabService.getCollabs.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.idUpdate = 'collab-123'
      const collabData = {
        lastname: 'Doe',
        firstname: 'John',
        username: 'johndoe',
        password: '',
        role: 'user',
        email: 'john@example.com',
        phone: '',
        jobTitle: 'Tester'
      }
      wrapper.vm.currentCollab = { ...collabData }

      setRefs(wrapper, {
        pwdUpdateRef: { validate: vi.fn().mockReturnValue(true) },
        editModal: { hide: vi.fn() }
      })

      wrapper.vm.updateCollab()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(CollabService.updateCollab).toHaveBeenCalledWith('collab-123', collabData)
    })

    it('should show success notification on update', async () => {
      CollabService.updateCollab.mockResolvedValue({})
      CollabService.getCollabs.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.idUpdate = 'collab-123'
      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: 'John',
        username: 'johndoe',
        password: '',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      setRefs(wrapper, {
        pwdUpdateRef: { validate: vi.fn().mockReturnValue(true) },
        editModal: { hide: vi.fn() }
      })

      wrapper.vm.updateCollab()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Collaborator updated successfully',
          color: 'positive'
        })
      )
    })

    it('should show error notification on update failure', async () => {
      CollabService.updateCollab.mockRejectedValue({
        response: { data: { datas: 'Update failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.idUpdate = 'collab-123'
      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: 'John',
        username: 'johndoe',
        password: '',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      setRefs(wrapper, {
        pwdUpdateRef: { validate: vi.fn().mockReturnValue(true) },
        editModal: { hide: vi.fn() }
      })

      wrapper.vm.updateCollab()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Update failed',
          color: 'negative'
        })
      )
    })

    it('should not call service if update validation fails', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCollab = {
        lastname: '',
        firstname: '',
        username: '',
        password: '',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      wrapper.vm.updateCollab()

      expect(CollabService.updateCollab).not.toHaveBeenCalled()
    })

    it('should not require password for update', async () => {
      CollabService.updateCollab.mockResolvedValue({})
      CollabService.getCollabs.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.idUpdate = 'collab-123'
      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: 'John',
        username: 'johndoe',
        password: '',
        role: 'user',
        email: '',
        phone: '',
        jobTitle: ''
      }

      setRefs(wrapper, {
        pwdUpdateRef: { validate: vi.fn().mockReturnValue(true) },
        editModal: { hide: vi.fn() }
      })

      wrapper.vm.updateCollab()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Password is not validated as required for update (unlike create)
      expect(wrapper.vm.errors.password).toBe('')
      expect(CollabService.updateCollab).toHaveBeenCalled()
    })
  })

  describe('clone', () => {
    it('should clone a row into currentCollab and set idUpdate', () => {
      const wrapper = createWrapper()

      const row = {
        _id: 'abc123',
        username: 'johndoe',
        firstname: 'John',
        lastname: 'Doe',
        role: 'user',
        email: 'john@example.com',
        phone: '555-1234',
        jobTitle: 'Tester'
      }

      wrapper.vm.clone(row)

      expect(wrapper.vm.idUpdate).toBe('abc123')
      // currentCollab should have the cloned data
      expect(wrapper.vm.currentCollab.username).toBe('johndoe')
      expect(wrapper.vm.currentCollab.firstname).toBe('John')
      expect(wrapper.vm.currentCollab.lastname).toBe('Doe')
    })
  })

  describe('cleanErrors', () => {
    it('should reset all error messages', () => {
      const wrapper = createWrapper()

      wrapper.vm.errors.lastname = 'Some error'
      wrapper.vm.errors.firstname = 'Another error'
      wrapper.vm.errors.username = 'Yet another error'

      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.lastname).toBe('')
      expect(wrapper.vm.errors.firstname).toBe('')
      expect(wrapper.vm.errors.username).toBe('')
    })

    it('should reset password error', () => {
      const wrapper = createWrapper()

      wrapper.vm.errors.password = 'Password error'

      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.password).toBe('')
    })
  })

  describe('cleanCurrentCollab', () => {
    it('should reset currentCollab to default values', () => {
      const wrapper = createWrapper()

      wrapper.vm.currentCollab = {
        lastname: 'Doe',
        firstname: 'John',
        username: 'johndoe',
        role: 'admin',
        password: 'secret',
        email: 'john@example.com',
        phone: '555-1234',
        jobTitle: 'Tester'
      }

      wrapper.vm.cleanCurrentCollab()

      expect(wrapper.vm.currentCollab.lastname).toBe('')
      expect(wrapper.vm.currentCollab.firstname).toBe('')
      expect(wrapper.vm.currentCollab.username).toBe('')
      expect(wrapper.vm.currentCollab.role).toBe('user')
      expect(wrapper.vm.currentCollab.password).toBe('')
      expect(wrapper.vm.currentCollab.email).toBe('')
      expect(wrapper.vm.currentCollab.phone).toBe('')
      expect(wrapper.vm.currentCollab.jobTitle).toBe('')
    })
  })

  describe('dblClick', () => {
    it('should clone row and show edit modal when user has permission', () => {
      const wrapper = createWrapper()

      // The component stores userStore in data, so we need to mock isAllowed on it
      wrapper.vm.userStore.isAllowed = vi.fn().mockReturnValue(true)

      const row = {
        _id: 'abc123',
        username: 'johndoe',
        firstname: 'John',
        lastname: 'Doe',
        role: 'user'
      }

      const showMock = vi.fn()
      setRefs(wrapper, {
        editModal: { show: showMock }
      })

      wrapper.vm.dblClick({}, row)

      expect(wrapper.vm.userStore.isAllowed).toHaveBeenCalledWith('users:updates')
      expect(wrapper.vm.idUpdate).toBe('abc123')
      expect(showMock).toHaveBeenCalled()
    })

    it('should not show edit modal when user lacks permission', () => {
      const wrapper = createWrapper()

      wrapper.vm.userStore.isAllowed = vi.fn().mockReturnValue(false)

      const row = {
        _id: 'abc123',
        username: 'johndoe',
        firstname: 'John',
        lastname: 'Doe',
        role: 'user'
      }

      const showMock = vi.fn()
      setRefs(wrapper, {
        editModal: { show: showMock }
      })

      wrapper.vm.dblClick({}, row)

      expect(wrapper.vm.userStore.isAllowed).toHaveBeenCalledWith('users:updates')
      expect(showMock).not.toHaveBeenCalled()
    })
  })

  describe('Data Table Headers', () => {
    it('should have all expected columns', () => {
      const wrapper = createWrapper()

      const headerNames = wrapper.vm.dtHeaders.map(h => h.name)
      expect(headerNames).toContain('username')
      expect(headerNames).toContain('firstname')
      expect(headerNames).toContain('lastname')
      expect(headerNames).toContain('email')
      expect(headerNames).toContain('jobTitle')
      expect(headerNames).toContain('role')
      expect(headerNames).toContain('action')
    })

    it('should have correct number of columns', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.dtHeaders).toHaveLength(7)
    })
  })
})
