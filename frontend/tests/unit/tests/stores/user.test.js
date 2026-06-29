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
      expect(store.roles).toEqual([])
      expect(store.firstname).toBe('')
      expect(store.lastname).toBe('')
      expect(store.email).toBe('')
      expect(store.phone).toBe('')
      expect(store.totpEnabled).toBe(false)
      expect(store.permissions).toEqual([])
      expect(store.isLoggedIn).toBe(false)
    })
  })

  describe('setUser', () => {
    it('should set user data from decoded token', () => {
      const store = useUserStore()
      const decodedToken = {
        id: '123',
        username: 'testuser',
        roles: ['admin'],
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com',
        phone: '1234567890',
        totpEnabled: true,
        permissions: ['users:read']
      }

      store.setUser(decodedToken)

      expect(store.id).toBe('123')
      expect(store.username).toBe('testuser')
      expect(store.roles).toEqual(['admin'])
      expect(store.firstname).toBe('Test')
      expect(store.lastname).toBe('User')
      expect(store.email).toBe('test@example.com')
      expect(store.phone).toBe('1234567890')
      expect(store.totpEnabled).toBe(true)
      expect(store.permissions).toEqual(['users:read'])
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
        roles: ['admin'],
        firstname: 'Test',
        lastname: 'User',
        totpEnabled: true,
        permissions: ['users:read']
      })

      store.clearUser()

      expect(store.username).toBe('')
      expect(store.firstname).toBe('')
      expect(store.lastname).toBe('')
      expect(store.totpEnabled).toBe(false)
      expect(store.roles).toEqual([])
      expect(store.permissions).toEqual([])
      expect(store.isLoggedIn).toBe(false)
    })
  })

  describe('isAllowed getter', () => {
    it('should return true for matching permission', () => {
      const store = useUserStore()
      store.setUser({ permissions: ['users:read'] })

      expect(store.isAllowed('users:read')).toBe(true)
    })

    it('should return true for permission with -all suffix', () => {
      const store = useUserStore()
      store.setUser({ permissions: ['users:read-all'] })

      expect(store.isAllowed('users:read')).toBe(true)
    })

    it('should return true for wildcard permissions', () => {
      const store = useUserStore()
      store.setUser({ permissions: '*' })

      expect(store.isAllowed('users:read')).toBe(true)
      expect(store.isAllowed('audits:create')).toBe(true)
    })

    it('should return false for non-matching permission', () => {
      const store = useUserStore()
      store.setUser({ permissions: ['users:read'] })

      expect(store.isAllowed('users:update')).toBe(false)
    })

    it('should return false when permissions is empty', () => {
      const store = useUserStore()
      store.setUser({ permissions: [] })

      expect(store.isAllowed('admin')).toBe(false)
    })

    it('should return false when permissions is undefined', () => {
      const store = useUserStore()
      store.setUser({})

      expect(store.isAllowed('admin')).toBe(false)
    })
  })
})
