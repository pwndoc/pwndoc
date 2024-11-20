import Vue from 'vue'

export default {
  getAttachment: function(auditId, attachmentId) {
    return Vue.prototype.$axios.get(`audits/${auditId}/attachments/${attachmentId}`)
  },

  createAttachment: function(auditId, attachment) {
    return Vue.prototype.$axios.post(`audits/${auditId}/attachments`, attachment)
  },

  deleteAttachment: function(auditId, attachmentId) {
    return Vue.prototype.$axios.delete(`audits/${auditId}/attachments/${attachmentId}`)
  }
}