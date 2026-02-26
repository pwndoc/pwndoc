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
import AuditService from '@/services/audit'

describe('AuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- Audits CRUD ---

  describe('getAudits', () => {
    it('should call the correct API endpoint with no filters', async () => {
      const mockResponse = { data: { datas: [] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getAudits()

      expect(api.get).toHaveBeenCalledWith('audits', { params: {} })
      expect(result).toEqual(mockResponse)
    })

    it('should pass findingTitle filter as query param', async () => {
      const mockResponse = { data: { datas: [] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getAudits({ findingTitle: 'SQL Injection' })

      expect(api.get).toHaveBeenCalledWith('audits', { params: { findingTitle: 'SQL Injection' } })
      expect(result).toEqual(mockResponse)
    })

    it('should pass type filter as query param', async () => {
      const mockResponse = { data: { datas: [] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getAudits({ type: 'multi' })

      expect(api.get).toHaveBeenCalledWith('audits', { params: { type: 'multi' } })
      expect(result).toEqual(mockResponse)
    })

    it('should pass both findingTitle and type filters', async () => {
      const mockResponse = { data: { datas: [] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getAudits({ findingTitle: 'XSS', type: 'default' })

      expect(api.get).toHaveBeenCalledWith('audits', { params: { findingTitle: 'XSS', type: 'default' } })
      expect(result).toEqual(mockResponse)
    })

    it('should ignore unknown filter keys', async () => {
      const mockResponse = { data: { datas: [] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getAudits({ unknownKey: 'value' })

      expect(api.get).toHaveBeenCalledWith('audits', { params: {} })
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(AuditService.getAudits()).rejects.toEqual(mockError)
    })
  })

  describe('getAudit', () => {
    it('should call the correct API endpoint with audit ID', async () => {
      const mockResponse = { data: { datas: { _id: 'audit1', name: 'Test Audit' } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getAudit('audit1')

      expect(api.get).toHaveBeenCalledWith('audits/audit1')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Audit not found' } } }
      api.get.mockRejectedValue(mockError)

      await expect(AuditService.getAudit('invalid')).rejects.toEqual(mockError)
    })
  })

  describe('createAudit', () => {
    it('should call the correct API endpoint with audit data', async () => {
      const auditData = { name: 'New Audit', type: 'default' }
      const mockResponse = { data: { datas: { _id: 'audit1', ...auditData } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await AuditService.createAudit(auditData)

      expect(api.post).toHaveBeenCalledWith('audits', auditData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(AuditService.createAudit({})).rejects.toEqual(mockError)
    })
  })

  describe('deleteAudit', () => {
    it('should call the correct API endpoint with audit ID', async () => {
      const mockResponse = { data: { datas: 'Audit deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await AuditService.deleteAudit('audit1')

      expect(api.delete).toHaveBeenCalledWith('audits/audit1')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Audit not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(AuditService.deleteAudit('invalid')).rejects.toEqual(mockError)
    })
  })

  // --- Audit General ---

  describe('getAuditGeneral', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: { name: 'Test', language: 'en' } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getAuditGeneral('audit1')

      expect(api.get).toHaveBeenCalledWith('audits/audit1/general')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Server error')
      api.get.mockRejectedValue(mockError)

      await expect(AuditService.getAuditGeneral('audit1')).rejects.toEqual(mockError)
    })
  })

  describe('updateAuditGeneral', () => {
    it('should call the correct API endpoint with audit data', async () => {
      const auditData = { name: 'Updated Audit', language: 'fr' }
      const mockResponse = { data: { datas: auditData } }
      api.put.mockResolvedValue(mockResponse)

      const result = await AuditService.updateAuditGeneral('audit1', auditData)

      expect(api.put).toHaveBeenCalledWith('audits/audit1/general', auditData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.put.mockRejectedValue(mockError)

      await expect(AuditService.updateAuditGeneral('audit1', {})).rejects.toEqual(mockError)
    })
  })

  // --- Audit Network ---

  describe('getAuditNetwork', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: { scope: ['10.0.0.0/24'] } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getAuditNetwork('audit1')

      expect(api.get).toHaveBeenCalledWith('audits/audit1/network')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Server error')
      api.get.mockRejectedValue(mockError)

      await expect(AuditService.getAuditNetwork('audit1')).rejects.toEqual(mockError)
    })
  })

  describe('updateAuditNetwork', () => {
    it('should call the correct API endpoint with network data', async () => {
      const networkData = { scope: ['192.168.1.0/24'] }
      const mockResponse = { data: { datas: networkData } }
      api.put.mockResolvedValue(mockResponse)

      const result = await AuditService.updateAuditNetwork('audit1', networkData)

      expect(api.put).toHaveBeenCalledWith('audits/audit1/network', networkData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.put.mockRejectedValue(mockError)

      await expect(AuditService.updateAuditNetwork('audit1', {})).rejects.toEqual(mockError)
    })
  })

  // --- Findings ---

  describe('createFinding', () => {
    it('should call the correct API endpoint with finding data', async () => {
      const findingData = { title: 'SQL Injection', severity: 'Critical' }
      const mockResponse = { data: { datas: { _id: 'finding1', ...findingData } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await AuditService.createFinding('audit1', findingData)

      expect(api.post).toHaveBeenCalledWith('audits/audit1/findings', findingData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(AuditService.createFinding('audit1', {})).rejects.toEqual(mockError)
    })
  })

  describe('getFinding', () => {
    it('should call the correct API endpoint with audit and finding IDs', async () => {
      const mockResponse = { data: { datas: { _id: 'finding1', title: 'XSS' } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getFinding('audit1', 'finding1')

      expect(api.get).toHaveBeenCalledWith('audits/audit1/findings/finding1')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Finding not found' } } }
      api.get.mockRejectedValue(mockError)

      await expect(AuditService.getFinding('audit1', 'invalid')).rejects.toEqual(mockError)
    })
  })

  describe('updateFinding', () => {
    it('should call the correct API endpoint with finding data', async () => {
      const findingData = { title: 'Updated XSS', severity: 'High' }
      const mockResponse = { data: { datas: { _id: 'finding1', ...findingData } } }
      api.put.mockResolvedValue(mockResponse)

      const result = await AuditService.updateFinding('audit1', 'finding1', findingData)

      expect(api.put).toHaveBeenCalledWith('audits/audit1/findings/finding1', findingData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Finding not found' } } }
      api.put.mockRejectedValue(mockError)

      await expect(AuditService.updateFinding('audit1', 'invalid', {})).rejects.toEqual(mockError)
    })
  })

  describe('deleteFinding', () => {
    it('should call the correct API endpoint with audit and finding IDs', async () => {
      const mockResponse = { data: { datas: 'Finding deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await AuditService.deleteFinding('audit1', 'finding1')

      expect(api.delete).toHaveBeenCalledWith('audits/audit1/findings/finding1')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Finding not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(AuditService.deleteFinding('audit1', 'invalid')).rejects.toEqual(mockError)
    })
  })

  // --- Sections ---

  describe('getSection', () => {
    it('should call the correct API endpoint with audit and section IDs', async () => {
      const mockResponse = { data: { datas: { _id: 'section1', name: 'Executive Summary' } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getSection('audit1', 'section1')

      expect(api.get).toHaveBeenCalledWith('audits/audit1/sections/section1')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Section not found' } } }
      api.get.mockRejectedValue(mockError)

      await expect(AuditService.getSection('audit1', 'invalid')).rejects.toEqual(mockError)
    })
  })

  describe('updateSection', () => {
    it('should call the correct API endpoint with section data', async () => {
      const sectionData = { text: 'Updated executive summary content' }
      const mockResponse = { data: { datas: { _id: 'section1', ...sectionData } } }
      api.put.mockResolvedValue(mockResponse)

      const result = await AuditService.updateSection('audit1', 'section1', sectionData)

      expect(api.put).toHaveBeenCalledWith('audits/audit1/sections/section1', sectionData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Section not found' } } }
      api.put.mockRejectedValue(mockError)

      await expect(AuditService.updateSection('audit1', 'invalid', {})).rejects.toEqual(mockError)
    })
  })

  // --- Audit Types ---

  describe('getAuditTypes', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: ['default', 'multi', 'retest'] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getAuditTypes()

      expect(api.get).toHaveBeenCalledWith('audits/types')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Server error')
      api.get.mockRejectedValue(mockError)

      await expect(AuditService.getAuditTypes()).rejects.toEqual(mockError)
    })
  })

  // --- Report Generation ---

  describe('generateAuditReport', () => {
    it('should call the correct API endpoint with blob response type', async () => {
      const mockBlob = new Blob(['fake docx content'])
      const mockResponse = { data: mockBlob }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.generateAuditReport('audit1')

      expect(api.get).toHaveBeenCalledWith('audits/audit1/generate', { responseType: 'blob' })
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 500, data: { message: 'Report generation failed' } } }
      api.get.mockRejectedValue(mockError)

      await expect(AuditService.generateAuditReport('audit1')).rejects.toEqual(mockError)
    })
  })

  // --- Sort / Move Findings ---

  describe('updateAuditSortFindings', () => {
    it('should call the correct API endpoint with sort data', async () => {
      const sortData = { sortBy: 'severity', sortOrder: 'desc' }
      const mockResponse = { data: { datas: 'Findings sorted' } }
      api.put.mockResolvedValue(mockResponse)

      const result = await AuditService.updateAuditSortFindings('audit1', sortData)

      expect(api.put).toHaveBeenCalledWith('audits/audit1/sortfindings', sortData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Server error')
      api.put.mockRejectedValue(mockError)

      await expect(AuditService.updateAuditSortFindings('audit1', {})).rejects.toEqual(mockError)
    })
  })

  describe('updateAuditFindingPosition', () => {
    it('should call the correct API endpoint with position data', async () => {
      const positionData = { findingId: 'finding1', newPosition: 2 }
      const mockResponse = { data: { datas: 'Finding moved' } }
      api.put.mockResolvedValue(mockResponse)

      const result = await AuditService.updateAuditFindingPosition('audit1', positionData)

      expect(api.put).toHaveBeenCalledWith('audits/audit1/movefinding', positionData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Server error')
      api.put.mockRejectedValue(mockError)

      await expect(AuditService.updateAuditFindingPosition('audit1', {})).rejects.toEqual(mockError)
    })
  })

  // --- Approval & Review ---

  describe('toggleApproval', () => {
    it('should call the correct API endpoint with audit ID', async () => {
      const mockResponse = { data: { datas: { approved: true } } }
      api.put.mockResolvedValue(mockResponse)

      const result = await AuditService.toggleApproval('audit1')

      expect(api.put).toHaveBeenCalledWith('audits/audit1/toggleApproval')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 403, data: { message: 'Forbidden' } } }
      api.put.mockRejectedValue(mockError)

      await expect(AuditService.toggleApproval('audit1')).rejects.toEqual(mockError)
    })
  })

  describe('updateReadyForReview', () => {
    it('should call the correct API endpoint with review data', async () => {
      const reviewData = { readyForReview: true }
      const mockResponse = { data: { datas: reviewData } }
      api.put.mockResolvedValue(mockResponse)

      const result = await AuditService.updateReadyForReview('audit1', reviewData)

      expect(api.put).toHaveBeenCalledWith('audits/audit1/updateReadyForReview', reviewData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 403, data: { message: 'Forbidden' } } }
      api.put.mockRejectedValue(mockError)

      await expect(AuditService.updateReadyForReview('audit1', {})).rejects.toEqual(mockError)
    })
  })

  // --- Retest ---

  describe('getRetest', () => {
    it('should call the correct API endpoint with audit ID', async () => {
      const mockResponse = { data: { datas: { _id: 'retest1' } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getRetest('audit1')

      expect(api.get).toHaveBeenCalledWith('audits/audit1/retest')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'No retest found' } } }
      api.get.mockRejectedValue(mockError)

      await expect(AuditService.getRetest('audit1')).rejects.toEqual(mockError)
    })
  })

  describe('createRetest', () => {
    it('should call the correct API endpoint with retest data', async () => {
      const retestData = { findings: ['finding1', 'finding2'] }
      const mockResponse = { data: { datas: { _id: 'retest1', ...retestData } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await AuditService.createRetest('audit1', retestData)

      expect(api.post).toHaveBeenCalledWith('audits/audit1/retest', retestData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(AuditService.createRetest('audit1', {})).rejects.toEqual(mockError)
    })
  })

  // --- Parent / Children ---

  describe('updateAuditParent', () => {
    it('should call the correct API endpoint with parent ID', async () => {
      const mockResponse = { data: { datas: 'Parent updated' } }
      api.put.mockResolvedValue(mockResponse)

      const result = await AuditService.updateAuditParent('audit1', 'parentAudit1')

      expect(api.put).toHaveBeenCalledWith('audits/audit1/updateParent', { parentId: 'parentAudit1' })
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Audit not found' } } }
      api.put.mockRejectedValue(mockError)

      await expect(AuditService.updateAuditParent('audit1', 'invalid')).rejects.toEqual(mockError)
    })
  })

  describe('deleteAuditParent', () => {
    it('should call the correct API endpoint with audit ID', async () => {
      const mockResponse = { data: { datas: 'Parent removed' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await AuditService.deleteAuditParent('audit1')

      expect(api.delete).toHaveBeenCalledWith('audits/audit1/deleteParent')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Audit not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(AuditService.deleteAuditParent('invalid')).rejects.toEqual(mockError)
    })
  })

  describe('getAuditChildren', () => {
    it('should call the correct API endpoint with audit ID', async () => {
      const mockResponse = { data: { datas: [{ _id: 'child1' }, { _id: 'child2' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await AuditService.getAuditChildren('audit1')

      expect(api.get).toHaveBeenCalledWith('audits/audit1/children')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Server error')
      api.get.mockRejectedValue(mockError)

      await expect(AuditService.getAuditChildren('audit1')).rejects.toEqual(mockError)
    })
  })

  // --- Comments ---

  describe('createComment', () => {
    it('should call the correct API endpoint with comment data', async () => {
      const commentData = { text: 'This is a comment' }
      const mockResponse = { data: { datas: { _id: 'comment1', ...commentData } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await AuditService.createComment('audit1', commentData)

      expect(api.post).toHaveBeenCalledWith('audits/audit1/comments', commentData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 422, data: { message: 'Validation error' } } }
      api.post.mockRejectedValue(mockError)

      await expect(AuditService.createComment('audit1', {})).rejects.toEqual(mockError)
    })
  })

  describe('deleteComment', () => {
    it('should call the correct API endpoint with audit and comment IDs', async () => {
      const mockResponse = { data: { datas: 'Comment deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await AuditService.deleteComment('audit1', 'comment1')

      expect(api.delete).toHaveBeenCalledWith('audits/audit1/comments/comment1')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Comment not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(AuditService.deleteComment('audit1', 'invalid')).rejects.toEqual(mockError)
    })
  })

  describe('updateComment', () => {
    it('should call the correct API endpoint with comment data including _id', async () => {
      const commentData = { _id: 'comment1', text: 'Updated comment' }
      const mockResponse = { data: { datas: commentData } }
      api.put.mockResolvedValue(mockResponse)

      const result = await AuditService.updateComment('audit1', commentData)

      expect(api.put).toHaveBeenCalledWith('audits/audit1/comments/comment1', commentData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Comment not found' } } }
      api.put.mockRejectedValue(mockError)

      const commentData = { _id: 'invalid', text: 'Updated' }
      await expect(AuditService.updateComment('audit1', commentData)).rejects.toEqual(mockError)
    })
  })
})
