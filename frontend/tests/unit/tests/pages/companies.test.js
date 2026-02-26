import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import CompaniesPage from '@/pages/data/companies/index.vue'

// Mock dependencies
vi.mock('@/services/company', () => ({
  default: {
    getCompanies: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
    deleteCompany: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    customFilter: vi.fn((rows) => rows)
  }
}))

vi.mock('@/boot/i18n', () => {
  const messages = {
    'name': 'Name',
    'shortName': 'Short Name',
    'logo': 'Logo',
    'search': 'Search',
    'addCompany': 'Add Company',
    'editCompany': 'Edit Company',
    'company': 'Company',
    'companies': 'Companies',
    'quantifier': '',
    'resultsPerPage': 'Results per page',
    'msg.nameRequired': 'Name is required',
    'msg.companyCreatedOk': 'Company created successfully',
    'msg.companyUpdatedOk': 'Company updated successfully',
    'msg.companyDeletedOk': 'Company deleted successfully',
    'msg.confirmSuppression': 'Confirm deletion',
    'msg.deleteNotice': 'will be deleted',
    'btn.confirm': 'Confirm',
    'btn.cancel': 'Cancel',
    'btn.create': 'Create',
    'btn.update': 'Update',
    'tooltip.edit': 'Edit',
    'tooltip.delete': 'Delete'
  }
  return {
    $t: (key) => messages[key] || key
  }
})

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Dialog: {
      create: vi.fn(() => ({
        onOk: vi.fn((cb) => {
          // Store the callback for testing
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

import CompanyService from '@/services/company'
import { Dialog, Notify } from 'quasar'

describe('Companies Page', () => {
  let router
  let pinia
  let i18n

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/data/companies', component: CompaniesPage }
      ]
    })

    i18n = createI18n({
      legacy: false,
      globalInjection: true,
      locale: 'en-US',
      fallbackLocale: 'en-US',
      messages: {
        'en-US': {
          name: 'Name',
          shortName: 'Short Name',
          logo: 'Logo',
          search: 'Search',
          addCompany: 'Add Company',
          editCompany: 'Edit Company',
          company: 'Company',
          companies: 'Companies',
          quantifier: '',
          resultsPerPage: 'Results per page',
          'msg.nameRequired': 'Name is required',
          'msg.companyCreatedOk': 'Company created successfully',
          'msg.companyUpdatedOk': 'Company updated successfully',
          'msg.companyDeletedOk': 'Company deleted successfully',
          'msg.confirmSuppression': 'Confirm deletion',
          'msg.deleteNotice': 'will be deleted',
          'btn.confirm': 'Confirm',
          'btn.cancel': 'Cancel',
          'btn.create': 'Create',
          'btn.update': 'Update',
          'tooltip.edit': 'Edit',
          'tooltip.delete': 'Delete'
        }
      }
    })

    vi.clearAllMocks()

    // Default: getCompanies resolves so mount doesn't fail
    CompanyService.getCompanies.mockResolvedValue({
      data: { datas: [] }
    })
  })

  const createWrapper = (options = {}) => {

    return mount(CompaniesPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-table': true,
          'q-dialog': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-bar': true,
          'q-input': true,
          'q-btn': true,
          'q-space': true,
          'q-uploader': true,
          'q-select': true,
          'q-pagination': true,
          'q-td': true,
          'q-tr': true,
          'q-tooltip': true,
          'q-icon': true,
          'q-img': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => i18n.global.t(key),
          $settings: {},
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should call getCompanies on mount', async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(CompanyService.getCompanies).toHaveBeenCalled()
    })

    it('should populate companies list from API response', async () => {
      const mockCompanies = [
        { _id: '1', name: 'Company A', shortName: 'CA', logo: '' },
        { _id: '2', name: 'Company B', shortName: 'CB', logo: '' }
      ]
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: mockCompanies }
      })

      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.vm.companies).toEqual(mockCompanies)
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should set loading to true initially', () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()

      // loading starts as true (set in data)
      expect(wrapper.vm.loading).toBe(true)
    })

    it('should handle getCompanies error', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      CompanyService.getCompanies.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await flushPromises()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should have correct initial data state', () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()

      expect(wrapper.vm.companies).toEqual([])
      expect(wrapper.vm.search).toEqual({ name: '' })
      expect(wrapper.vm.errors).toEqual({ name: '' })
      expect(wrapper.vm.currentCompany).toEqual({ name: '', shortName: '', logo: '' })
      expect(wrapper.vm.idUpdate).toBe('')
      expect(wrapper.vm.pagination.page).toBe(1)
      expect(wrapper.vm.pagination.rowsPerPage).toBe(25)
      expect(wrapper.vm.pagination.sortBy).toBe('name')
    })
  })

  describe('createCompany', () => {
    let wrapper

    beforeEach(async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should validate name is required', () => {
      wrapper.vm.currentCompany.name = ''

      wrapper.vm.createCompany()

      expect(wrapper.vm.errors.name).toBe('Name is required')
      expect(CompanyService.createCompany).not.toHaveBeenCalled()
    })

    it('should clear errors before validation', () => {
      wrapper.vm.errors.name = 'Previous error'
      wrapper.vm.currentCompany.name = ''

      wrapper.vm.createCompany()

      // errors.name gets cleared first, then re-set because name is empty
      expect(wrapper.vm.errors.name).toBe('Name is required')
    })

    it('should call CompanyService.createCompany with current company data', async () => {
      CompanyService.createCompany.mockResolvedValue({})

      wrapper.vm.currentCompany = { name: 'Test Co', shortName: 'TC', logo: '' }

      // Mock the ref so hide doesn't throw
      wrapper.vm.$.refs.createModal = { hide: vi.fn() }

      wrapper.vm.createCompany()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(CompanyService.createCompany).toHaveBeenCalledWith({
        name: 'Test Co',
        shortName: 'TC',
        logo: ''
      })
    })

    it('should refresh companies list after successful creation', async () => {
      CompanyService.createCompany.mockResolvedValue({})
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [{ _id: '1', name: 'Test Co', shortName: 'TC', logo: '' }] }
      })

      wrapper.vm.currentCompany = { name: 'Test Co', shortName: 'TC', logo: '' }
      wrapper.vm.$.refs.createModal = { hide: vi.fn() }

      wrapper.vm.createCompany()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // getCompanies called once on mount + once after create
      expect(CompanyService.getCompanies).toHaveBeenCalledTimes(2)
    })

    it('should show success notification after creation', async () => {
      CompanyService.createCompany.mockResolvedValue({})

      wrapper.vm.currentCompany = { name: 'Test Co', shortName: 'TC', logo: '' }
      wrapper.vm.$.refs.createModal = { hide: vi.fn() }

      wrapper.vm.createCompany()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'positive',
          textColor: 'white',
          position: 'top-right'
        })
      )
    })

    it('should show error notification on creation failure', async () => {
      CompanyService.createCompany.mockRejectedValue(new Error('Duplicate name'))
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      wrapper.vm.currentCompany = { name: 'Test Co', shortName: 'TC', logo: '' }

      wrapper.vm.createCompany()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'negative',
          textColor: 'white',
          position: 'top-right'
        })
      )
      consoleSpy.mockRestore()
    })

    it('should not call service if name is empty', () => {
      wrapper.vm.currentCompany.name = ''
      wrapper.vm.createCompany()

      expect(CompanyService.createCompany).not.toHaveBeenCalled()
    })
  })

  describe('updateCompany', () => {
    let wrapper

    beforeEach(async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should validate name is required', () => {
      wrapper.vm.currentCompany.name = ''

      wrapper.vm.updateCompany()

      expect(wrapper.vm.errors.name).toBe('Name is required')
      expect(CompanyService.updateCompany).not.toHaveBeenCalled()
    })

    it('should call CompanyService.updateCompany with id and company data', async () => {
      CompanyService.updateCompany.mockResolvedValue({})

      wrapper.vm.idUpdate = 'abc123'
      wrapper.vm.currentCompany = { name: 'Updated Co', shortName: 'UC', logo: '' }
      wrapper.vm.$.refs.editModal = { hide: vi.fn() }

      wrapper.vm.updateCompany()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(CompanyService.updateCompany).toHaveBeenCalledWith('abc123', {
        name: 'Updated Co',
        shortName: 'UC',
        logo: ''
      })
    })

    it('should refresh companies list after successful update', async () => {
      CompanyService.updateCompany.mockResolvedValue({})
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })

      wrapper.vm.idUpdate = 'abc123'
      wrapper.vm.currentCompany = { name: 'Updated Co', shortName: 'UC', logo: '' }
      wrapper.vm.$.refs.editModal = { hide: vi.fn() }

      wrapper.vm.updateCompany()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // getCompanies called once on mount + once after update
      expect(CompanyService.getCompanies).toHaveBeenCalledTimes(2)
    })

    it('should show success notification after update', async () => {
      CompanyService.updateCompany.mockResolvedValue({})

      wrapper.vm.idUpdate = 'abc123'
      wrapper.vm.currentCompany = { name: 'Updated Co', shortName: 'UC', logo: '' }
      wrapper.vm.$.refs.editModal = { hide: vi.fn() }

      wrapper.vm.updateCompany()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'positive',
          textColor: 'white',
          position: 'top-right'
        })
      )
    })

    it('should show error notification on update failure', async () => {
      CompanyService.updateCompany.mockRejectedValue(new Error('Update failed'))

      wrapper.vm.idUpdate = 'abc123'
      wrapper.vm.currentCompany = { name: 'Updated Co', shortName: 'UC', logo: '' }

      wrapper.vm.updateCompany()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Update failed',
          color: 'negative'
        })
      )
    })
  })

  describe('deleteCompany', () => {
    let wrapper

    beforeEach(async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should call CompanyService.deleteCompany with the company id', async () => {
      CompanyService.deleteCompany.mockResolvedValue({})

      wrapper.vm.deleteCompany('abc123')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(CompanyService.deleteCompany).toHaveBeenCalledWith('abc123')
    })

    it('should refresh companies list after successful deletion', async () => {
      CompanyService.deleteCompany.mockResolvedValue({})
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })

      wrapper.vm.deleteCompany('abc123')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // getCompanies called once on mount + once after delete
      expect(CompanyService.getCompanies).toHaveBeenCalledTimes(2)
    })

    it('should show success notification after deletion', async () => {
      CompanyService.deleteCompany.mockResolvedValue({})

      wrapper.vm.deleteCompany('abc123')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'positive',
          textColor: 'white',
          position: 'top-right'
        })
      )
    })

    it('should show error notification on deletion failure', async () => {
      CompanyService.deleteCompany.mockRejectedValue(new Error('Delete failed'))

      wrapper.vm.deleteCompany('abc123')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Delete failed',
          color: 'negative'
        })
      )
    })
  })

  describe('confirmDeleteCompany', () => {
    let wrapper

    beforeEach(async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should show a confirmation dialog', () => {
      const company = { _id: 'abc123', name: 'Test Co' }

      wrapper.vm.confirmDeleteCompany(company)

      expect(Dialog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: expect.objectContaining({ color: 'negative' }),
          cancel: expect.objectContaining({ color: 'white' })
        })
      )
    })
  })

  describe('clone', () => {
    let wrapper

    beforeEach(async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should copy row data to currentCompany and set idUpdate', () => {
      const row = { _id: 'abc123', name: 'Test Co', shortName: 'TC', logo: 'data:image/png;base64,...' }

      wrapper.vm.clone(row)

      expect(wrapper.vm.currentCompany.name).toBe('Test Co')
      expect(wrapper.vm.currentCompany.shortName).toBe('TC')
      expect(wrapper.vm.currentCompany.logo).toBe('data:image/png;base64,...')
      expect(wrapper.vm.idUpdate).toBe('abc123')
    })

    it('should clean current company before cloning', () => {
      // Set some existing data
      wrapper.vm.currentCompany = { name: 'Old', shortName: 'O', logo: 'old-logo' }

      const row = { _id: 'new123', name: 'New Co', shortName: 'NC', logo: '' }

      wrapper.vm.clone(row)

      expect(wrapper.vm.currentCompany.name).toBe('New Co')
      expect(wrapper.vm.currentCompany.shortName).toBe('NC')
      expect(wrapper.vm.currentCompany.logo).toBe('')
    })
  })

  describe('cleanErrors', () => {
    it('should reset error messages', async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.errors.name = 'Some error'
      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.name).toBe('')
    })
  })

  describe('cleanCurrentCompany', () => {
    it('should reset currentCompany fields', async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCompany = { name: 'Test', shortName: 'T', logo: 'some-logo' }
      wrapper.vm.cleanCurrentCompany()

      expect(wrapper.vm.currentCompany.name).toBe('')
      expect(wrapper.vm.currentCompany.shortName).toBe('')
      expect(wrapper.vm.currentCompany.logo).toBe('')
    })
  })

  describe('handleImage', () => {
    it('should read file and set logo on currentCompany', async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      // Create a mock FileReader
      const mockResult = 'data:image/png;base64,abc123'
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: mockResult,
        onloadend: null
      }
      vi.spyOn(global, 'FileReader').mockImplementation(function() {
        return mockFileReader
      })

      const mockFile = new Blob(['test'], { type: 'image/png' })
      wrapper.vm.handleImage([mockFile])

      // Simulate the file being read
      mockFileReader.onloadend()

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile)
      expect(wrapper.vm.currentCompany.logo).toBe(mockResult)

      global.FileReader.mockRestore()
    })
  })

  describe('dblClick', () => {
    it('should clone the row and show edit modal', async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const row = { _id: 'abc123', name: 'Test Co', shortName: 'TC', logo: '' }
      const mockShow = vi.fn()
      wrapper.vm.$.refs.editModal = { show: mockShow }

      wrapper.vm.dblClick({}, row)

      expect(wrapper.vm.currentCompany.name).toBe('Test Co')
      expect(wrapper.vm.idUpdate).toBe('abc123')
      expect(mockShow).toHaveBeenCalled()
    })
  })

  describe('Data Binding', () => {
    it('should have all required data properties for company form', async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      // Verify all data properties exist
      expect('companies' in wrapper.vm).toBe(true)
      expect('loading' in wrapper.vm).toBe(true)
      expect('search' in wrapper.vm).toBe(true)
      expect('errors' in wrapper.vm).toBe(true)
      expect('currentCompany' in wrapper.vm).toBe(true)
      expect('idUpdate' in wrapper.vm).toBe(true)
      expect('pagination' in wrapper.vm).toBe(true)
      expect('dtHeaders' in wrapper.vm).toBe(true)
    })

    it('should pass correct company data to create service', async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })
      CompanyService.createCompany.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentCompany.name = 'New Company'
      wrapper.vm.currentCompany.shortName = 'NC'
      wrapper.vm.currentCompany.logo = 'data:image/png;base64,test'
      wrapper.vm.$.refs.createModal = { hide: vi.fn() }

      wrapper.vm.createCompany()
      await wrapper.vm.$nextTick()

      expect(CompanyService.createCompany).toHaveBeenCalledWith({
        name: 'New Company',
        shortName: 'NC',
        logo: 'data:image/png;base64,test'
      })
    })

    it('should pass correct company data to update service', async () => {
      CompanyService.getCompanies.mockResolvedValue({
        data: { datas: [] }
      })
      CompanyService.updateCompany.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.idUpdate = 'company-id-1'
      wrapper.vm.currentCompany.name = 'Updated Company'
      wrapper.vm.currentCompany.shortName = 'UC'
      wrapper.vm.currentCompany.logo = ''
      wrapper.vm.$.refs.editModal = { hide: vi.fn() }

      wrapper.vm.updateCompany()
      await wrapper.vm.$nextTick()

      expect(CompanyService.updateCompany).toHaveBeenCalledWith('company-id-1', {
        name: 'Updated Company',
        shortName: 'UC',
        logo: ''
      })
    })
  })
})
