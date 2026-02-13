import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

// Mock dependencies BEFORE importing the component
vi.mock('@/services/template', () => ({
  default: {
    getTemplates: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    downloadTemplate: vi.fn()
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
        onOk: vi.fn((cb) => {
          // Store the callback for testing
          Dialog._onOkCallback = cb
          return { onCancel: vi.fn() }
        })
      }))
    },
    Notify: {
      create: vi.fn()
    },
    exportFile: vi.fn()
  }
})

// Mock the user store before importing the component
vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => ({
    isAllowed: vi.fn(() => true)
  }))
}))

import TemplateService from '@/services/template'
import { Dialog, Notify, exportFile } from 'quasar'
import TemplatesPage from '@/pages/data/templates/index.vue'

/**
 * Helper to mock $refs on a Vue 3 component instance.
 * Vue 3 proxies don't allow direct assignment to $refs,
 * so we use Object.defineProperty on the underlying component instance.
 */
function mockRefs(wrapper, refs) {
  const vm = wrapper.vm
  // Access the internal component instance and set refs there
  const internalInstance = vm.$.refs
  Object.assign(internalInstance, refs)
}

describe('Templates Page', () => {
  let router, pinia, i18n

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/data/templates', component: TemplatesPage }
      ]
    })

    i18n = createI18n({
      legacy: false,
      globalInjection: true,
      locale: 'en-US',
      fallbackLocale: 'en-US',
      messages: {
        'en-US': {}
      }
    })

    vi.clearAllMocks()

    // Default: getTemplates resolves with empty array
    TemplateService.getTemplates.mockResolvedValue({
      data: { datas: [] }
    })
  })

  const createWrapper = (options = {}) => {
    return mount(TemplatesPage, {
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
          'q-space': true,
          'q-separator': true,
          'q-uploader': true,
          'q-field': true,
          'q-select': true,
          'q-pagination': true,
          'q-td': true,
          'q-tr': true,
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
    it('should call getTemplates on mount', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(TemplateService.getTemplates).toHaveBeenCalled()
    })

    it('should set loading to true initially', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.loading).toBe(true)
    })

    it('should populate templates list after fetch', async () => {
      const mockTemplates = [
        { _id: '1', name: 'Template1', ext: 'docx' },
        { _id: '2', name: 'Template2', ext: 'pptx' }
      ]
      TemplateService.getTemplates.mockResolvedValue({
        data: { datas: mockTemplates }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.templates).toEqual(mockTemplates)
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should have correct initial data', () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.search).toEqual({ name: '', ext: '' })
      expect(wrapper.vm.errors).toEqual({ name: '', file: '' })
      expect(wrapper.vm.currentTemplate).toEqual({ name: '', file: '', ext: '' })
      expect(wrapper.vm.templateId).toBe('')
      expect(wrapper.vm.pagination.page).toBe(1)
      expect(wrapper.vm.pagination.rowsPerPage).toBe(25)
      expect(wrapper.vm.pagination.sortBy).toBe('name')
    })
  })

  describe('createTemplate', () => {
    it('should validate name is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentTemplate.name = ''
      wrapper.vm.currentTemplate.file = 'base64data'
      wrapper.vm.createTemplate()

      expect(wrapper.vm.errors.name).toBe('msg.nameRequired')
      expect(TemplateService.createTemplate).not.toHaveBeenCalled()
    })

    it('should validate file is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentTemplate.name = 'Test Template'
      wrapper.vm.currentTemplate.file = ''
      wrapper.vm.createTemplate()

      expect(wrapper.vm.errors.file).toBe('msg.fileRequired')
      expect(TemplateService.createTemplate).not.toHaveBeenCalled()
    })

    it('should validate both name and file are required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentTemplate.name = ''
      wrapper.vm.currentTemplate.file = ''
      wrapper.vm.createTemplate()

      expect(wrapper.vm.errors.name).toBe('msg.nameRequired')
      expect(wrapper.vm.errors.file).toBe('msg.fileRequired')
      expect(TemplateService.createTemplate).not.toHaveBeenCalled()
    })

    it('should call TemplateService.createTemplate with valid data', async () => {
      TemplateService.createTemplate.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentTemplate.name = 'New Template'
      wrapper.vm.currentTemplate.file = 'base64data'
      wrapper.vm.currentTemplate.ext = 'docx'

      mockRefs(wrapper, { createModal: { hide: vi.fn() } })

      wrapper.vm.createTemplate()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(TemplateService.createTemplate).toHaveBeenCalledWith({
        name: 'New Template',
        file: 'base64data',
        ext: 'docx'
      })
    })

    it('should show success notification on create', async () => {
      TemplateService.createTemplate.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentTemplate.name = 'New Template'
      wrapper.vm.currentTemplate.file = 'base64data'
      mockRefs(wrapper, { createModal: { hide: vi.fn() } })

      wrapper.vm.createTemplate()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.templateCreatedOk',
          color: 'positive'
        })
      )
    })

    it('should refresh templates after successful create', async () => {
      TemplateService.createTemplate.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      // Reset the call count from mount
      TemplateService.getTemplates.mockClear()
      TemplateService.getTemplates.mockResolvedValue({ data: { datas: [] } })

      wrapper.vm.currentTemplate.name = 'New Template'
      wrapper.vm.currentTemplate.file = 'base64data'
      mockRefs(wrapper, { createModal: { hide: vi.fn() } })

      wrapper.vm.createTemplate()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(TemplateService.getTemplates).toHaveBeenCalled()
    })

    it('should show error notification on create failure', async () => {
      TemplateService.createTemplate.mockRejectedValue({
        response: { data: { datas: 'Template already exists' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentTemplate.name = 'Duplicate Template'
      wrapper.vm.currentTemplate.file = 'base64data'
      wrapper.vm.createTemplate()

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Template already exists',
          color: 'negative'
        })
      )
    })

    it('should clear errors before validation', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.errors.name = 'Previous error'
      wrapper.vm.errors.file = 'Previous error'

      wrapper.vm.currentTemplate.name = ''
      wrapper.vm.currentTemplate.file = ''
      wrapper.vm.createTemplate()

      // Errors should have been cleared and then re-set by validation
      expect(wrapper.vm.errors.name).toBe('msg.nameRequired')
      expect(wrapper.vm.errors.file).toBe('msg.fileRequired')
    })
  })

  describe('updateTemplate', () => {
    it('should validate name is required', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentTemplate.name = ''
      wrapper.vm.templateId = '123'
      wrapper.vm.updateTemplate()

      expect(wrapper.vm.errors.name).toBe('msg.nameRequired')
      expect(TemplateService.updateTemplate).not.toHaveBeenCalled()
    })

    it('should call TemplateService.updateTemplate with valid data', async () => {
      TemplateService.updateTemplate.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.templateId = 'tmpl123'
      wrapper.vm.currentTemplate.name = 'Updated Template'
      wrapper.vm.currentTemplate.file = 'newbase64data'
      wrapper.vm.currentTemplate.ext = 'docx'
      mockRefs(wrapper, { editModal: { hide: vi.fn() } })

      wrapper.vm.updateTemplate()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(TemplateService.updateTemplate).toHaveBeenCalledWith('tmpl123', {
        name: 'Updated Template',
        file: 'newbase64data',
        ext: 'docx'
      })
    })

    it('should show success notification on update', async () => {
      TemplateService.updateTemplate.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.templateId = 'tmpl123'
      wrapper.vm.currentTemplate.name = 'Updated Template'
      mockRefs(wrapper, { editModal: { hide: vi.fn() } })

      wrapper.vm.updateTemplate()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.templateUpdatedOk',
          color: 'positive'
        })
      )
    })

    it('should show error notification on update failure', async () => {
      TemplateService.updateTemplate.mockRejectedValue({
        response: { data: { datas: 'Update failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.templateId = 'tmpl123'
      wrapper.vm.currentTemplate.name = 'Updated Template'
      wrapper.vm.updateTemplate()

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

    it('should not require file for update (only name is required)', async () => {
      TemplateService.updateTemplate.mockResolvedValue({})

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.templateId = 'tmpl123'
      wrapper.vm.currentTemplate.name = 'Updated Template'
      wrapper.vm.currentTemplate.file = ''
      mockRefs(wrapper, { editModal: { hide: vi.fn() } })

      wrapper.vm.updateTemplate()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(TemplateService.updateTemplate).toHaveBeenCalled()
    })
  })

  describe('deleteTemplate', () => {
    it('should call TemplateService.deleteTemplate', async () => {
      TemplateService.deleteTemplate.mockResolvedValue({
        data: { datas: 'Template deleted' }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteTemplate('tmpl123')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(TemplateService.deleteTemplate).toHaveBeenCalledWith('tmpl123')
    })

    it('should show success notification on delete', async () => {
      TemplateService.deleteTemplate.mockResolvedValue({
        data: { datas: 'Template deleted successfully' }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteTemplate('tmpl123')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Template deleted successfully',
          color: 'positive'
        })
      )
    })

    it('should refresh templates after successful delete', async () => {
      TemplateService.deleteTemplate.mockResolvedValue({
        data: { datas: 'Deleted' }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      TemplateService.getTemplates.mockClear()
      TemplateService.getTemplates.mockResolvedValue({ data: { datas: [] } })

      wrapper.vm.deleteTemplate('tmpl123')
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(TemplateService.getTemplates).toHaveBeenCalled()
    })

    it('should show error notification on delete failure', async () => {
      TemplateService.deleteTemplate.mockRejectedValue({
        response: { data: { datas: 'Delete failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteTemplate('tmpl123')
      await wrapper.vm.$nextTick()
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

  describe('confirmDeleteTemplate', () => {
    it('should show confirmation dialog', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const row = { _id: 'tmpl123', name: 'MyTemplate' }
      wrapper.vm.confirmDeleteTemplate(row)

      expect(Dialog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'msg.confirmSuppression'
        })
      )
    })
  })

  describe('downloadTemplate', () => {
    it('should call TemplateService.downloadTemplate with row id', async () => {
      TemplateService.downloadTemplate.mockResolvedValue({
        data: new Blob(['test'])
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const row = { _id: 'tmpl123', name: 'MyTemplate', ext: 'docx' }
      wrapper.vm.downloadTemplate(row)

      expect(TemplateService.downloadTemplate).toHaveBeenCalledWith('tmpl123')
    })

    it('should call exportFile with correct filename', async () => {
      const blobData = new Blob(['test'])
      TemplateService.downloadTemplate.mockResolvedValue({ data: blobData })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const row = { _id: 'tmpl123', name: 'MyTemplate', ext: 'docx' }
      wrapper.vm.downloadTemplate(row)
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(exportFile).toHaveBeenCalledWith(
        'MyTemplate.docx',
        blobData,
        { type: 'application/octet-stream' }
      )
    })

    it('should default extension to docx when ext is missing', async () => {
      const blobData = new Blob(['test'])
      TemplateService.downloadTemplate.mockResolvedValue({ data: blobData })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const row = { _id: 'tmpl123', name: 'MyTemplate', ext: '' }
      wrapper.vm.downloadTemplate(row)
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(exportFile).toHaveBeenCalledWith(
        'MyTemplate.docx',
        blobData,
        { type: 'application/octet-stream' }
      )
    })

    it('should show notification when template not found (404)', async () => {
      TemplateService.downloadTemplate.mockRejectedValue({
        response: { status: 404 }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const row = { _id: 'tmpl123', name: 'MyTemplate', ext: 'docx' }
      wrapper.vm.downloadTemplate(row)
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.templateNotFound',
          color: 'negative'
        })
      )
    })
  })

  describe('clone', () => {
    it('should set currentTemplate name and templateId from row', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const row = { _id: 'tmpl123', name: 'TemplateToEdit' }
      wrapper.vm.clone(row)

      expect(wrapper.vm.currentTemplate.name).toBe('TemplateToEdit')
      expect(wrapper.vm.templateId).toBe('tmpl123')
    })

    it('should clean current template before cloning', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentTemplate.file = 'old-file-data'
      wrapper.vm.errors.name = 'old error'

      const row = { _id: 'tmpl123', name: 'NewTemplate' }
      wrapper.vm.clone(row)

      expect(wrapper.vm.currentTemplate.file).toBe('')
      expect(wrapper.vm.errors.name).toBe('')
    })
  })

  describe('cleanCurrentTemplate', () => {
    it('should reset currentTemplate and errors', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentTemplate.name = 'some template'
      wrapper.vm.currentTemplate.file = 'base64data'
      wrapper.vm.currentTemplate.ext = 'docx'
      wrapper.vm.templateId = 'tmpl123'
      wrapper.vm.errors.name = 'error'
      wrapper.vm.errors.file = 'error'

      wrapper.vm.cleanCurrentTemplate()

      expect(wrapper.vm.currentTemplate).toEqual({ name: '', file: '', ext: '' })
      expect(wrapper.vm.templateId).toBe('')
      expect(wrapper.vm.errors).toEqual({ name: '', file: '' })
    })
  })

  describe('cleanErrors', () => {
    it('should clear all error messages', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.errors.name = 'Name is required'
      wrapper.vm.errors.file = 'File is required'

      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.name).toBe('')
      expect(wrapper.vm.errors.file).toBe('')
    })
  })

  describe('handleFile', () => {
    it('should set file extension from uploaded file name', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const mockFile = {
        name: 'report.docx',
        size: 1024,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }

      // Mock FileReader - capture instance so we can trigger onloadend
      let fileReaderInstance
      vi.spyOn(global, 'FileReader').mockImplementation(function() {
        this.readAsDataURL = vi.fn(() => {
          setTimeout(() => {
            this.result = 'data:application/octet-stream;base64,dGVzdGRhdGE='
            if (this.onloadend) this.onloadend()
          }, 0)
        })
        fileReaderInstance = this
      })

      wrapper.vm.handleFile([mockFile])

      expect(wrapper.vm.currentTemplate.ext).toBe('docx')

      // Wait for the readAsDataURL setTimeout to trigger onloadend
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(wrapper.vm.currentTemplate.file).toBe('dGVzdGRhdGE=')
    })

    it('should handle pptx file extension', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const mockFile = { name: 'presentation.pptx', size: 2048 }

      vi.spyOn(global, 'FileReader').mockImplementation(function() {
        this.readAsDataURL = vi.fn(() => {
          setTimeout(() => {
            this.result = 'data:application/octet-stream;base64,cHB0eGRhdGE='
            if (this.onloadend) this.onloadend()
          }, 0)
        })
      })

      wrapper.vm.handleFile([mockFile])

      expect(wrapper.vm.currentTemplate.ext).toBe('pptx')
    })
  })

  describe('dblClick', () => {
    it('should open edit modal on double click when user has update permission', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const row = { _id: 'tmpl123', name: 'MyTemplate' }
      const mockShow = vi.fn()
      mockRefs(wrapper, { editModal: { show: mockShow } })

      wrapper.vm.dblClick({}, row)

      expect(wrapper.vm.currentTemplate.name).toBe('MyTemplate')
      expect(wrapper.vm.templateId).toBe('tmpl123')
      expect(mockShow).toHaveBeenCalled()
    })
  })

  describe('getTemplates error handling', () => {
    it('should handle getTemplates error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      TemplateService.getTemplates.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
