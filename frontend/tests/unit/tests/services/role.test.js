import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

import { api } from 'boot/axios'
import RoleService from '@/services/role'

describe('RoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRoles', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ name: 'admin' }, { name: 'user' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await RoleService.getRoles()

      expect(api.get).toHaveBeenCalledWith('data/roles')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(RoleService.getRoles()).rejects.toEqual(mockError)
    })
  })

  describe('getPermissionsCatalog', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ key: 'roles', permissions: [] }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await RoleService.getPermissionsCatalog()

      expect(api.get).toHaveBeenCalledWith('data/roles/permissions')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(RoleService.getPermissionsCatalog()).rejects.toEqual(mockError)
    })
  })

  describe('createRole', () => {
    it('should call the correct API endpoint with role data', async () => {
      const role = { name: 'reader', displayName: 'Reader', allows: ['clients:read'] }
      const mockResponse = { data: { datas: role } }
      api.post.mockResolvedValue(mockResponse)

      const result = await RoleService.createRole(role)

      expect(api.post).toHaveBeenCalledWith('data/roles', role)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { datas: 'Invalid permission' } } }
      api.post.mockRejectedValue(mockError)

      await expect(RoleService.createRole({})).rejects.toEqual(mockError)
    })
  })

  describe('updateRole', () => {
    it('should call the correct API endpoint with role name and data', async () => {
      const role = { displayName: 'Reader Updated', allows: ['clients:read'] }
      const mockResponse = { data: { datas: 'Role updated successfully' } }
      api.put.mockResolvedValue(mockResponse)

      const result = await RoleService.updateRole('reader', role)

      expect(api.put).toHaveBeenCalledWith('data/roles/reader', role)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { datas: 'Role not found' } } }
      api.put.mockRejectedValue(mockError)

      await expect(RoleService.updateRole('missing', {})).rejects.toEqual(mockError)
    })
  })

  describe('deleteRole', () => {
    it('should call the correct API endpoint with role name', async () => {
      const mockResponse = { data: { datas: 'Role deleted successfully' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await RoleService.deleteRole('reader')

      expect(api.delete).toHaveBeenCalledWith('data/roles/reader')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 403, data: { datas: 'System roles cannot be modified' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(RoleService.deleteRole('admin')).rejects.toEqual(mockError)
    })
  })
})
