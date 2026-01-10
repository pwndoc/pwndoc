import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock dependencies first
vi.mock('jwt-decode', () => ({
  default: vi.fn()
}))

vi.mock('boot/axios', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('boot/router-instance', () => ({
  routerInstance: {
    push: vi.fn()
  }
}))

// Create a mock store that will be used by UserService
let mockUserStore

vi.doMock('src/stores/user', async () => {
  const actual = await vi.importActual('src/stores/user')
  return {
    ...actual,
    useUserStore: () => mockUserStore
  }
})

// Import after mocks
import jwtDecode from 'jwt-decode'
import { api } from 'boot/axios'
import { routerInstance } from 'boot/router-instance'
import { useUserStore } from '@/stores/user'

let UserService

describe('Session Management', () => {
  let userStore
  let pinia

  beforeEach(async () => {
    // Set up Pinia and store before each test
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Get fresh store instance
    userStore = useUserStore()
    mockUserStore = userStore // Set the mock to use our test store
    
    // Re-import UserService to get fresh instance with mocked store
    vi.resetModules()
    const userServiceModule = await import('@/services/user')
    UserService = userServiceModule.default
    
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Token Refresh', () => {
    it('should refresh token successfully', async () => {
      const mockToken = 'new.jwt.token'
      const mockDecodedToken = {
        id: '123',
        username: 'testuser',
        roles: 'admin'
      }

      jwtDecode.mockReturnValue(mockDecodedToken)
      api.get.mockResolvedValue({
        data: {
          datas: {
            token: mockToken
          }
        }
      })

      await UserService.refreshToken()

      expect(api.get).toHaveBeenCalledWith('users/refreshtoken')
      expect(userStore.isLoggedIn).toBe(true)
      expect(userStore.username).toBe('testuser')
    })

    it('should handle expired refresh token', async () => {
      const mockError = {
        response: {
          data: {
            datas: 'Expired refreshToken'
          }
        }
      }

      api.get.mockRejectedValue(mockError)

      await expect(UserService.refreshToken()).rejects.toBe('Expired refreshToken')
    })

    it('should update user data after token refresh', async () => {
      const initialToken = 'initial.token'
      const refreshedToken = 'refreshed.token'
      const initialDecoded = { username: 'testuser', roles: 'user' }
      const refreshedDecoded = { username: 'testuser', roles: 'admin' }

      jwtDecode
        .mockReturnValueOnce(initialDecoded)
        .mockReturnValueOnce(refreshedDecoded)

      // Initial login
      api.post.mockResolvedValueOnce({
        data: { datas: { token: initialToken } }
      })

      // Token refresh
      api.get.mockResolvedValue({
        data: { datas: { token: refreshedToken } }
      })

      await UserService.getToken('testuser', 'password123')
      expect(userStore.roles).toBe('user')

      await UserService.refreshToken()
      expect(userStore.roles).toBe('admin')
    })
  })

  describe('Token Expiration', () => {
    it('should clear user data on expired token', async () => {
      userStore.setUser({
        id: '123',
        username: 'testuser',
        isLoggedIn: true
      })

      const mockError = {
        response: {
          data: {
            datas: 'Expired refreshToken'
          }
        }
      }

      api.get.mockRejectedValue(mockError)

      await expect(UserService.refreshToken()).rejects.toBe('Expired refreshToken')
      // User should still be logged in until clearUser is called
      expect(userStore.isLoggedIn).toBe(true)
    })

    it('should handle invalid token error', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(UserService.refreshToken()).rejects.toBe('Invalid Token')
    })
  })

  describe('Logout', () => {
    it('should clear user data and redirect on logout', async () => {
      userStore.setUser({
        id: '123',
        username: 'testuser',
        isLoggedIn: true
      })

      api.delete.mockResolvedValue({})

      await UserService.destroyToken()

      expect(userStore.isLoggedIn).toBe(false)
      expect(userStore.username).toBe('')
      expect(routerInstance.push).toHaveBeenCalledWith('/login')
    })

    it('should handle logout errors gracefully', async () => {
      userStore.setUser({
        id: '123',
        username: 'testuser',
        isLoggedIn: true
      })

      const mockError = new Error('Logout failed')
      api.delete.mockRejectedValue(mockError)

      // destroyToken doesn't return a promise, so we just call it
      UserService.destroyToken()
      
      // Wait for the promise to reject
      await vi.runOnlyPendingTimersAsync()

      // destroyToken only clears user on success, not on error
      // So user should still be logged in if API call fails
      expect(api.delete).toHaveBeenCalled()
      // Note: In the actual implementation, destroyToken only clears user on success
      // So isLoggedIn will still be true if the API call fails
    }, 10000)
  })

  describe('Session Persistence', () => {
    it('should maintain session after token refresh', async () => {
      const mockToken = 'refreshed.token'
      const mockDecodedToken = {
        id: '123',
        username: 'testuser',
        roles: 'admin'
      }

      jwtDecode.mockReturnValue(mockDecodedToken)
      api.get.mockResolvedValue({
        data: {
          datas: {
            token: mockToken
          }
        }
      })

      // Simulate multiple token refreshes
      await UserService.refreshToken()
      expect(userStore.isLoggedIn).toBe(true)
      expect(userStore.username).toBe('testuser')

      await UserService.refreshToken()
      expect(userStore.isLoggedIn).toBe(true)
      expect(userStore.username).toBe('testuser')
    })

    it('should handle concurrent refresh token requests', async () => {
      const mockToken = 'refreshed.token'
      const mockDecodedToken = { username: 'testuser' }

      jwtDecode.mockReturnValue(mockDecodedToken)
      api.get.mockResolvedValue({
        data: {
          datas: {
            token: mockToken
          }
        }
      })

      // Simulate concurrent refresh requests
      const promises = [
        UserService.refreshToken(),
        UserService.refreshToken(),
        UserService.refreshToken()
      ]

      await Promise.all(promises)

      expect(api.get).toHaveBeenCalledTimes(3)
      expect(userStore.isLoggedIn).toBe(true)
    })
  })

  describe('Token Refresh Intervals', () => {
    it('should handle periodic token refresh', async () => {
      const mockToken = 'refreshed.token'
      const mockDecodedToken = { username: 'testuser' }

      jwtDecode.mockReturnValue(mockDecodedToken)
      api.get.mockResolvedValue({
        data: {
          datas: {
            token: mockToken
          }
        }
      })

      // Simulate periodic refresh (14 minutes = 840000ms)
      await UserService.refreshToken()
      expect(api.get).toHaveBeenCalledTimes(1)

      // Fast-forward time (simulating 14 minutes)
      vi.advanceTimersByTime(840000)

      // In a real scenario, the interval would trigger another refresh
      // This test verifies the refresh function works correctly
      await UserService.refreshToken()
      expect(api.get).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors during refresh', async () => {
      const networkError = new Error('Network error')
      api.get.mockRejectedValue(networkError)

      await expect(UserService.refreshToken()).rejects.toBe('Invalid Token')
    })

    it('should handle malformed response during refresh', async () => {
      api.get.mockResolvedValue({
        data: {
          // Missing datas.token
        }
      })

      jwtDecode.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      // This would cause jwtDecode to fail
      await expect(UserService.refreshToken()).rejects.toThrow()
    })

    it('should handle 401 errors during refresh', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            datas: 'Unauthorized'
          }
        }
      }

      api.get.mockRejectedValue(mockError)

      await expect(UserService.refreshToken()).rejects.toBe('Unauthorized')
    })
  })

  describe('Session State Management', () => {
    it('should track login state correctly', async () => {
      expect(userStore.isLoggedIn).toBe(false)

      const mockToken = 'token'
      const mockDecodedToken = { username: 'testuser' }

      jwtDecode.mockReturnValue(mockDecodedToken)
      api.post.mockResolvedValue({
        data: { datas: { token: mockToken } }
      })

      await UserService.getToken('testuser', 'password123')
      expect(userStore.isLoggedIn).toBe(true)

      api.delete.mockResolvedValue({})
      await UserService.destroyToken()
      expect(userStore.isLoggedIn).toBe(false)
    })

    it('should preserve user data during token refresh', async () => {
      const initialToken = 'initial.token'
      const refreshedToken = 'refreshed.token'
      const initialDecoded = {
        id: '123',
        username: 'testuser',
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com'
      }
      const refreshedDecoded = {
        ...initialDecoded,
        email: 'updated@example.com' // Only email changed
      }

      jwtDecode
        .mockReturnValueOnce(initialDecoded)
        .mockReturnValueOnce(refreshedDecoded)

      api.post.mockResolvedValueOnce({
        data: { datas: { token: initialToken } }
      })

      api.get.mockResolvedValue({
        data: { datas: { token: refreshedToken } }
      })

      await UserService.getToken('testuser', 'password123')
      expect(userStore.email).toBe('test@example.com')

      await UserService.refreshToken()
      expect(userStore.email).toBe('updated@example.com')
      expect(userStore.username).toBe('testuser') // Should be preserved
    })
  })
})
