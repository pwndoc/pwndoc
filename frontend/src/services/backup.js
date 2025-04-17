import { api } from 'boot/axios'

export default {
  getBackups: function() {
    return api.get(`backups`)
  },

  getBackupStatus: function() {
    return api.get(`backups/status`)
  },

  createBackup: function(backup) {
    return api.post(`backups`, backup)
  },

  restoreBackup: function(slug, data) {
    return api.post(`backups/${slug}/restore`, data)
  },

  deleteBackup: function(slug) {
    return api.delete(`backups/${slug}`)
  },

  downloadBackup: function(slug) {
    const fileUrl = `${api.defaults.baseURL}/backups/download/${slug}`
    const link = document.createElement('a')
    link.href = fileUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },

  uploadBackup: function(data, onProgress) {
    const config = {
      onUploadProgress: progressEvent => {
        let progress= parseInt(Math.round((progressEvent.loaded / progressEvent.total) * 100))
        onProgress(progress)
      }
    }

    return api.post(`backups/upload`, data, config)
  }
}