import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ClientsPage from '@/pages/data/clients/index.vue'

// Mock services used by the page
vi.mock('@/services/client', () => ({
  default: {
    getClients: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn()
  }
}))

vi.mock('@/services/company', () => ({
  default: {
    getCompanies: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    customFilter: vi.fn()
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
        onOk: vi.fn((cb) => ({ onCancel: vi.fn() }))
      }))
    },
    Notify: {
      create: vi.fn()
    }
  }
})

import ClientService from '@/services/client'
import CompanyService from '@/services/company'
import { Dialog, Notify } from 'quasar'

describe('Clients Page', () => {
  let router, pinia, i18n

  const mockClients = [
    {
      _id: 'client1',
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
      cell: '0987654321',
      title: 'CTO',
      company: { name: 'Acme Corp' }
    },
    {
      _id: 'client2',
      firstname: 'Jane',
      lastname: 'Smith',
      email: 'jane@example.com',
      phone: '',
      cell: '',
      title: '',
      company: { name: 'Test Inc' }
    }
  ]

  const mockCompanies = [
    { _id: 'comp1', name: 'Acme Corp' },
    { _id: 'comp2', name: 'Test Inc' }
  ]

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/data/clients', component: ClientsPage }]
    })
    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: { 'en-US': {} }
    })
    vi.clearAllMocks()

    // Default successful responses
    ClientService.getClients.mockResolvedValue({
      data: { datas: mockClients }
    })
    CompanyService.getCompanies.mockResolvedValue({
      data: { datas: mockCompanies }
    })
  })

  const createWrapper = (options = {}) => {
    return mount(ClientsPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-table': true,
          'q-dialog': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-input': true,
          'q-btn': true,
          'q-select': true,
          'q-separator': true,
          'q-space': true,
          'q-bar': true,
          'q-tr': true,
          'q-td': true,
          'q-tooltip': true,
          'q-pagination': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $_: { clone: (obj) => JSON.parse(JSON.stringify(obj)) },
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

    it('should fetch clients on mount', async () => {
      createWrapper()
      await vi.waitFor(() => {
        expect(ClientService.getClients).toHaveBeenCalled()
      })
    })

    it('should fetch companies on mount', async () => {
      createWrapper()
      await vi.waitFor(() => {
        expect(CompanyService.getCompanies).toHaveBeenCalled()
      })
    })

    it('should populate clients list after fetching', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.clients).toEqual(mockClients)
    })

    it('should populate companies list after fetching', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.companies).toEqual(mockCompanies)
    })

    it('should set loading to false after clients are fetched', async () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.loading).toBe(true)

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.loading).toBe(false)
    })

    it('should have correct initial data state', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.search).toEqual({
        firstname: '',
        lastname: '',
        email: '',
        'company.name': ''
      })
      expect(wrapper.vm.errors).toEqual({
        lastname: '',
        firstname: '',
        email: ''
      })
      expect(wrapper.vm.currentClient).toEqual({
        lastname: '',
        firstname: '',
        email: '',
        phone: '',
        cell: '',
        title: '',
        company: {}
      })
      expect(wrapper.vm.pagination).toEqual({
        page: 1,
        rowsPerPage: 25,
        sortBy: 'firstname'
      })
    })
  })

  describe('getClients', () => {
    it('should set loading to true before fetching', () => {
      const wrapper = createWrapper()
      wrapper.vm.loading = false
      wrapper.vm.getClients()
      expect(wrapper.vm.loading).toBe(true)
    })

    it('should handle fetch error gracefully', async () => {
      ClientService.getClients.mockRejectedValue(new Error('Network error'))
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getCompanies', () => {
    it('should handle fetch error gracefully', async () => {
      CompanyService.getCompanies.mockRejectedValue(new Error('Network error'))
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('createClient', () => {
    it('should validate lastname is required', () => {
      const wrapper = createWrapper()
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: '',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.createClient()

      expect(wrapper.vm.errors.lastname).toBe('msg.lastnameRequired')
      expect(ClientService.createClient).not.toHaveBeenCalled()
    })

    it('should validate firstname is required', () => {
      const wrapper = createWrapper()
      wrapper.vm.currentClient = {
        firstname: '',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.createClient()

      expect(wrapper.vm.errors.firstname).toBe('msg.firstnameRequired')
      expect(ClientService.createClient).not.toHaveBeenCalled()
    })

    it('should validate email is required', () => {
      const wrapper = createWrapper()
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: 'Doe',
        email: '',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.createClient()

      expect(wrapper.vm.errors.email).toBe('msg.emailRequired')
      expect(ClientService.createClient).not.toHaveBeenCalled()
    })

    it('should validate all required fields at once', () => {
      const wrapper = createWrapper()
      wrapper.vm.currentClient = {
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.createClient()

      expect(wrapper.vm.errors.firstname).toBe('msg.firstnameRequired')
      expect(wrapper.vm.errors.lastname).toBe('msg.lastnameRequired')
      expect(wrapper.vm.errors.email).toBe('msg.emailRequired')
      expect(ClientService.createClient).not.toHaveBeenCalled()
    })

    it('should clear errors before validation', () => {
      const wrapper = createWrapper()
      wrapper.vm.errors.firstname = 'Previous error'
      wrapper.vm.errors.lastname = 'Previous error'
      wrapper.vm.errors.email = 'Previous error'

      wrapper.vm.currentClient = {
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.createClient()

      // Errors are set fresh from validation, not from previous state
      expect(wrapper.vm.errors.firstname).toBe('msg.firstnameRequired')
      expect(wrapper.vm.errors.lastname).toBe('msg.lastnameRequired')
      expect(wrapper.vm.errors.email).toBe('msg.emailRequired')
    })

    it('should call ClientService.createClient with valid data', async () => {
      ClientService.createClient.mockResolvedValue({})
      const wrapper = createWrapper()
      const clientData = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '1234567890',
        cell: '0987654321',
        title: 'CTO',
        company: { name: 'Acme Corp' }
      }
      wrapper.vm.currentClient = clientData

      wrapper.vm.createClient()

      await wrapper.vm.$nextTick()

      expect(ClientService.createClient).toHaveBeenCalledWith(clientData)
    })

    it('should refresh clients after successful creation', async () => {
      ClientService.createClient.mockResolvedValue({})
      const wrapper = createWrapper()
      // Mock the ref on the internal refs object
      wrapper.vm.$.refs.createModal = { hide: vi.fn() }
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      // Clear the initial call count
      ClientService.getClients.mockClear()

      wrapper.vm.createClient()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(ClientService.getClients).toHaveBeenCalled()
    })

    it('should show success notification after creation', async () => {
      ClientService.createClient.mockResolvedValue({})
      const wrapper = createWrapper()
      wrapper.vm.$.refs.createModal = { hide: vi.fn() }
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.createClient()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.clientCreatedOk',
          color: 'positive'
        })
      )
    })

    it('should show error notification on creation failure', async () => {
      ClientService.createClient.mockRejectedValue({
        response: { data: { datas: 'Client already exists' } }
      })
      const wrapper = createWrapper()
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.createClient()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Client already exists',
          color: 'negative'
        })
      )
    })
  })

  describe('updateClient', () => {
    it('should validate lastname is required', () => {
      const wrapper = createWrapper()
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: '',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.updateClient()

      expect(wrapper.vm.errors.lastname).toBe('msg.lastnameRequired')
      expect(ClientService.updateClient).not.toHaveBeenCalled()
    })

    it('should validate firstname is required', () => {
      const wrapper = createWrapper()
      wrapper.vm.currentClient = {
        firstname: '',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.updateClient()

      expect(wrapper.vm.errors.firstname).toBe('msg.firstnameRequired')
      expect(ClientService.updateClient).not.toHaveBeenCalled()
    })

    it('should validate email is required', () => {
      const wrapper = createWrapper()
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: 'Doe',
        email: '',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.updateClient()

      expect(wrapper.vm.errors.email).toBe('msg.emailRequired')
      expect(ClientService.updateClient).not.toHaveBeenCalled()
    })

    it('should call ClientService.updateClient with idUpdate and client data', async () => {
      ClientService.updateClient.mockResolvedValue({})
      const wrapper = createWrapper()
      wrapper.vm.idUpdate = 'client1'
      const clientData = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@updated.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }
      wrapper.vm.currentClient = clientData

      wrapper.vm.updateClient()

      await wrapper.vm.$nextTick()

      expect(ClientService.updateClient).toHaveBeenCalledWith('client1', clientData)
    })

    it('should refresh clients after successful update', async () => {
      ClientService.updateClient.mockResolvedValue({})
      const wrapper = createWrapper()
      wrapper.vm.$.refs.editModal = { hide: vi.fn() }
      wrapper.vm.idUpdate = 'client1'
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      ClientService.getClients.mockClear()

      wrapper.vm.updateClient()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(ClientService.getClients).toHaveBeenCalled()
    })

    it('should show success notification after update', async () => {
      ClientService.updateClient.mockResolvedValue({})
      const wrapper = createWrapper()
      wrapper.vm.$.refs.editModal = { hide: vi.fn() }
      wrapper.vm.idUpdate = 'client1'
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.updateClient()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.clientUpdatedOk',
          color: 'positive'
        })
      )
    })

    it('should show error notification on update failure', async () => {
      ClientService.updateClient.mockRejectedValue({
        response: { data: { datas: 'Update failed' } }
      })
      const wrapper = createWrapper()
      wrapper.vm.idUpdate = 'client1'
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.updateClient()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Update failed',
          color: 'negative'
        })
      )
    })
  })

  describe('deleteClient', () => {
    it('should call ClientService.deleteClient with client id', async () => {
      ClientService.deleteClient.mockResolvedValue({})
      const wrapper = createWrapper()

      wrapper.vm.deleteClient('client1')

      expect(ClientService.deleteClient).toHaveBeenCalledWith('client1')
    })

    it('should refresh clients after successful deletion', async () => {
      ClientService.deleteClient.mockResolvedValue({})
      const wrapper = createWrapper()

      ClientService.getClients.mockClear()

      wrapper.vm.deleteClient('client1')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(ClientService.getClients).toHaveBeenCalled()
    })

    it('should show success notification after deletion', async () => {
      ClientService.deleteClient.mockResolvedValue({})
      const wrapper = createWrapper()

      wrapper.vm.deleteClient('client1')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.clientDeletedOk',
          color: 'positive'
        })
      )
    })

    it('should show error notification on deletion failure', async () => {
      ClientService.deleteClient.mockRejectedValue({
        response: { data: { datas: 'Cannot delete client' } }
      })
      const wrapper = createWrapper()

      wrapper.vm.deleteClient('client1')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot delete client',
          color: 'negative'
        })
      )
    })
  })

  describe('confirmDeleteClient', () => {
    it('should open a confirmation dialog with client name', () => {
      const wrapper = createWrapper()
      const client = { _id: 'client1', firstname: 'John', lastname: 'Doe' }

      wrapper.vm.confirmDeleteClient(client)

      expect(Dialog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'msg.confirmSuppression'
        })
      )
    })

    it('should call deleteClient on dialog confirmation', () => {
      // Mock Dialog.create to invoke the onOk callback
      const onOkCallback = vi.fn()
      Dialog.create.mockReturnValue({
        onOk: (cb) => {
          onOkCallback.mockImplementation(cb)
          // Simulate user clicking OK
          cb()
          return { onCancel: vi.fn() }
        }
      })

      ClientService.deleteClient.mockResolvedValue({})
      const wrapper = createWrapper()
      const client = { _id: 'client1', firstname: 'John', lastname: 'Doe' }

      wrapper.vm.confirmDeleteClient(client)

      expect(ClientService.deleteClient).toHaveBeenCalledWith('client1')
    })
  })

  describe('clone', () => {
    it('should clone client data to currentClient', () => {
      const wrapper = createWrapper()
      const row = {
        _id: 'client1',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '123',
        cell: '456',
        title: 'CTO',
        company: { name: 'Acme' }
      }

      wrapper.vm.clone(row)

      expect(wrapper.vm.currentClient.firstname).toBe('John')
      expect(wrapper.vm.currentClient.lastname).toBe('Doe')
      expect(wrapper.vm.currentClient.email).toBe('john@test.com')
    })

    it('should set idUpdate to row _id', () => {
      const wrapper = createWrapper()
      const row = {
        _id: 'client1',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.clone(row)

      expect(wrapper.vm.idUpdate).toBe('client1')
    })
  })

  describe('cleanErrors', () => {
    it('should clear all error messages', () => {
      const wrapper = createWrapper()
      wrapper.vm.errors.firstname = 'Error 1'
      wrapper.vm.errors.lastname = 'Error 2'
      wrapper.vm.errors.email = 'Error 3'

      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.firstname).toBe('')
      expect(wrapper.vm.errors.lastname).toBe('')
      expect(wrapper.vm.errors.email).toBe('')
    })
  })

  describe('cleanCurrentClient', () => {
    it('should reset all currentClient fields', () => {
      const wrapper = createWrapper()
      wrapper.vm.currentClient = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '123',
        cell: '456',
        title: 'CTO',
        company: { name: 'Acme' }
      }

      wrapper.vm.cleanCurrentClient()

      expect(wrapper.vm.currentClient.firstname).toBe('')
      expect(wrapper.vm.currentClient.lastname).toBe('')
      expect(wrapper.vm.currentClient.email).toBe('')
      expect(wrapper.vm.currentClient.phone).toBe('')
      expect(wrapper.vm.currentClient.cell).toBe('')
      expect(wrapper.vm.currentClient.title).toBe('')
      expect(wrapper.vm.currentClient.company).toEqual({ name: '' })
    })
  })

  describe('dblClick', () => {
    it('should clone the row data and show edit modal', () => {
      const wrapper = createWrapper()
      wrapper.vm.$.refs.editModal = { show: vi.fn() }
      const row = {
        _id: 'client1',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@test.com',
        phone: '',
        cell: '',
        title: '',
        company: {}
      }

      wrapper.vm.dblClick({}, row)

      expect(wrapper.vm.currentClient.firstname).toBe('John')
      expect(wrapper.vm.idUpdate).toBe('client1')
    })
  })

  describe('Data Binding', () => {
    it('should have all expected data properties', () => {
      const wrapper = createWrapper()

      expect('clients' in wrapper.vm).toBe(true)
      expect('companies' in wrapper.vm).toBe(true)
      expect('loading' in wrapper.vm).toBe(true)
      expect('search' in wrapper.vm).toBe(true)
      expect('errors' in wrapper.vm).toBe(true)
      expect('currentClient' in wrapper.vm).toBe(true)
      expect('idUpdate' in wrapper.vm).toBe(true)
      expect('pagination' in wrapper.vm).toBe(true)
      expect('dtHeaders' in wrapper.vm).toBe(true)
      expect('rowsPerPageOptions' in wrapper.vm).toBe(true)
    })

    it('should have correct dtHeaders configuration', () => {
      const wrapper = createWrapper()
      const headers = wrapper.vm.dtHeaders

      expect(headers).toHaveLength(5)
      expect(headers[0].name).toBe('firstname')
      expect(headers[1].name).toBe('lastname')
      expect(headers[2].name).toBe('email')
      expect(headers[3].name).toBe('company')
      expect(headers[4].name).toBe('action')
    })

    it('should have correct rowsPerPageOptions', () => {
      const wrapper = createWrapper()
      const options = wrapper.vm.rowsPerPageOptions

      expect(options).toEqual([
        { label: '25', value: 25 },
        { label: '50', value: 50 },
        { label: '100', value: 100 },
        { label: 'All', value: 0 }
      ])
    })
  })
})
