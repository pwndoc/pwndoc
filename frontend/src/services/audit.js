import Vue from 'vue'

export default {
  getAudits: function(filters) {
    var params = {}
    if (filters) {
      if (filters.findingTitle)
        params.findingTitle = filters.findingTitle;
      if (filters.type)
        params.type = filters.type
    }
    return Vue.prototype.$axios.get('audits', {params: params})
  },

  getAudit: function(auditId) {
    return Vue.prototype.$axios.get(`audits/${auditId}`)
  },

  createAudit: function(audit) {
    return Vue.prototype.$axios.post('audits', audit)
  },

  createFindings: function(auditId, findings) {
    return Vue.prototype.$axios.post(`audits/${auditId}/Allfindings`, findings)
  },

  deleteAudit: function(auditId) {
    return Vue.prototype.$axios.delete(`audits/${auditId}`)
  },

  getAuditGeneral: function(auditId) {
    return Vue.prototype.$axios.get(`audits/${auditId}/general`)
  },

  updateAuditGeneral: function(auditId, audit) {
    return Vue.prototype.$axios.put(`audits/${auditId}/general`, audit)
  },

  getAuditNetwork: function(auditId) {
    return Vue.prototype.$axios.get(`audits/${auditId}/network`)
  },

  updateAuditNetwork: function(auditId, audit) {
    return Vue.prototype.$axios.put(`audits/${auditId}/network`, audit)
  },

  createFinding: function(auditId, finding) {
    return Vue.prototype.$axios.post(`audits/${auditId}/findings`, finding)
  },
  
  getFinding: function(auditId, findingId) {
    return Vue.prototype.$axios.get(`audits/${auditId}/findings/${findingId}`)
  },

  updateFinding: function(auditId, findingId, finding) {
    return Vue.prototype.$axios.put(`audits/${auditId}/findings/${findingId}`, finding)
  },

  deleteFinding: function(auditId, findingId) {
    return Vue.prototype.$axios.delete(`audits/${auditId}/findings/${findingId}`)
  },

  getSection: function(auditId, sectionId) {
    return Vue.prototype.$axios.get(`audits/${auditId}/sections/${sectionId}`)
  },

  updateSection: function(auditId, sectionId, section) {
    return Vue.prototype.$axios.put(`audits/${auditId}/sections/${sectionId}`, section)
  },

  getAuditTypes: function() {
    return Vue.prototype.$axios.get(`audits/types`)
  },

  generateAuditReport: function(auditId) {
    return Vue.prototype.$axios.get(`audits/${auditId}/generate`, {responseType: 'blob'})
  },

  updateAuditSortFindings: function(auditId, audit) {
    return Vue.prototype.$axios.put(`audits/${auditId}/sortfindings`, audit)
  },

  updateAuditFindingPosition: function(auditId, audit) {
    return Vue.prototype.$axios.put(`audits/${auditId}/movefinding`, audit)
  },
  
  toggleApproval: function(auditId) {
    return Vue.prototype.$axios.put(`audits/${auditId}/toggleApproval`);
  },

  updateReadyForReview: function(auditId, data) {
    return Vue.prototype.$axios.put(`audits/${auditId}/updateReadyForReview`, data);
  },

  getRetest: function(auditId) {
    return Vue.prototype.$axios.get(`audits/${auditId}/retest`);
  },

  createRetest: function(auditId, data) {
    return Vue.prototype.$axios.post(`audits/${auditId}/retest`, data);
  },

  updateAuditParent: function(auditId, parentId) {
    return Vue.prototype.$axios.put(`audits/${auditId}/updateParent`, {parentId: parentId})
  },

  deleteAuditParent: function(auditId) {
    return Vue.prototype.$axios.delete(`audits/${auditId}/deleteParent`)
  },

  getAuditChildren: function(auditId) {
    return Vue.prototype.$axios.get(`audits/${auditId}/children`);
  },

  createComment: function(auditId, comment) {
    return Vue.prototype.$axios.post(`audits/${auditId}/comments`, comment);
  },

  deleteComment: function(auditId, commentId) {
    return Vue.prototype.$axios.delete(`audits/${auditId}/comments/${commentId}`)
  },

  updateComment: function(auditId, comment) {
    return Vue.prototype.$axios.put(`audits/${auditId}/comments/${comment._id}`, comment)
  },
}