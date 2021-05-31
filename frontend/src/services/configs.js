import Vue from 'vue'

export default {
  getConfigs: function() {
    return Vue.prototype.$axios.get(`configs`)
  },

  getPublicConfigs: function() {
    return Vue.prototype.$axios.get(`configs/public`)
  },

  updateConfigs: function(configs) {
    return Vue.prototype.$axios.put(`configs`, configs)
  }
}