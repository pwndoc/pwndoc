import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock axios BEFORE importing the service
vi.mock('boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}))

import { api } from 'boot/axios'
import ImageService from '@/services/image'

describe('ImageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getImage', () => {
    it('should call the correct API endpoint with image ID', async () => {
      const imageId = 'img123'
      const mockResponse = { data: { datas: { _id: imageId, value: 'base64data' } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await ImageService.getImage(imageId)

      expect(api.get).toHaveBeenCalledWith('images/img123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Image not found' } } }
      api.get.mockRejectedValue(mockError)

      await expect(ImageService.getImage('invalid')).rejects.toEqual(mockError)
    })
  })

  describe('createImage', () => {
    it('should call the correct API endpoint with image data', async () => {
      const imageData = { value: 'base64data', name: 'screenshot.png' }
      const mockResponse = { data: { datas: { _id: 'img123', ...imageData } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await ImageService.createImage(imageData)

      expect(api.post).toHaveBeenCalledWith('images', imageData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(ImageService.createImage({})).rejects.toEqual(mockError)
    })
  })

  describe('deleteImage', () => {
    it('should call the correct API endpoint with image ID', async () => {
      const imageId = 'img123'
      const mockResponse = { data: { datas: 'Image deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await ImageService.deleteImage(imageId)

      expect(api.delete).toHaveBeenCalledWith('images/img123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Image not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(ImageService.deleteImage('invalid')).rejects.toEqual(mockError)
    })
  })
})
