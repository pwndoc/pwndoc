import { api } from 'boot/axios'

export default {
  getClients: function() {
    return api.get(`clients`)
  },

  createClient: function(client) {
    return api.post('clients', client)
  },

  updateClient: function(clientId, client) {
    return api.put(`clients/${clientId}`, client)
  },

  deleteClient: function(clientId) {
    return api.delete(`clients/${clientId}`)
  }
}