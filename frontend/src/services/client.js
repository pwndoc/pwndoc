import Vue from 'vue'

export default {
  getClients: function() {
    return Vue.prototype.$axios.get(`clients`)
  },

  createClient: function(client) {
    return Vue.prototype.$axios.post('clients', client)
  },

  updateClient: function(clientId, client) {
    return Vue.prototype.$axios.put(`clients/${clientId}`, client)
  },

  deleteClient: function(clientId) {
    return Vue.prototype.$axios.delete(`clients/${clientId}`)
  }
}