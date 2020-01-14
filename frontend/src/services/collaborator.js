import Vue from 'vue'

export default {
  getCollabs: function() {
    return Vue.prototype.$axios.get(`users`)
  },

  createCollab: function(collab) {
    return Vue.prototype.$axios.post('users', collab)
  },

  updateCollab: function(email, collab) {
    return Vue.prototype.$axios.put(`users/${email}`, collab)
  },

  deleteCollab: function(email) {
    return Vue.prototype.$axios.delete(`users/${email}`)
  }
}