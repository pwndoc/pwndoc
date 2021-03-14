import Vue from 'vue'

export default {
  getImage: function(imageId) {
    return Vue.prototype.$axios.get(`images/${imageId}`)
  },

  createImage: function(image) {
    return Vue.prototype.$axios.post('images', image)
  },

  deleteImage: function(imageId) {
    return Vue.prototype.$axios.delete(`images/${imageId}`)
  }
}