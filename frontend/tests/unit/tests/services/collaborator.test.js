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
import CollaboratorService from '@/services/collaborator'

describe('CollaboratorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCollabs', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ _id: '1', username: 'collab1', role: 'user' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await CollaboratorService.getCollabs()

      expect(api.get).toHaveBeenCalledWith('users')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(CollaboratorService.getCollabs()).rejects.toEqual(mockError)
    })
  })

  describe('createCollab', () => {
    it('should call the correct API endpoint with collaborator data', async () => {
      const collabData = { username: 'newcollab', password: 'securepass', role: 'user' }
      const mockResponse = { data: { datas: { _id: '1', username: 'newcollab', role: 'user' } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await CollaboratorService.createCollab(collabData)

      expect(api.post).toHaveBeenCalledWith('users', collabData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(CollaboratorService.createCollab({})).rejects.toEqual(mockError)
    })
  })

  describe('updateCollab', () => {
    it('should call the correct API endpoint with collaborator ID and data', async () => {
      const collabId = 'abc123'
      const collabData = { username: 'updatedcollab', role: 'admin' }
      const mockResponse = { data: { datas: { _id: collabId, ...collabData } } }
      api.put.mockResolvedValue(mockResponse)

      const result = await CollaboratorService.updateCollab(collabId, collabData)

      expect(api.put).toHaveBeenCalledWith('users/abc123', collabData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'User not found' } } }
      api.put.mockRejectedValue(mockError)

      await expect(CollaboratorService.updateCollab('invalid', {})).rejects.toEqual(mockError)
    })
  })

  describe('deleteCollab', () => {
    it('should call the correct API endpoint with collaborator ID', async () => {
      const collabId = 'abc123'
      const mockResponse = { data: { datas: 'User deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await CollaboratorService.deleteCollab(collabId)

      expect(api.delete).toHaveBeenCalledWith('users/abc123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'User not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(CollaboratorService.deleteCollab('invalid')).rejects.toEqual(mockError)
    })
  })
})
