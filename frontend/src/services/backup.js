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
  }
}