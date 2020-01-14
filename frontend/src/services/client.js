import Vue from 'vue'

export default {
  getClients: function() {
    return Vue.prototype.$axios.get(`clients`)
  },

  createClient: function(client) {
    return Vue.prototype.$axios.post('clients', client)
  },

  updateClient: function(email, client) {
    return Vue.prototype.$axios.put(`clients/${email}`, client)
  },

  deleteClient: function(email) {
    return Vue.prototype.$axios.delete(`clients/${email}`)
  }
}