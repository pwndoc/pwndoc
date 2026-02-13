import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock axios BEFORE importing the service
vi.mock('boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

import { api } from 'boot/axios'
import DataService from '@/services/data'

describe('DataService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- Roles ---

  describe('getRoles', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: ['admin', 'user'] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await DataService.getRoles()

      expect(api.get).toHaveBeenCalledWith('data/roles')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(DataService.getRoles()).rejects.toEqual(mockError)
    })
  })

  // --- Languages ---

  describe('getLanguages', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ language: 'en', locale: 'en-US' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await DataService.getLanguages()

      expect(api.get).toHaveBeenCalledWith('data/languages')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(DataService.getLanguages()).rejects.toEqual(mockError)
    })
  })

  describe('createLanguage', () => {
    it('should call the correct API endpoint with language data', async () => {
      const languageData = { language: 'French', locale: 'fr' }
      const mockResponse = { data: { datas: languageData } }
      api.post.mockResolvedValue(mockResponse)

      const result = await DataService.createLanguage(languageData)

      expect(api.post).toHaveBeenCalledWith('data/languages', languageData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(DataService.createLanguage({})).rejects.toEqual(mockError)
    })
  })

  describe('deleteLanguage', () => {
    it('should call the correct API endpoint with locale', async () => {
      const locale = 'fr'
      const mockResponse = { data: { datas: 'Language deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await DataService.deleteLanguage(locale)

      expect(api.delete).toHaveBeenCalledWith('data/languages/fr')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Language not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(DataService.deleteLanguage('invalid')).rejects.toEqual(mockError)
    })
  })

  describe('updateLanguages', () => {
    it('should call the correct API endpoint with languages array', async () => {
      const languages = [{ language: 'English', locale: 'en' }, { language: 'French', locale: 'fr' }]
      const mockResponse = { data: { datas: languages } }
      api.put.mockResolvedValue(mockResponse)

      const result = await DataService.updateLanguages(languages)

      expect(api.put).toHaveBeenCalledWith('data/languages', languages)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.put.mockRejectedValue(mockError)

      await expect(DataService.updateLanguages([])).rejects.toEqual(mockError)
    })
  })

  // --- Audit Types ---

  describe('getAuditTypes', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ name: 'default' }, { name: 'multi' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await DataService.getAuditTypes()

      expect(api.get).toHaveBeenCalledWith('data/audit-types')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(DataService.getAuditTypes()).rejects.toEqual(mockError)
    })
  })

  describe('createAuditType', () => {
    it('should call the correct API endpoint with audit type data', async () => {
      const auditType = { name: 'retest' }
      const mockResponse = { data: { datas: auditType } }
      api.post.mockResolvedValue(mockResponse)

      const result = await DataService.createAuditType(auditType)

      expect(api.post).toHaveBeenCalledWith('data/audit-types', auditType)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(DataService.createAuditType({})).rejects.toEqual(mockError)
    })
  })

  describe('deleteAuditType', () => {
    it('should call the correct API endpoint with audit type name', async () => {
      const name = 'retest'
      const mockResponse = { data: { datas: 'Audit type deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await DataService.deleteAuditType(name)

      expect(api.delete).toHaveBeenCalledWith('data/audit-types/retest')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Audit type not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(DataService.deleteAuditType('invalid')).rejects.toEqual(mockError)
    })
  })

  describe('updateAuditTypes', () => {
    it('should call the correct API endpoint with audit types array', async () => {
      const auditTypes = [{ name: 'default' }, { name: 'multi' }]
      const mockResponse = { data: { datas: auditTypes } }
      api.put.mockResolvedValue(mockResponse)

      const result = await DataService.updateAuditTypes(auditTypes)

      expect(api.put).toHaveBeenCalledWith('data/audit-types', auditTypes)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.put.mockRejectedValue(mockError)

      await expect(DataService.updateAuditTypes([])).rejects.toEqual(mockError)
    })
  })

  // --- Vulnerability Types ---

  describe('getVulnerabilityTypes', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ name: 'Web' }, { name: 'Network' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await DataService.getVulnerabilityTypes()

      expect(api.get).toHaveBeenCalledWith('data/vulnerability-types')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(DataService.getVulnerabilityTypes()).rejects.toEqual(mockError)
    })
  })

  describe('createVulnerabilityType', () => {
    it('should call the correct API endpoint with vulnerability type data', async () => {
      const vulnType = { name: 'Mobile' }
      const mockResponse = { data: { datas: vulnType } }
      api.post.mockResolvedValue(mockResponse)

      const result = await DataService.createVulnerabilityType(vulnType)

      expect(api.post).toHaveBeenCalledWith('data/vulnerability-types', vulnType)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(DataService.createVulnerabilityType({})).rejects.toEqual(mockError)
    })
  })

  describe('deleteVulnerabilityType', () => {
    it('should call the correct API endpoint with vulnerability type name', async () => {
      const name = 'Mobile'
      const mockResponse = { data: { datas: 'Vulnerability type deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await DataService.deleteVulnerabilityType(name)

      expect(api.delete).toHaveBeenCalledWith('data/vulnerability-types/Mobile')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Vulnerability type not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(DataService.deleteVulnerabilityType('invalid')).rejects.toEqual(mockError)
    })
  })

  describe('updateVulnTypes', () => {
    it('should call the correct API endpoint with vulnerability types array', async () => {
      const vulnTypes = [{ name: 'Web' }, { name: 'Network' }]
      const mockResponse = { data: { datas: vulnTypes } }
      api.put.mockResolvedValue(mockResponse)

      const result = await DataService.updateVulnTypes(vulnTypes)

      expect(api.put).toHaveBeenCalledWith('data/vulnerability-types', vulnTypes)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.put.mockRejectedValue(mockError)

      await expect(DataService.updateVulnTypes([])).rejects.toEqual(mockError)
    })
  })

  // --- Vulnerability Categories ---

  describe('getVulnerabilityCategories', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ name: 'OWASP Top 10' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await DataService.getVulnerabilityCategories()

      expect(api.get).toHaveBeenCalledWith('data/vulnerability-categories')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(DataService.getVulnerabilityCategories()).rejects.toEqual(mockError)
    })
  })

  describe('createVulnerabilityCategory', () => {
    it('should call the correct API endpoint with category data', async () => {
      const category = { name: 'OWASP Top 10' }
      const mockResponse = { data: { datas: category } }
      api.post.mockResolvedValue(mockResponse)

      const result = await DataService.createVulnerabilityCategory(category)

      expect(api.post).toHaveBeenCalledWith('data/vulnerability-categories', category)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(DataService.createVulnerabilityCategory({})).rejects.toEqual(mockError)
    })
  })

  describe('updateVulnerabilityCategories', () => {
    it('should call the correct API endpoint with categories array', async () => {
      const categories = [{ name: 'OWASP Top 10' }, { name: 'CWE' }]
      const mockResponse = { data: { datas: categories } }
      api.put.mockResolvedValue(mockResponse)

      const result = await DataService.updateVulnerabilityCategories(categories)

      expect(api.put).toHaveBeenCalledWith('data/vulnerability-categories/', categories)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.put.mockRejectedValue(mockError)

      await expect(DataService.updateVulnerabilityCategories([])).rejects.toEqual(mockError)
    })
  })

  describe('deleteVulnerabilityCategory', () => {
    it('should call the correct API endpoint with category name', async () => {
      const name = 'OWASP Top 10'
      const mockResponse = { data: { datas: 'Category deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await DataService.deleteVulnerabilityCategory(name)

      expect(api.delete).toHaveBeenCalledWith('data/vulnerability-categories/OWASP Top 10')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Category not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(DataService.deleteVulnerabilityCategory('invalid')).rejects.toEqual(mockError)
    })
  })

  // --- Custom Fields ---

  describe('getCustomFields', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ _id: '1', fieldType: 'text', label: 'Notes' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await DataService.getCustomFields()

      expect(api.get).toHaveBeenCalledWith('data/custom-fields')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(DataService.getCustomFields()).rejects.toEqual(mockError)
    })
  })

  describe('createCustomField', () => {
    it('should call the correct API endpoint with custom field data', async () => {
      const customField = { fieldType: 'text', label: 'Notes', display: 'general' }
      const mockResponse = { data: { datas: { _id: '1', ...customField } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await DataService.createCustomField(customField)

      expect(api.post).toHaveBeenCalledWith('data/custom-fields', customField)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(DataService.createCustomField({})).rejects.toEqual(mockError)
    })
  })

  describe('updateCustomFields', () => {
    it('should call the correct API endpoint with custom fields array', async () => {
      const customFields = [{ _id: '1', fieldType: 'text', label: 'Notes' }]
      const mockResponse = { data: { datas: customFields } }
      api.put.mockResolvedValue(mockResponse)

      const result = await DataService.updateCustomFields(customFields)

      expect(api.put).toHaveBeenCalledWith('data/custom-fields/', customFields)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.put.mockRejectedValue(mockError)

      await expect(DataService.updateCustomFields([])).rejects.toEqual(mockError)
    })
  })

  describe('deleteCustomField', () => {
    it('should call the correct API endpoint with custom field ID', async () => {
      const customFieldId = 'abc123'
      const mockResponse = { data: { datas: 'Custom field deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await DataService.deleteCustomField(customFieldId)

      expect(api.delete).toHaveBeenCalledWith('data/custom-fields/abc123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Custom field not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(DataService.deleteCustomField('invalid')).rejects.toEqual(mockError)
    })
  })

  // --- Sections ---

  describe('getSections', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ field: 'executive_summary', name: 'Executive Summary' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await DataService.getSections()

      expect(api.get).toHaveBeenCalledWith('data/sections')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(DataService.getSections()).rejects.toEqual(mockError)
    })
  })

  describe('getSectionsByLanguage', () => {
    it('should call the correct API endpoint with locale', async () => {
      const locale = 'en'
      const mockResponse = { data: { datas: [{ field: 'executive_summary', name: 'Executive Summary' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await DataService.getSectionsByLanguage(locale)

      expect(api.get).toHaveBeenCalledWith('data/sections/en')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(DataService.getSectionsByLanguage('invalid')).rejects.toEqual(mockError)
    })
  })

  describe('createSection', () => {
    it('should call the correct API endpoint with section data', async () => {
      const section = { field: 'methodology', name: 'Methodology', locale: 'en' }
      const mockResponse = { data: { datas: section } }
      api.post.mockResolvedValue(mockResponse)

      const result = await DataService.createSection(section)

      expect(api.post).toHaveBeenCalledWith('data/sections', section)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(DataService.createSection({})).rejects.toEqual(mockError)
    })
  })

  describe('deleteSection', () => {
    it('should call the correct API endpoint with field and locale', async () => {
      const field = 'methodology'
      const locale = 'en'
      const mockResponse = { data: { datas: 'Section deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await DataService.deleteSection(field, locale)

      expect(api.delete).toHaveBeenCalledWith('data/sections/methodology/en')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Section not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(DataService.deleteSection('invalid', 'xx')).rejects.toEqual(mockError)
    })
  })

  describe('updateSections', () => {
    it('should call the correct API endpoint with sections array', async () => {
      const sections = [{ field: 'executive_summary', name: 'Executive Summary', locale: 'en' }]
      const mockResponse = { data: { datas: sections } }
      api.put.mockResolvedValue(mockResponse)

      const result = await DataService.updateSections(sections)

      expect(api.put).toHaveBeenCalledWith('data/sections', sections)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.put.mockRejectedValue(mockError)

      await expect(DataService.updateSections([])).rejects.toEqual(mockError)
    })
  })
})
