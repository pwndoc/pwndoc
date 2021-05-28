import Vue from 'vue'

export default {
  getReviewers: function() {
    return Vue.prototype.$axios.get(`users/reviewers`)
  },

  createReviewer: function(reviewer) {
    return Vue.prototype.$axios.post('users', reviewer)
  },

  updateReviewer: function(reviewerId, reviewer) {
    return Vue.prototype.$axios.put(`users/${reviewerId}`, reviewer)
  },

  deleteReviewer: function(reviewerId) {
    return Vue.prototype.$axios.delete(`users/${reviewerId}`)
  }
}