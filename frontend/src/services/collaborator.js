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

  deleteCollab: function(collabId) {
    return api.delete(`users/${collabId}`)
  }
}