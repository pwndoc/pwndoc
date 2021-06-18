import Vue from 'vue'

export default {
  getSettings: function() {
    return Vue.prototype.$axios.get(`settings`)
  },

  getPublicSettings: function() {
    return Vue.prototype.$axios.get(`settings/public`)
  },

  updateSettings: function(params) {
    return Vue.prototype.$axios.put(`settings`, params)
  },

  exportSettings: function() {
    return Vue.prototype.$axios.get(`settings/export`)
  },

  importSettings: function(params) {
    return Vue.prototype.$axios.put(`settings/import`, params)
  },

  revertDefaults: function() {
    return Vue.prototype.$axios.put(`settings/revert`)
  },
}