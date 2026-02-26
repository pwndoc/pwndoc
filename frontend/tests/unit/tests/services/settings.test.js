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
import SettingsService from '@/services/settings'

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: { report: { enabled: true }, reviews: { enabled: false } } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await SettingsService.getSettings()

      expect(api.get).toHaveBeenCalledWith('settings')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(SettingsService.getSettings()).rejects.toEqual(mockError)
    })
  })

  describe('getPublicSettings', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: { publicField: 'value' } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await SettingsService.getPublicSettings()

      expect(api.get).toHaveBeenCalledWith('settings/public')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Unauthorized')
      api.get.mockRejectedValue(mockError)

      await expect(SettingsService.getPublicSettings()).rejects.toEqual(mockError)
    })
  })

  describe('updateSettings', () => {
    it('should call the correct API endpoint with settings data', async () => {
      const settingsData = { report: { enabled: true }, reviews: { enabled: true } }
      const mockResponse = { data: { datas: settingsData } }
      api.put.mockResolvedValue(mockResponse)

      const result = await SettingsService.updateSettings(settingsData)

      expect(api.put).toHaveBeenCalledWith('settings', settingsData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 403, data: { message: 'Forbidden' } } }
      api.put.mockRejectedValue(mockError)

      await expect(SettingsService.updateSettings({})).rejects.toEqual(mockError)
    })
  })

  describe('exportSettings', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: { export: 'base64data' } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await SettingsService.exportSettings()

      expect(api.get).toHaveBeenCalledWith('settings/export')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Export failed')
      api.get.mockRejectedValue(mockError)

      await expect(SettingsService.exportSettings()).rejects.toEqual(mockError)
    })
  })

  describe('revertDefaults', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: 'Settings reverted to defaults' } }
      api.put.mockResolvedValue(mockResponse)

      const result = await SettingsService.revertDefaults()

      expect(api.put).toHaveBeenCalledWith('settings/revert')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 500, data: { message: 'Internal server error' } } }
      api.put.mockRejectedValue(mockError)

      await expect(SettingsService.revertDefaults()).rejects.toEqual(mockError)
    })
  })
})
