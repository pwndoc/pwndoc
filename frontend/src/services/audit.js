import { api } from 'boot/axios'

export default {
  getAudits: function(filters) {
    var params = {}
    if (filters) {
      if (filters.findingTitle)
        params.findingTitle = filters.findingTitle;
      if (filters.type)
        params.type = filters.type
    }
    return api.get('audits', {params: params})
  },

  getAudit: function(auditId) {
    return api.get(`audits/${auditId}`)
  },

  createAudit: function(audit) {
    return api.post('audits', audit)
  },

  deleteAudit: function(auditId) {
    return api.delete(`audits/${auditId}`)
  },

  getAuditGeneral: function(auditId) {
    return api.get(`audits/${auditId}/general`)
  },

  updateAuditGeneral: function(auditId, audit) {
    return api.put(`audits/${auditId}/general`, audit)
  },

  getAuditNetwork: function(auditId) {
    return api.get(`audits/${auditId}/network`)
  },

  updateAuditNetwork: function(auditId, audit) {
    return api.put(`audits/${auditId}/network`, audit)
  },

  createFinding: function(auditId, finding) {
    return api.post(`audits/${auditId}/findings`, finding)
  },
  
  getFinding: function(auditId, findingId) {
    return api.get(`audits/${auditId}/findings/${findingId}`)
  },

  updateFinding: function(auditId, findingId, finding) {
    return api.put(`audits/${auditId}/findings/${findingId}`, finding)
  },

  deleteFinding: function(auditId, findingId) {
    return api.delete(`audits/${auditId}/findings/${findingId}`)
  },

  getSection: function(auditId, sectionId) {
    return api.get(`audits/${auditId}/sections/${sectionId}`)
  },

  updateSection: function(auditId, sectionId, section) {
    return api.put(`audits/${auditId}/sections/${sectionId}`, section)
  },

  getAuditTypes: function() {
    return api.get(`audits/types`)
  },

  generateAuditReport: function(auditId) {
    return api.get(`audits/${auditId}/generate`, {responseType: 'blob'})
  },

  updateAuditSortFindings: function(auditId, audit) {
    return api.put(`audits/${auditId}/sortfindings`, audit)
  },

  updateAuditFindingPosition: function(auditId, audit) {
    return api.put(`audits/${auditId}/movefinding`, audit)
  },
  
  toggleApproval: function(auditId) {
    return api.put(`audits/${auditId}/toggleApproval`);
  },

  updateReadyForReview: function(auditId, data) {
    return api.put(`audits/${auditId}/updateReadyForReview`, data);
  },

  getRetest: function(auditId) {
    return api.get(`audits/${auditId}/retest`);
  },

  createRetest: function(auditId, data) {
    return api.post(`audits/${auditId}/retest`, data);
  },

  updateAuditParent: function(auditId, parentId) {
    return api.put(`audits/${auditId}/updateParent`, {parentId: parentId})
  },

  deleteAuditParent: function(auditId) {
    return api.delete(`audits/${auditId}/deleteParent`)
  },

  getAuditChildren: function(auditId) {
    return api.get(`audits/${auditId}/children`);
  },

  createComment: function(auditId, comment) {
    return api.post(`audits/${auditId}/comments`, comment);
  },

  deleteComment: function(auditId, commentId) {
    return api.delete(`audits/${auditId}/comments/${commentId}`)
  },

  updateComment: function(auditId, comment) {
    return api.put(`audits/${auditId}/comments/${comment._id}`, comment)
  },
}