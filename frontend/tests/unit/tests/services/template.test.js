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
import TemplateService from '@/services/template'

describe('TemplateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTemplates', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ _id: '1', name: 'Default Template' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await TemplateService.getTemplates()

      expect(api.get).toHaveBeenCalledWith('templates')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(TemplateService.getTemplates()).rejects.toEqual(mockError)
    })
  })

  describe('createTemplate', () => {
    it('should call the correct API endpoint with template data', async () => {
      const templateData = { name: 'New Template', ext: 'docx' }
      const mockResponse = { data: { datas: { _id: '1', ...templateData } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await TemplateService.createTemplate(templateData)

      expect(api.post).toHaveBeenCalledWith('templates', templateData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(TemplateService.createTemplate({})).rejects.toEqual(mockError)
    })
  })

  describe('updateTemplate', () => {
    it('should call the correct API endpoint with template ID and data', async () => {
      const templateId = 'abc123'
      const templateData = { name: 'Updated Template' }
      const mockResponse = { data: { datas: { _id: templateId, ...templateData } } }
      api.put.mockResolvedValue(mockResponse)

      const result = await TemplateService.updateTemplate(templateId, templateData)

      expect(api.put).toHaveBeenCalledWith('templates/abc123', templateData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Template not found' } } }
      api.put.mockRejectedValue(mockError)

      await expect(TemplateService.updateTemplate('invalid', {})).rejects.toEqual(mockError)
    })
  })

  describe('deleteTemplate', () => {
    it('should call the correct API endpoint with template ID', async () => {
      const templateId = 'abc123'
      const mockResponse = { data: { datas: 'Template deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await TemplateService.deleteTemplate(templateId)

      expect(api.delete).toHaveBeenCalledWith('templates/abc123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Template not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(TemplateService.deleteTemplate('invalid')).rejects.toEqual(mockError)
    })
  })

  describe('downloadTemplate', () => {
    it('should call the correct API endpoint with template ID and blob response type', async () => {
      const templateId = 'abc123'
      const mockBlob = new Blob(['file content'], { type: 'application/octet-stream' })
      const mockResponse = { data: mockBlob }
      api.get.mockResolvedValue(mockResponse)

      const result = await TemplateService.downloadTemplate(templateId)

      expect(api.get).toHaveBeenCalledWith('templates/download/abc123', { responseType: 'blob' })
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Template not found' } } }
      api.get.mockRejectedValue(mockError)

      await expect(TemplateService.downloadTemplate('invalid')).rejects.toEqual(mockError)
    })
  })
})
