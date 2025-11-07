import { api } from 'boot/axios'

export default {
  getWords: function() {
    return api.get(`spellcheck/dict`)
  },

  addWord: function(word) {
    return api.post(`spellcheck/dict`, {word: word})
  },

  deleteWord: function(clientId, word) {
    return api.delete(`spellcheck/dict`, word)
  }
}