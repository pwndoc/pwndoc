import { api } from 'boot/axios'

export default {
  getLanguages: function() {
    return api.get(`languagetool-rules/languages`)
  },

  getAll: function() {
    return api.get(`languagetool-rules`)
  },

  get: function(id) {
    return api.get(`languagetool-rules/${id}`)
  },

  create: function(language, ruleXml) {
    return api.post(`languagetool-rules`, { language, ruleXml })
  },

  delete: function(id) {
    return api.delete(`languagetool-rules/${id}`)
  }
}



