import Vue from 'vue'

export default {
  getConfigs: function() {
    return Vue.prototype.$axios.get(`configs`)
  },

  
  updateConfigs: function(configs) {
    return Vue.prototype.$axios.put(`configs`, configs)
  }
}