import { api } from 'boot/axios'

export default {
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