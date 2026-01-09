import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/stores/user'

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('should have default values', () => {
      const store = useUserStore()
      expect(store.id).toBe('')
      expect(store.username).toBe('')
      expect(store.role).toBe('')
      expect(store.firstname).toBe('')
      expect(store.lastname).toBe('')
      expect(store.email).toBe('')
      expect(store.phone).toBe('')
      expect(store.totpEnabled).toBe(false)
      expect(store.roles).toBe('')
      expect(store.isLoggedIn).toBe(false)
    })
  })

  describe('setUser', () => {
    it('should set user data from decoded token', () => {
      const store = useUserStore()
      const decodedToken = {
        id: '123',
        username: 'testuser',
        role: 'admin',
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com',
        phone: '1234567890',
        totpEnabled: true,
        roles: 'admin'
      }

      store.setUser(decodedToken)

      expect(store.id).toBe('123')
      expect(store.username).toBe('testuser')
      expect(store.role).toBe('admin')
      expect(store.firstname).toBe('Test')
      expect(store.lastname).toBe('User')
      expect(store.email).toBe('test@example.com')
      expect(store.phone).toBe('1234567890')
      expect(store.totpEnabled).toBe(true)
      expect(store.roles).toBe('admin')
      expect(store.isLoggedIn).toBe(true)
    })

    it('should handle partial token data', () => {
      const store = useUserStore()
      const decodedToken = {
        id: '123',
        username: 'testuser'
      }

      store.setUser(decodedToken)

      expect(store.id).toBe('123')
      expect(store.username).toBe('testuser')
      expect(store.isLoggedIn).toBe(true)
    })

    it('should handle null/undefined token', () => {
      const store = useUserStore()
      store.setUser(null)

      expect(store.id).toBeUndefined()
      expect(store.isLoggedIn).toBe(true)
    })
  })

  describe('clearUser', () => {
    it('should reset user data to default values', () => {
      const store = useUserStore()
      store.setUser({
        id: '123',
        username: 'testuser',
        role: 'admin',
        firstname: 'Test',
        lastname: 'User',
        totpEnabled: true,
        roles: 'admin'
      })

      store.clearUser()

      expect(store.username).toBe('')
      expect(store.role).toBe('')
      expect(store.firstname).toBe('')
      expect(store.lastname).toBe('')
      expect(store.totpEnabled).toBe(false)
      expect(store.roles).toBe('')
      expect(store.isLoggedIn).toBe(false)
    })
  })

  describe('isAllowed getter', () => {
    it('should return true for matching role', () => {
      const store = useUserStore()
      store.setUser({ roles: 'admin' })

      expect(store.isAllowed('admin')).toBe(true)
    })

    it('should return true for role with -all suffix', () => {
      const store = useUserStore()
      store.setUser({ roles: 'admin-all' })

      expect(store.isAllowed('admin')).toBe(true)
    })

    it('should return true for wildcard role', () => {
      const store = useUserStore()
      store.setUser({ roles: '*' })

      expect(store.isAllowed('admin')).toBe(true)
      expect(store.isAllowed('user')).toBe(true)
    })

    it('should return false for non-matching role', () => {
      const store = useUserStore()
      store.setUser({ roles: 'user' })

      expect(store.isAllowed('admin')).toBe(false)
    })

    it('should return false when roles is empty', () => {
      const store = useUserStore()
      store.setUser({ roles: '' })

      expect(store.isAllowed('admin')).toBe(false)
    })

    it('should return false when roles is undefined', () => {
      const store = useUserStore()
      store.setUser({})

      expect(store.isAllowed('admin')).toBe(false)
    })
  })
})
