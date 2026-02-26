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
import LanguagetoolRulesService from '@/services/languagetool-rules'

describe('LanguagetoolRulesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLanguages', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: ['en', 'fr', 'de'] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await LanguagetoolRulesService.getLanguages()

      expect(api.get).toHaveBeenCalledWith('languagetool-rules/languages')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(LanguagetoolRulesService.getLanguages()).rejects.toEqual(mockError)
    })
  })

  describe('getAll', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ _id: '1', language: 'en', ruleXml: '<rule/>' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await LanguagetoolRulesService.getAll()

      expect(api.get).toHaveBeenCalledWith('languagetool-rules')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(LanguagetoolRulesService.getAll()).rejects.toEqual(mockError)
    })
  })

  describe('get', () => {
    it('should call the correct API endpoint with rule ID', async () => {
      const ruleId = 'rule123'
      const mockResponse = { data: { datas: { _id: ruleId, language: 'en', ruleXml: '<rule/>' } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await LanguagetoolRulesService.get(ruleId)

      expect(api.get).toHaveBeenCalledWith('languagetool-rules/rule123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Rule not found' } } }
      api.get.mockRejectedValue(mockError)

      await expect(LanguagetoolRulesService.get('invalid')).rejects.toEqual(mockError)
    })
  })

  describe('create', () => {
    it('should call the correct API endpoint with language and ruleXml', async () => {
      const language = 'en'
      const ruleXml = '<rule><pattern><token>test</token></pattern></rule>'
      const mockResponse = { data: { datas: { _id: '1', language, ruleXml } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await LanguagetoolRulesService.create(language, ruleXml)

      expect(api.post).toHaveBeenCalledWith('languagetool-rules', { language, ruleXml })
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(LanguagetoolRulesService.create('', '')).rejects.toEqual(mockError)
    })
  })

  describe('delete', () => {
    it('should call the correct API endpoint with rule ID', async () => {
      const ruleId = 'rule123'
      const mockResponse = { data: { datas: 'Rule deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await LanguagetoolRulesService.delete(ruleId)

      expect(api.delete).toHaveBeenCalledWith('languagetool-rules/rule123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Rule not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(LanguagetoolRulesService.delete('invalid')).rejects.toEqual(mockError)
    })
  })
})
