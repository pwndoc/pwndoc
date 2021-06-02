import Vue from 'vue'

export default {
  getSettings: function() {
    return Vue.prototype.$axios.get(`settings`)
  },

  updateSettings: function(params) {
    return Vue.prototype.$axios.put(`settings`, params)
  }
}