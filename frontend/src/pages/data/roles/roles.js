import { Notify } from 'quasar'
import RoleService from '@/services/role'
import Utils from '@/services/utils'
import { useUserStore } from 'src/stores/user'
import { $t } from '@/boot/i18n'

const userStore = useUserStore()

export default {
    data: () => {
        return {
            userStore: userStore,
            roles: [],
            permissionsCatalog: [],
            loading: true,
            dtHeaders: [
                {name: 'name', label: $t('roleName'), field: 'name', align: 'left', sortable: true},
                {name: 'type', label: $t('roleType'), field: 'type', align: 'left', sortable: true},
                {name: 'permissions', label: $t('permissions'), field: 'permissions', align: 'left', sortable: true},
                {name: 'users', label: $t('users'), field: 'users', align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false}
            ],
            pagination: {
                page: 1,
                rowsPerPage: 25,
                sortBy: 'name'
            },
            rowsPerPageOptions: [
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:'All', value:0}
            ],
            search: {name: '', type: ''},
            customFilter: Utils.customFilter,
            errors: {name: ''},
            currentRole: {name: '', allows: []},
            cloneFrom: '',
            permissionSearch: '',
            expandedPermissionGroups: {},
            idUpdate: '',
            usersCount: 0,
            roleToDelete: null
        }
    },

    mounted: function() {
        this.getPermissionsCatalog()
        this.getRoles()
    },

    methods: {
        getRoles: function() {
            this.loading = true
            RoleService.getRoles()
            .then(async (data) => {
                const rows = data.data.datas
                await Promise.all(rows.map(async role => {
                    const count = await RoleService.getRoleUsersCount(role.name)
                    role.users = count.data.datas.count
                    role.type = role.virtual ? 'System' : 'Custom'
                    role.permissions = role.allows === '*' ? 'All' : (role.allows || []).length
                }))
                this.roles = rows
                this.loading = false
            })
            .catch((err) => {
                console.log(err)
                this.loading = false
            })
        },

        getPermissionsCatalog: function() {
            RoleService.getPermissionsCatalog()
            .then((data) => {
                this.permissionsCatalog = data.data.datas
                this.expandAllPermissionGroups()
            })
            .catch((err) => console.log(err))
        },

        createRole: function() {
            this.cleanErrors()
            if (!this.currentRole.name)
                this.errors.name = $t('msg.roleNameRequired')
            if (this.errors.name)
                return

            RoleService.createRole(this.currentRole)
            .then(() => {
                this.getRoles()
                this.$refs.createModal.hide()
                Notify.create({message: $t('msg.roleCreatedOk'), color: 'positive', textColor:'white', position: 'top-right'})
            })
            .catch((err) => {
                Notify.create({message: err.response.data.datas, color: 'negative', textColor:'white', position: 'top-right'})
            })
        },

        updateRole: function() {
            this.cleanErrors()
            if (!this.currentRole.name)
                this.errors.name = $t('msg.roleNameRequired')
            if (this.errors.name)
                return

            RoleService.updateRole(this.idUpdate, this.currentRole)
            .then(() => {
                this.getRoles()
                this.$refs.editModal.hide()
                Notify.create({message: $t('msg.roleUpdatedOk'), color: 'positive', textColor:'white', position: 'top-right'})
            })
            .catch((err) => {
                Notify.create({message: err.response.data.datas, color: 'negative', textColor:'white', position: 'top-right'})
            })
        },

        confirmDeleteRole: function(row) {
            this.roleToDelete = row
            RoleService.getRoleUsersCount(row.name)
            .then((data) => {
                this.usersCount = data.data.datas.count
                this.$refs.deleteModal.show()
            })
        },

        deleteRole: function() {
            RoleService.deleteRole(this.roleToDelete.name)
            .then(() => {
                this.getRoles()
                this.$refs.deleteModal.hide()
                Notify.create({message: $t('msg.roleDeletedOk'), color: 'positive', textColor:'white', position: 'top-right'})
            })
            .catch((err) => {
                Notify.create({message: err.response.data.datas, color: 'negative', textColor:'white', position: 'top-right'})
            })
        },

        clone: function(row) {
            this.currentRole = {
                name: row.name,
                allows: row.allows === '*' ? [] : [...(row.allows || [])]
            }
            this.idUpdate = row.name
            this.permissionSearch = ''
            this.expandAllPermissionGroups()
        },

        applyClone: function() {
            const role = this.roles.find(role => role.name === this.cloneFrom)
            if (role)
                this.currentRole.allows = role.allows === '*' ? [] : [...(role.allows || [])]
        },

        togglePermission: function(scope) {
            if (this.currentRole.allows.includes(scope))
                this.currentRole.allows = this.currentRole.allows.filter(permission => permission !== scope)
            else
                this.currentRole.allows.push(scope)
        },

        isPermissionChecked: function(scope) {
            return this.currentRole.allows.includes(scope)
        },

        cleanCurrentRole: function() {
            this.currentRole = {
                name: '',
                allows: this.permissionsCatalog.flatMap(group => group.permissions.filter(permission => permission.core).map(permission => permission.scope))
            }
            this.cloneFrom = ''
            this.permissionSearch = ''
            this.expandAllPermissionGroups()
        },

        cleanErrors: function() {
            this.errors.name = ''
        },

        dblClick: function(evt, row) {
            if (!this.isSystem(row) && userStore.isAllowed('roles:update')) {
                this.clone(row)
                this.$refs.editModal.show()
            }
        },

        isSystem: function(row) {
            return row.virtual === true
        },

        permissionLabel: function(scope) {
            return scope
        },

        permissionMatchesSearch: function(permission, group) {
            const needle = this.permissionSearch.trim().toLowerCase()
            if (!needle)
                return true
            return (
                permission.scope.toLowerCase().includes(needle) ||
                group.label.toLowerCase().includes(needle)
            )
        },

        groupPermissions: function(group) {
            return group.permissions.filter(permission => this.permissionMatchesSearch(permission, group))
        },

        groupCheckedCount: function(group) {
            return group.permissions.filter(permission => this.isPermissionChecked(permission.scope)).length
        },

        expandAllPermissionGroups: function() {
            this.expandedPermissionGroups = this.permissionsCatalog.reduce((acc, group) => {
                acc[group.key] = true
                return acc
            }, {})
        },

        collapseAllPermissionGroups: function() {
            this.expandedPermissionGroups = this.permissionsCatalog.reduce((acc, group) => {
                acc[group.key] = false
                return acc
            }, {})
        },

        clearPermissions: function() {
            this.currentRole.allows = []
        }
    },

    computed: {
        filteredPermissionsCatalog: function() {
            return this.permissionsCatalog
            .map(group => {
                return {
                    ...group,
                    permissions: this.groupPermissions(group)
                }
            })
            .filter(group => group.permissions.length > 0)
        },

        selectedPermissionsCount: function() {
            return this.currentRole.allows.length
        },

        permissionsCount: function() {
            return this.permissionsCatalog.reduce((count, group) => count + group.permissions.length, 0)
        }
    }
}
