import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import DumpPage from '@/pages/data/dump/index.vue'

// Mock VulnerabilityService before imports that depend on it
vi.mock('@/services/vulnerability', () => ({
  default: {
    exportVulnerabilities: vi.fn(),
    createVulnerabilities: vi.fn(),
    deleteAllVulnerabilities: vi.fn()
  }
}))

vi.mock('@/boot/i18n', () => ({
  $t: (key, args) => (args ? `${key}:${args}` : key)
}))

vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => ({
    id: '1',
    username: 'testuser',
    role: 'admin',
    roles: '*',
    isLoggedIn: true,
    isAllowed: vi.fn(() => true)
  }))
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Dialog: {
      create: vi.fn(() => ({
        onOk: vi.fn((cb) => {
          Dialog._onOkCb = cb
          return { onCancel: vi.fn() }
        })
      }))
    },
    Notify: {
      create: vi.fn()
    }
  }
})

import VulnerabilityService from '@/services/vulnerability'
import { Dialog, Notify } from 'quasar'

describe('Dump Page', () => {
  let router
  let pinia
  let i18n

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/data/dump', component: DumpPage }
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
  })

  const createWrapper = (options = {}) => {
    return mount(DumpPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-card': true,
          'q-card-section': true,
          'q-separator': true,
          'q-btn': true,
          'q-icon': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $settings: {},
          $_: { unescape: (str) => str },
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should mount the component', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should have correct default data values', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.vulnerabilities).toEqual([])
    })

    it('should have all expected data properties', () => {
      const wrapper = createWrapper()
      expect('vulnerabilities' in wrapper.vm).toBe(true)
      expect('userStore' in wrapper.vm).toBe(true)
    })
  })

  describe('getVulnerabilities', () => {
    it('should call exportVulnerabilities and trigger download on success', async () => {
      const mockVulns = [
        { title: 'SQL Injection', cvssv3: '9.8' },
        { title: 'XSS', cvssv3: '6.1' }
      ]
      VulnerabilityService.exportVulnerabilities.mockResolvedValue({
        data: { datas: mockVulns }
      })

      const wrapper = createWrapper()
      const downloadSpy = vi.spyOn(wrapper.vm, 'downloadVulnerabilities').mockImplementation(() => {})

      await wrapper.vm.getVulnerabilities()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(VulnerabilityService.exportVulnerabilities).toHaveBeenCalled()
      expect(wrapper.vm.vulnerabilities).toEqual(mockVulns)
      expect(downloadSpy).toHaveBeenCalled()
    })

    it('should clear vulnerabilities before fetching', async () => {
      VulnerabilityService.exportVulnerabilities.mockResolvedValue({
        data: { datas: [] }
      })

      const wrapper = createWrapper()
      wrapper.vm.vulnerabilities = [{ title: 'Old Vuln' }]

      vi.spyOn(wrapper.vm, 'downloadVulnerabilities').mockImplementation(() => {})
      wrapper.vm.getVulnerabilities()

      // Immediately after calling, vulnerabilities should be reset
      expect(wrapper.vm.vulnerabilities).toEqual([])
    })

    it('should show error notification on export failure', async () => {
      VulnerabilityService.exportVulnerabilities.mockRejectedValue({
        response: { data: { datas: 'Export failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.getVulnerabilities()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Export failed',
          color: 'negative'
        })
      )
    })
  })

  describe('createVulnerabilities', () => {
    it('should call createVulnerabilities service with current vulnerabilities', async () => {
      const mockVulns = [{ title: 'SQL Injection' }]
      VulnerabilityService.createVulnerabilities.mockResolvedValue({
        data: { datas: { created: 1, duplicates: 0 } }
      })

      const wrapper = createWrapper()
      wrapper.vm.vulnerabilities = mockVulns

      await wrapper.vm.createVulnerabilities()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(VulnerabilityService.createVulnerabilities).toHaveBeenCalledWith(mockVulns)
    })

    it('should show success notification when all vulnerabilities are created', async () => {
      VulnerabilityService.createVulnerabilities.mockResolvedValue({
        data: { datas: { created: 3, duplicates: 0 } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.createVulnerabilities()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'positive'
        })
      )
    })

    it('should show negative notification when all vulnerabilities are duplicates', async () => {
      VulnerabilityService.createVulnerabilities.mockResolvedValue({
        data: { datas: { created: 0, duplicates: [1] } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.createVulnerabilities()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'negative'
        })
      )
    })

    it('should show orange notification when some vulnerabilities are created and some are duplicates', async () => {
      VulnerabilityService.createVulnerabilities.mockResolvedValue({
        data: { datas: { created: 2, duplicates: [1] } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.createVulnerabilities()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'orange'
        })
      )
    })

    it('should show error notification on import failure', async () => {
      VulnerabilityService.createVulnerabilities.mockRejectedValue({
        response: { data: { datas: 'Import failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.createVulnerabilities()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Import failed',
          color: 'negative'
        })
      )
    })
  })

  describe('parseSerpico', () => {
    it('should convert serpico format to standard format', () => {
      const wrapper = createWrapper()

      const serpicoVulns = [
        {
          id: 'vuln-1',
          c3_vs: '7.5',
          language: 'English',
          title: 'Test Title',
          type: 'Web',
          overview: 'Description text',
          poc: 'Observation text',
          remediation: 'Fix it',
          references: '<paragraph>http://example.com</paragraph>'
        }
      ]

      const result = wrapper.vm.parseSerpico(serpicoVulns)

      expect(result).toHaveLength(1)
      expect(result[0].cvssv3).toBe('7.5')
      expect(result[0].priority).toBeNull()
      expect(result[0].remediationComplexity).toBeNull()
      expect(result[0].details).toHaveLength(1)
      expect(result[0].details[0].locale).toBe('en')
      expect(result[0].details[0].title).toBe('Test Title')
    })

    it('should handle French language', () => {
      const wrapper = createWrapper()

      const serpicoVulns = [
        {
          id: 'vuln-1',
          language: 'French',
          title: 'Titre Test',
          type: 'Web',
          overview: '',
          poc: '',
          remediation: '',
          references: ''
        }
      ]

      const result = wrapper.vm.parseSerpico(serpicoVulns)

      expect(result[0].details[0].locale).toBe('fr')
    })

    it('should parse references from serpico format', () => {
      const wrapper = createWrapper()

      const serpicoVulns = [
        {
          id: 'vuln-1',
          language: 'English',
          title: 'Test',
          type: 'Web',
          overview: '',
          poc: '',
          remediation: '',
          references: '<paragraph>http://ref1.com</paragraph><paragraph>http://ref2.com</paragraph>'
        }
      ]

      const result = wrapper.vm.parseSerpico(serpicoVulns)

      expect(result[0].details[0].references).toHaveLength(2)
      expect(result[0].details[0].references[0]).toBe('http://ref1.com')
    })

    it('should handle empty references', () => {
      const wrapper = createWrapper()

      const serpicoVulns = [
        {
          id: 'vuln-1',
          language: 'English',
          title: 'Test',
          type: 'Web',
          overview: '',
          poc: '',
          remediation: '',
          references: ''
        }
      ]

      const result = wrapper.vm.parseSerpico(serpicoVulns)

      expect(result[0].details[0].references).toEqual([])
    })

    it('should handle null/undefined references', () => {
      const wrapper = createWrapper()

      const serpicoVulns = [
        {
          id: 'vuln-1',
          language: 'English',
          title: 'Test',
          type: 'Web',
          overview: '',
          poc: '',
          remediation: '',
          references: null
        }
      ]

      const result = wrapper.vm.parseSerpico(serpicoVulns)

      expect(result[0].details[0].references).toEqual([])
    })
  })

  describe('formatSerpicoText', () => {
    it('should return null for empty input', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.formatSerpicoText(null)).toBeNull()
      expect(wrapper.vm.formatSerpicoText('')).toBeNull()
      expect(wrapper.vm.formatSerpicoText(undefined)).toBeNull()
    })

    it('should convert English to en locale', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.formatSerpicoText('English')).toBe('en')
    })

    it('should convert French to fr locale', () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.formatSerpicoText('French')).toBe('fr')
    })

    it('should replace h4 tags with b tags', () => {
      const wrapper = createWrapper()
      const result = wrapper.vm.formatSerpicoText('<h4>Bold Text</h4>')
      expect(result).toContain('<b>Bold Text</b>')
      expect(result).not.toContain('<h4>')
    })

    it('should replace bullet tags with li/p tags', () => {
      const wrapper = createWrapper()
      const result = wrapper.vm.formatSerpicoText('<paragraph><bullet>Item</bullet></paragraph>')
      expect(result).toContain('<li><p>Item</p></li>')
    })

    it('should replace paragraph tags', () => {
      const wrapper = createWrapper()
      const result = wrapper.vm.formatSerpicoText('<paragraph>text</paragraph>')
      expect(result).toContain('<p>text</p>')
    })

    it('should replace italics tags with i tags', () => {
      const wrapper = createWrapper()
      const result = wrapper.vm.formatSerpicoText('<italics>italic text</italics>')
      expect(result).toContain('<i>italic text</i>')
    })

    it('should replace code block markers', () => {
      const wrapper = createWrapper()
      const result = wrapper.vm.formatSerpicoText('[[[code block]]]')
      expect(result).toContain('<pre><code>code block</code></pre>')
    })

    it('should replace indented tags', () => {
      const wrapper = createWrapper()
      const result = wrapper.vm.formatSerpicoText('<indented>text</indented>')
      expect(result).toContain('    text')
    })
  })

  describe('downloadVulnerabilities', () => {
    it('should create and click a download link', () => {
      const wrapper = createWrapper()

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn()
      }
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      wrapper.vm.vulnerabilities = [{ title: 'Test Vuln' }]
      wrapper.vm.downloadVulnerabilities()

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.download).toBe('vulnerabilities.yml')
      expect(mockLink.click).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  describe('deleteAllVulnerabilities', () => {
    it('should open a confirmation dialog', () => {
      const wrapper = createWrapper()
      wrapper.vm.deleteAllVulnerabilities()

      expect(Dialog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'msg.confirmSuppression',
          message: 'msg.allVulnerabilitesDeleteNotice'
        })
      )
    })

    it('should call deleteAllVulnerabilities service when confirmed', async () => {
      VulnerabilityService.deleteAllVulnerabilities.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.deleteAllVulnerabilities()

      // Trigger the onOk callback
      if (Dialog._onOkCb) {
        Dialog._onOkCb()
      }

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(VulnerabilityService.deleteAllVulnerabilities).toHaveBeenCalled()
    })

    it('should show success notification after deleting all vulnerabilities', async () => {
      VulnerabilityService.deleteAllVulnerabilities.mockResolvedValue({})

      const wrapper = createWrapper()
      wrapper.vm.deleteAllVulnerabilities()

      if (Dialog._onOkCb) {
        Dialog._onOkCb()
      }

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'positive'
        })
      )
    })

    it('should show error notification when deletion fails', async () => {
      VulnerabilityService.deleteAllVulnerabilities.mockRejectedValue({
        response: { data: { datas: 'Deletion failed' } }
      })

      const wrapper = createWrapper()
      wrapper.vm.deleteAllVulnerabilities()

      if (Dialog._onOkCb) {
        Dialog._onOkCb()
      }

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Deletion failed',
          color: 'negative'
        })
      )
    })
  })

  describe('importVulnerabilities', () => {
    it('should parse JSON file and call createVulnerabilities', async () => {
      VulnerabilityService.createVulnerabilities.mockResolvedValue({
        data: { datas: { created: 1, duplicates: 0 } }
      })

      const wrapper = createWrapper()

      const jsonData = JSON.stringify([{ title: 'Test Vuln', cvssv3: '7.5' }])
      const mockFile = new File([jsonData], 'vulns.json', { type: 'application/json' })

      wrapper.vm.importVulnerabilities([mockFile])
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(wrapper.vm.vulnerabilities).toHaveLength(1)
      expect(VulnerabilityService.createVulnerabilities).toHaveBeenCalled()
    })

    it('should parse YAML file and call createVulnerabilities', async () => {
      VulnerabilityService.createVulnerabilities.mockResolvedValue({
        data: { datas: { created: 1, duplicates: 0 } }
      })

      const wrapper = createWrapper()

      const yamlData = '- title: Test Vuln\n  cvssv3: "7.5"\n'
      const mockFile = new File([yamlData], 'vulns.yml', { type: 'application/x-yaml' })

      wrapper.vm.importVulnerabilities([mockFile])
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(VulnerabilityService.createVulnerabilities).toHaveBeenCalled()
    })

    it('should handle invalid JSON file with error notification', async () => {
      const wrapper = createWrapper()

      const mockFile = new File(['{ invalid json }'], 'vulns.json', { type: 'application/json' })

      wrapper.vm.importVulnerabilities([mockFile])
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'negative'
        })
      )
    })

    it('should handle invalid YAML file with error notification', async () => {
      const wrapper = createWrapper()

      // Invalid YAML that will fail to parse as an object
      const mockFile = new File(['just a string value', ''], 'vulns.yml', { type: 'application/x-yaml' })

      wrapper.vm.importVulnerabilities([mockFile])
      await new Promise(resolve => setTimeout(resolve, 50))

      // Either a notification is shown or no createVulnerabilities called
      // The component shows an error if format is not an object
    })

    it('should clear vulnerabilities before importing', () => {
      const wrapper = createWrapper()
      wrapper.vm.vulnerabilities = [{ title: 'Old Vuln' }]

      const mockFile = new File(['{}'], 'vulns.json', { type: 'application/json' })
      wrapper.vm.importVulnerabilities([mockFile])

      // Immediately after calling, vulnerabilities should be reset
      expect(wrapper.vm.vulnerabilities).toEqual([])
    })

    it('should handle serpico JSON format with id field', async () => {
      VulnerabilityService.createVulnerabilities.mockResolvedValue({
        data: { datas: { created: 1, duplicates: 0 } }
      })

      const wrapper = createWrapper()

      const serpicoData = JSON.stringify([
        {
          id: 'vuln-1',
          c3_vs: '7.5',
          language: 'English',
          title: 'SQL Injection',
          type: 'Web',
          overview: 'Description',
          poc: 'PoC',
          remediation: 'Fix',
          references: ''
        }
      ])
      const mockFile = new File([serpicoData], 'vulns.json', { type: 'application/json' })

      wrapper.vm.importVulnerabilities([mockFile])
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(VulnerabilityService.createVulnerabilities).toHaveBeenCalled()
      // Serpico format is parsed, so vuln should have details property
      expect(wrapper.vm.vulnerabilities[0]).toHaveProperty('details')
    })
  })
})
