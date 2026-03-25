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
import SpellcheckService from '@/services/spellcheck'

describe('SpellcheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getWords', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: ['word1', 'word2'] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await SpellcheckService.getWords()

      expect(api.get).toHaveBeenCalledWith('spellcheck/dict')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(SpellcheckService.getWords()).rejects.toEqual(mockError)
    })
  })

  describe('addWord', () => {
    it('should call the correct API endpoint with word data', async () => {
      const word = 'pentest'
      const mockResponse = { data: { datas: 'Word added' } }
      api.post.mockResolvedValue(mockResponse)

      const result = await SpellcheckService.addWord(word)

      expect(api.post).toHaveBeenCalledWith('spellcheck/dict', { word: 'pentest' })
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(SpellcheckService.addWord('')).rejects.toEqual(mockError)
    })
  })

  describe('deleteWord', () => {
    it('should call the correct API endpoint with word in request body', async () => {
      const word = 'pentest'
      const mockResponse = { data: { datas: 'Word deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await SpellcheckService.deleteWord(word)

      expect(api.delete).toHaveBeenCalledWith('spellcheck/dict', { data: { word: 'pentest' } })
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Word not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(SpellcheckService.deleteWord('nonexistent')).rejects.toEqual(mockError)
    })
  })

  describe('getCapabilities', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: { enabled: true, configured: true, hasApiKey: false, supportsCustomRules: false } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await SpellcheckService.getCapabilities()

      expect(api.get).toHaveBeenCalledWith('spellcheck/capabilities')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(SpellcheckService.getCapabilities()).rejects.toEqual(mockError)
    })
  })

  describe('testConnection', () => {
    it('should call the correct API endpoint with url, apiKey, and username', async () => {
      const mockResponse = { data: { datas: { reachable: true, supportsCustomRules: true, authValid: true, requiresApiKey: false } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await SpellcheckService.testConnection('http://lt:8020', 'mykey', 'myuser')

      expect(api.post).toHaveBeenCalledWith('spellcheck/test', {
        url: 'http://lt:8020',
        apiKey: 'mykey',
        username: 'myuser'
      })
      expect(result).toEqual(mockResponse)
    })

    it('should pass undefined values when not provided', async () => {
      const mockResponse = { data: { datas: { reachable: true } } }
      api.post.mockResolvedValue(mockResponse)

      await SpellcheckService.testConnection('http://lt:8020')

      expect(api.post).toHaveBeenCalledWith('spellcheck/test', {
        url: 'http://lt:8020',
        apiKey: undefined,
        username: undefined
      })
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { datas: 'url is required' } } }
      api.post.mockRejectedValue(mockError)

      await expect(SpellcheckService.testConnection()).rejects.toEqual(mockError)
    })
  })
})
