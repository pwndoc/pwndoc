import { api } from 'boot/axios'

export default {
  getCompanies: function() {
    return api.get(`companies`)
  },

  createCompany: function(company) {
    return api.post('companies', company)
  },

  updateCompany: function(companyId, company) {
    return api.put(`companies/${companyId}`, company)
  },

  deleteCompany: function(companyId) {
    return api.delete(`companies/${companyId}`)
  }
}