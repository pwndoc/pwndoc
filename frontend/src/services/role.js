import { api } from 'boot/axios'

export default {
  getRoles: function() {
    return api.get('data/roles')
  },

  getPermissionsCatalog: function() {
    return api.get('data/roles/permissions')
  },

  createRole: function(role) {
    return api.post('data/roles', role)
  },

  updateRole: function(name, role) {
    return api.put(`data/roles/${name}`, role)
  },

  deleteRole: function(name) {
    return api.delete(`data/roles/${name}`)
  }
}
