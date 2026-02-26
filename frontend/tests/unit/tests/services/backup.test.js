import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock axios BEFORE importing the service
vi.mock('boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'https://localhost:4242/api' }
  }
}))

import { api } from 'boot/axios'
import BackupService from '@/services/backup'

describe('BackupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBackups', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [{ slug: 'backup-2024', name: 'backup-2024.tar.gz' }] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await BackupService.getBackups()

      expect(api.get).toHaveBeenCalledWith('backups')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(BackupService.getBackups()).rejects.toEqual(mockError)
    })
  })

  describe('getBackupStatus', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: { running: false } } }
      api.get.mockResolvedValue(mockResponse)

      const result = await BackupService.getBackupStatus()

      expect(api.get).toHaveBeenCalledWith('backups/status')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = new Error('Network error')
      api.get.mockRejectedValue(mockError)

      await expect(BackupService.getBackupStatus()).rejects.toEqual(mockError)
    })
  })

  describe('createBackup', () => {
    it('should call the correct API endpoint with backup data', async () => {
      const backupData = { name: 'my-backup' }
      const mockResponse = { data: { datas: { slug: 'my-backup', name: 'my-backup.tar.gz' } } }
      api.post.mockResolvedValue(mockResponse)

      const result = await BackupService.createBackup(backupData)

      expect(api.post).toHaveBeenCalledWith('backups', backupData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 500, data: { message: 'Backup failed' } } }
      api.post.mockRejectedValue(mockError)

      await expect(BackupService.createBackup({})).rejects.toEqual(mockError)
    })
  })

  describe('restoreBackup', () => {
    it('should call the correct API endpoint with slug and data', async () => {
      const slug = 'backup-2024'
      const data = { overwrite: true }
      const mockResponse = { data: { datas: 'Backup restored' } }
      api.post.mockResolvedValue(mockResponse)

      const result = await BackupService.restoreBackup(slug, data)

      expect(api.post).toHaveBeenCalledWith('backups/backup-2024/restore', data)
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Backup not found' } } }
      api.post.mockRejectedValue(mockError)

      await expect(BackupService.restoreBackup('invalid', {})).rejects.toEqual(mockError)
    })
  })

  describe('deleteBackup', () => {
    it('should call the correct API endpoint with slug', async () => {
      const slug = 'backup-2024'
      const mockResponse = { data: { datas: 'Backup deleted' } }
      api.delete.mockResolvedValue(mockResponse)

      const result = await BackupService.deleteBackup(slug)

      expect(api.delete).toHaveBeenCalledWith('backups/backup-2024')
      expect(result).toEqual(mockResponse)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 404, data: { message: 'Backup not found' } } }
      api.delete.mockRejectedValue(mockError)

      await expect(BackupService.deleteBackup('invalid')).rejects.toEqual(mockError)
    })
  })

  describe('downloadBackup', () => {
    it('should create a link element and trigger a download', () => {
      const slug = 'backup-2024'
      const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
      const clickSpy = vi.fn()

      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        click: clickSpy
      })

      BackupService.downloadBackup(slug)

      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(appendSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
      expect(removeSpy).toHaveBeenCalled()

      const linkElement = appendSpy.mock.calls[0][0]
      expect(linkElement.href).toBe('https://localhost:4242/api/backups/download/backup-2024')

      appendSpy.mockRestore()
      removeSpy.mockRestore()
    })
  })

  describe('uploadBackup', () => {
    it('should call the correct API endpoint with data and progress config', async () => {
      const formData = new FormData()
      const onProgress = vi.fn()
      const mockResponse = { data: { datas: 'Backup uploaded' } }
      api.post.mockResolvedValue(mockResponse)

      const result = await BackupService.uploadBackup(formData, onProgress)

      expect(api.post).toHaveBeenCalledWith('backups/upload', formData, expect.objectContaining({
        onUploadProgress: expect.any(Function)
      }))
      expect(result).toEqual(mockResponse)
    })

    it('should report upload progress via the callback', async () => {
      const formData = new FormData()
      const onProgress = vi.fn()
      api.post.mockResolvedValue({ data: {} })

      await BackupService.uploadBackup(formData, onProgress)

      // Extract the onUploadProgress handler that was passed to api.post
      const config = api.post.mock.calls[0][2]
      config.onUploadProgress({ loaded: 50, total: 100 })

      expect(onProgress).toHaveBeenCalledWith(50)
    })

    it('should report 100% when upload is complete', async () => {
      const formData = new FormData()
      const onProgress = vi.fn()
      api.post.mockResolvedValue({ data: {} })

      await BackupService.uploadBackup(formData, onProgress)

      const config = api.post.mock.calls[0][2]
      config.onUploadProgress({ loaded: 200, total: 200 })

      expect(onProgress).toHaveBeenCalledWith(100)
    })

    it('should handle errors', async () => {
      const mockError = { response: { status: 500, data: { message: 'Upload failed' } } }
      api.post.mockRejectedValue(mockError)

      await expect(BackupService.uploadBackup(new FormData(), vi.fn())).rejects.toEqual(mockError)
    })
  })
})
