import { api } from 'boot/axios'

export default {
  getImage: function(imageId) {
    return api.get(`images/${imageId}`)
  },

  createImage: function(image) {
    return api.post('images', image)
  },

  deleteImage: function(imageId) {
    return api.delete(`images/${imageId}`)
  }
}