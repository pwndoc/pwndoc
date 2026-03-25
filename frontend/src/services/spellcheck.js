import { api } from 'boot/axios'

export default {
  getCapabilities: function() {
    return api.get(`spellcheck/capabilities`)
  },

  testConnection: function(url, apiKey, username) {
    return api.post('spellcheck/test', { url, apiKey, username })
  },

  getWords: function() {
    return api.get(`spellcheck/dict`)
  },

  addWord: function(word) {
    return api.post(`spellcheck/dict`, {word: word})
  },

  deleteWord: function(word) {
    return api.delete(`spellcheck/dict`, { data: { word: word } })
  }
}