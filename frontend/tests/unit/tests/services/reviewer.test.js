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
import ReviewerService from '@/services/reviewer'

describe('ReviewerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getReviewers', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ username: 'reviewer1' }, { username: 'reviewer2' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await ReviewerService.getReviewers()

      expect(api.get).toHaveBeenCalledWith('users/reviewers')
      expect(result).toEqual(mockResponse)
    })

    it('should return an empty list when no reviewers exist', async () => {
      const mockResponse = { data: { datas: [] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await ReviewerService.getReviewers()

      expect(api.get).toHaveBeenCalledWith('users/reviewers')
      expect(result).toEqual(mockResponse)
    })

    it('should reject when the API call fails', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(ReviewerService.getReviewers()).rejects.toEqual(mockError)
      expect(api.get).toHaveBeenCalledWith('users/reviewers')
    })
  })
})
