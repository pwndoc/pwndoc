import { api } from 'boot/axios'

export default {
  getSettings: function() {
    return api.get(`settings`)
  },

  getPublicSettings: function() {
    return api.get(`settings/public`)
  },

  updateSettings: function(params) {
    return api.put(`settings`, params)
  },

  exportSettings: function() {
    return api.get(`settings/export`)
  },

  revertDefaults: function() {
    return api.put(`settings/revert`)
  },
}