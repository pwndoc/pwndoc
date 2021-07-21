import Vue from 'vue'

export default {
  getReviewers: function() {
    return Vue.prototype.$axios.get(`users/reviewers`)
  }
}