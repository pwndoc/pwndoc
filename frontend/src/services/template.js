import Vue from 'vue'

export default {
  getTemplates: function() {
    return Vue.prototype.$axios.get(`templates`)
  },

  createTemplate: function(template) {
    return Vue.prototype.$axios.post('templates', template)
  },

  updateTemplate: function(templateId, template) {
    return Vue.prototype.$axios.put(`templates/${templateId}`, template)
  },

  deleteTemplate: function(templateId) {
    return Vue.prototype.$axios.delete(`templates/${templateId}`)
  },

  downloadTemplate: function(templateId) {
    return Vue.prototype.$axios.get(`templates/download/${templateId}`, {responseType: 'blob'})
  }
}