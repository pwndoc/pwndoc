import Vue from 'vue'

export default {
  getCollabs: function() {
    return Vue.prototype.$axios.get(`users`)
  },

  createCollab: function(collab) {
    return Vue.prototype.$axios.post('users', collab)
  },

  updateCollab: function(collabId, collab) {
    return Vue.prototype.$axios.put(`users/${collabId}`, collab)
  },

  deleteCollab: function(collabId) {
    return Vue.prototype.$axios.delete(`users/${collabId}`)
  }
}