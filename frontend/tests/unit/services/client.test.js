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
import ClientService from '@/services/client'

describe('ClientService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getClients', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ _id: '1', company: { name: 'Acme' } }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await ClientService.getClients()

      expect(api.get).toHaveBeenCalledWith('clients')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(ClientService.getClients()).rejects.toEqual(mockError)
    })
  })

  describe('createClient', () => {
    it('should call the correct API endpoint with client data', async () => {
      const clientData = { company: { name: 'Acme' }, email: 'contact@acme.com' }
      const mockResponse = { data: { datas: { _id: '1', ...clientData } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await ClientService.createClient(clientData)

      expect(api.post).toHaveBeenCalledWith('clients', clientData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(ClientService.createClient({})).rejects.toEqual(mockError)
    })
  })

  describe('updateClient', () => {
    it('should call the correct API endpoint with client ID and data', async () => {
      const clientId = 'abc123'
      const clientData = { company: { name: 'Updated Acme' } }
      const mockResponse = { data: { datas: { _id: clientId, ...clientData } } }
      api.put.mockResolvedValue(mockResponse)

      const result = await ClientService.updateClient(clientId, clientData)

      expect(api.put).toHaveBeenCalledWith('clients/abc123', clientData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Client not found' } } }
      api.put.mockRejectedValue(mockError)

      await expect(ClientService.updateClient('invalid', {})).rejects.toEqual(mockError)
    })
  })

  describe('deleteClient', () => {
    it('should call the correct API endpoint with client ID', async () => {
      const clientId = 'abc123'
      const mockResponse = { data: { datas: 'Client deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await ClientService.deleteClient(clientId)

      expect(api.delete).toHaveBeenCalledWith('clients/abc123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Client not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(ClientService.deleteClient('invalid')).rejects.toEqual(mockError)
    })
  })
})
