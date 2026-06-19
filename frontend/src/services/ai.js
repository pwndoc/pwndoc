import { api } from 'boot/axios'

export default {
  getEnabledFields: function(entityType) {
    return api.get('ai/enabled-fields', {
      params: { entityType }
    })
  },

  generateFieldDraft: function(params) {
    return api.post('ai/generate', params)
  },

  runAuditQa: function(auditId, params = {}) {
    return api.post('ai/qa', {
      auditId: auditId,
      ...params
    })
  },

  runVulnerabilityQa: function(params = {}) {
    return api.post('ai/vulnerabilities/qa', params)
  },
}
