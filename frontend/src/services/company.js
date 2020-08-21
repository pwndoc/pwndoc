import Vue from 'vue'

export default {
  getCompanies: function() {
    return Vue.prototype.$axios.get(`companies`)
  },

  createCompany: function(company) {
    return Vue.prototype.$axios.post('companies', company)
  },

  updateCompany: function(companyId, company) {
    return Vue.prototype.$axios.put(`companies/${companyId}`, company)
  },

  deleteCompany: function(companyId) {
    return Vue.prototype.$axios.delete(`companies/${companyId}`)
  }
}