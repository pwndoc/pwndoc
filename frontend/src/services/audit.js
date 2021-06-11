import Vue from 'vue'

export default {
  getAudits: function(filters) {
    var queryParams = "?";
    if (filters)
      if (filters.findingTitle)
        queryParams += `findingTitle=${filters.findingTitle}`;
    return Vue.prototype.$axios.get(`audits${queryParams}`)
  },

  getAudit: function(auditId) {
    return Vue.prototype.$axios.get(`audits/${auditId}`)
  },

  createAudit: function(audit) {
    return Vue.prototype.$axios.post('audits', audit)
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

  getFindings: function(auditId) {
    return Vue.prototype.$axios.get(`audits/${auditId}/findings`)
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

  toggleApproval: function(auditId) {
    return Vue.prototype.$axios.put(`audits/${auditId}/toggleApproval`);
  }
}