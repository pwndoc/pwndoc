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
import CompanyService from '@/services/company'

describe('CompanyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCompanies', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ _id: '1', name: 'Acme Corp' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await CompanyService.getCompanies()

      expect(api.get).toHaveBeenCalledWith('companies')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(CompanyService.getCompanies()).rejects.toEqual(mockError)
    })
  })

  describe('createCompany', () => {
    it('should call the correct API endpoint with company data', async () => {
      const companyData = { name: 'Acme Corp', logo: '' }
      const mockResponse = { data: { datas: { _id: '1', ...companyData } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await CompanyService.createCompany(companyData)

      expect(api.post).toHaveBeenCalledWith('companies', companyData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(CompanyService.createCompany({})).rejects.toEqual(mockError)
    })
  })

  describe('updateCompany', () => {
    it('should call the correct API endpoint with company ID and data', async () => {
      const companyId = 'abc123'
      const companyData = { name: 'Updated Acme Corp' }
      const mockResponse = { data: { datas: { _id: companyId, ...companyData } } }
      api.put.mockResolvedValue(mockResponse)

      const result = await CompanyService.updateCompany(companyId, companyData)

      expect(api.put).toHaveBeenCalledWith('companies/abc123', companyData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Company not found' } } }
      api.put.mockRejectedValue(mockError)

      await expect(CompanyService.updateCompany('invalid', {})).rejects.toEqual(mockError)
    })
  })

  describe('deleteCompany', () => {
    it('should call the correct API endpoint with company ID', async () => {
      const companyId = 'abc123'
      const mockResponse = { data: { datas: 'Company deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await CompanyService.deleteCompany(companyId)

      expect(api.delete).toHaveBeenCalledWith('companies/abc123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Company not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(CompanyService.deleteCompany('invalid')).rejects.toEqual(mockError)
    })
  })
})
