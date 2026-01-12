import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock dependencies first
vi.mock('jwt-decode', () => ({
  default: vi.fn()
}))

vi.mock('boot/axios', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    put: vi.fn()
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

describe('UserService', () => {
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
  })

  describe('getToken', () => {
    it('should successfully login and set user data', async () => {
      const mockToken = 'mock.jwt.token'
      const mockDecodedToken = {
        id: '123',
        username: 'testuser',
        role: 'admin',
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com',
        roles: 'admin'
      }

      jwtDecode.mockReturnValue(mockDecodedToken)
      api.post.mockResolvedValue({
        data: {
          datas: {
            token: mockToken
          }
        }
      })

      await UserService.getToken('testuser', 'password123')

      expect(api.post).toHaveBeenCalledWith('users/token', {
        username: 'testuser',
        password: 'password123',
        totpToken: undefined
      })
      expect(jwtDecode).toHaveBeenCalledWith(mockToken)
      expect(userStore.username).toBe('testuser')
      expect(userStore.isLoggedIn).toBe(true)
    })

    it('should handle TOTP token', async () => {
      const mockToken = 'mock.jwt.token'
      const mockDecodedToken = { username: 'testuser' }

      jwtDecode.mockReturnValue(mockDecodedToken)
      api.post.mockResolvedValue({
        data: {
          datas: {
            token: mockToken
          }
        }
      })

      await UserService.getToken('testuser', 'password123', '123456')

      expect(api.post).toHaveBeenCalledWith('users/token', {
        username: 'testuser',
        password: 'password123',
        totpToken: '123456'
      })
    })

    it('should reject on authentication failure', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' }
        }
      }

      api.post.mockRejectedValue(mockError)

      await expect(UserService.getToken('testuser', 'wrongpassword')).rejects.toEqual(mockError)
    })

    it('should handle network errors', async () => {
      const mockError = new Error('Network error')
      api.post.mockRejectedValue(mockError)

      await expect(UserService.getToken('testuser', 'password123')).rejects.toEqual(mockError)
    })
  })

  describe('refreshToken', () => {
    it('should successfully refresh token and update user data', async () => {
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
      expect(jwtDecode).toHaveBeenCalledWith(mockToken)
      expect(userStore.username).toBe('testuser')
      expect(userStore.isLoggedIn).toBe(true)
    })

    it('should reject with error message on expired token', async () => {
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

    it('should reject with "Invalid Token" on error without response', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(UserService.refreshToken()).rejects.toBe('Invalid Token')
    })

    it('should reject with error data when response has data', async () => {
      const mockError = {
        response: {
          data: {
            datas: 'Token refresh failed'
          }
        }
      }

      api.get.mockRejectedValue(mockError)

      await expect(UserService.refreshToken()).rejects.toBe('Token refresh failed')
    })
  })

  describe('destroyToken', () => {
    it('should logout user and redirect to login', async () => {
      // Set user as logged in first
      userStore.setUser({
        id: '123',
        username: 'testuser',
        isLoggedIn: true
      })

      api.delete.mockResolvedValue({})

      await UserService.destroyToken()

      expect(api.delete).toHaveBeenCalledWith('users/refreshtoken')
      expect(userStore.isLoggedIn).toBe(false)
      expect(userStore.username).toBe('')
      expect(routerInstance.push).toHaveBeenCalledWith('/login')
    })

    it('should handle logout errors gracefully', async () => {
      const mockError = new Error('Logout failed')
      api.delete.mockRejectedValue(mockError)

      // destroyToken doesn't return a promise, so we just call it
      // It should not throw, just log error
      UserService.destroyToken()
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Should still clear user if it was set, but in this case it wasn't
      expect(api.delete).toHaveBeenCalled()
    })
  })

  describe('initUser', () => {
    it('should successfully initialize first user', async () => {
      const mockToken = 'init.jwt.token'
      const mockDecodedToken = {
        id: '123',
        username: 'admin',
        firstname: 'Admin',
        lastname: 'User'
      }

      jwtDecode.mockReturnValue(mockDecodedToken)
      api.post.mockResolvedValue({
        data: {
          datas: {
            token: mockToken
          }
        }
      })

      await UserService.initUser('admin', 'Admin', 'User', 'Password123')

      expect(api.post).toHaveBeenCalledWith('users/init', {
        username: 'admin',
        firstname: 'Admin',
        lastname: 'User',
        password: 'Password123'
      })
      expect(jwtDecode).toHaveBeenCalledWith(mockToken)
    })

    it('should reject on initialization failure', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'User already exists' }
        }
      }

      api.post.mockRejectedValue(mockError)

      await expect(
        UserService.initUser('admin', 'Admin', 'User', 'Password123')
      ).rejects.toEqual(mockError)
    })
  })

  describe('isInit', () => {
    it('should check if system is initialized', async () => {
      api.get.mockResolvedValue({
        data: {
          datas: false
        }
      })

      const result = await UserService.isInit()

      expect(api.get).toHaveBeenCalledWith('users/init', { timeout: 10000 })
      expect(result.data.datas).toBe(false)
    })

    it('should return true when system is already initialized', async () => {
      api.get.mockResolvedValue({
        data: {
          datas: true
        }
      })

      const result = await UserService.isInit()
      expect(result.data.datas).toBe(true)
    })

    it('should handle timeout errors', async () => {
      const mockError = new Error('Timeout')
      api.get.mockRejectedValue(mockError)

      await expect(UserService.isInit()).rejects.toEqual(mockError)
    })
  })

  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com'
      }

      api.get.mockResolvedValue({
        data: mockProfile
      })

      const result = await UserService.getProfile()

      expect(api.get).toHaveBeenCalledWith('users/me')
      expect(result.data).toEqual(mockProfile)
    })
  })

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userData = {
        firstname: 'Updated',
        lastname: 'Name',
        email: 'updated@example.com'
      }

      api.put.mockResolvedValue({
        data: { ...userData, id: '123' }
      })

      const result = await UserService.updateProfile(userData)

      expect(api.put).toHaveBeenCalledWith('users/me', userData)
      expect(result.data.firstname).toBe('Updated')
    })
  })

  describe('TOTP methods', () => {
    it('should get TOTP QR code', async () => {
      const mockQrCode = { qrCode: 'data:image/png;base64,...' }

      api.get.mockResolvedValue({
        data: mockQrCode
      })

      const result = await UserService.getTotpQrCode()

      expect(api.get).toHaveBeenCalledWith('users/totp')
      expect(result.data).toEqual(mockQrCode)
    })

    it('should setup TOTP', async () => {
      api.post.mockResolvedValue({
        data: { success: true }
      })

      await UserService.setupTotp('123456', 'secret123')

      expect(api.post).toHaveBeenCalledWith('users/totp', {
        totpToken: '123456',
        totpSecret: 'secret123'
      })
    })

    it('should cancel TOTP', async () => {
      api.delete.mockResolvedValue({
        data: { success: true }
      })

      await UserService.cancelTotp('123456')

      expect(api.delete).toHaveBeenCalledWith('users/totp', {
        data: { totpToken: '123456' }
      })
    })
  })
})
