import { api } from 'boot/axios'

export default {
  getCollabs: function() {
    return api.get(`users`)
  },

  createCollab: function(collab) {
    return api.post('users', collab)
  },

  updateCollab: function(collabId, collab) {
    return api.put(`users/${collabId}`, collab)
  },

  bulkRoles: function(payload) {
    return api.put('users/bulk-roles', payload)
  },

  bulkStatus: function(payload) {
    return api.put('users/bulk-status', payload)
  }
}