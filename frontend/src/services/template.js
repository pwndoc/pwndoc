import { api } from 'boot/axios'

export default {
  getTemplates: function() {
    return api.get(`templates`)
  },

  createTemplate: function(template) {
    return api.post('templates', template)
  },

  updateTemplate: function(templateId, template) {
    return api.put(`templates/${templateId}`, template)
  },

  deleteTemplate: function(templateId) {
    return api.delete(`templates/${templateId}`)
  },

  downloadTemplate: function(templateId) {
    return api.get(`templates/download/${templateId}`, {responseType: 'blob'})
  }
}