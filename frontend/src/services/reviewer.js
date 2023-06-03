import { api } from 'boot/axios'

export default {
  getReviewers: function() {
    return api.get(`users/reviewers`)
  }
}