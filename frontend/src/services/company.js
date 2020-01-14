import Vue from 'vue'

export default {
  getCompanies: function() {
    return Vue.prototype.$axios.get(`companies`)
  },

  createCompany: function(company) {
    return Vue.prototype.$axios.post('companies', company)
  },

  updateCompany: function(name, company) {
    return Vue.prototype.$axios.put(`companies/${name}`, company)
  },

  deleteCompany: function(name) {
    return Vue.prototype.$axios.delete(`companies/${name}`)
  }
}