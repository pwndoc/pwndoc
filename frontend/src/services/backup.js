import Vue from 'vue'

export default {
  getBackups: function() {
    return Vue.prototype.$axios.get(`backups`)
  },

  getBackupStatus: function() {
    return Vue.prototype.$axios.get(`backups/status`)
  },

  createBackup: function(backup) {
    return Vue.prototype.$axios.post(`backups`, backup)
  },

  restoreBackup: function(slug, data) {
    return Vue.prototype.$axios.post(`backups/${slug}/restore`, data)
  },

  deleteBackup: function(slug) {
    return Vue.prototype.$axios.delete(`backups/${slug}`)
  },

  downloadBackup: function(slug) {
    const fileUrl = `${Vue.prototype.$axios.defaults.baseURL}/backups/download/${slug}`
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

    return Vue.prototype.$axios.post(`backups/upload`, data, config)
  }
}