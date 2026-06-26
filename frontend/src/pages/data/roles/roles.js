import { Notify } from 'quasar'
import RoleService from '@/services/role'
import Utils from '@/services/utils'
import { useUserStore } from 'src/stores/user'
import { $t } from '@/boot/i18n'
import RolePermissionsPanel from './role-permissions-panel.vue'

const userStore = useUserStore()

export default {
    components: {
        RolePermissionsPanel
    },

    data: () => {
        return {
            userStore: userStore,
            roles: [],
            permissionsCatalog: [],
            loading: true,
            dtHeaders: [
                {name: 'name', label: $t('role'), field: 'displayName', align: 'left', sortable: true},
                {name: 'type', label: $t('roleType'), field: 'type', align: 'left', sortable: true},
                {name: 'permissions', label: $t('permissions'), field: 'permissionCount', align: 'left', sortable: true},
                {name: 'users', label: $t('users'), field: 'users', align: 'left', sortable: true},
                {name: 'action', label: $t('actions'), field: 'action', align: 'right', sortable: false}
            ],
            pagination: {
                page: 1,
                rowsPerPage: 25,
                sortBy: 'name'
            },
            rowsPerPageOptions: [
                {label:'10', value:10},
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:$t('all'), value:0}
            ],
            search: {query: '', type: null},
            errors: {name: '', displayName: ''},
            currentRole: {name: '', displayName: '', description: '', allows: []},
            roleNameTouched: false,
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
        .then(() => this.getRoles())
    },

    methods: {
        getRoles: function() {
            this.loading = true
            RoleService.getRoles()
            .then((data) => {
                const rows = data.data.datas
                rows.forEach(role => {
                    role.displayName = role.displayName || role.name
                    role.type = role.virtual ? 'system' : 'custom'
                    role.permissionCount = role.allows === '*' ? this.permissionsCount : (role.allows || []).length
                })
                this.roles = rows
                this.loading = false
            })
            .catch((err) => {
                console.log(err)
                this.loading = false
            })
        },

        getPermissionsCatalog: function() {
            return RoleService.getPermissionsCatalog()
            .then((data) => {
                this.permissionsCatalog = data.data.datas
                this.expandAllPermissionGroups()
            })
            .catch((err) => console.log(err))
        },

        createRole: function() {
            this.cleanErrors()
            if (!this.currentRole.displayName.trim())
                this.errors.displayName = $t('msg.roleDisplayNameRequired')
            if (!this.currentRole.name.trim())
                this.errors.name = $t('msg.roleNameRequired')
            if (this.errors.displayName || this.errors.name)
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
            if (!this.currentRole.displayName.trim())
                this.errors.displayName = $t('msg.roleDisplayNameRequired')
            if (!this.currentRole.name.trim())
                this.errors.name = $t('msg.roleNameRequired')
            if (this.errors.displayName || this.errors.name)
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
            this.usersCount = row.users || 0
            this.$refs.deleteModal.show()
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
                displayName: this.roleDisplayName(row),
                description: row.description || '',
                allows: row.allows === '*' ? [] : [...(row.allows || [])]
            }
            this.idUpdate = row.name
            this.roleNameTouched = true
            this.permissionSearch = ''
            this.expandAllPermissionGroups()
        },

        applyClone: function() {
            const role = this.roles.find(role => role.name === this.cloneFrom)
            if (role)
                this.currentRole.allows = role.allows === '*' ? this.allPermissionScopes() : [...(role.allows || [])]
        },

        togglePermission: function(scope) {
            if (this.currentRole.allows.includes(scope))
                this.currentRole.allows = this.currentRole.allows.filter(permission => permission !== scope)
            else
                this.currentRole.allows.push(scope)
        },

        isPermissionChecked: function(scope) {
            return this.currentRole.allows === '*' || this.currentRole.allows.includes(scope)
        },

        cleanCurrentRole: function() {
            this.currentRole = {
                name: '',
                displayName: '',
                description: '',
                allows: this.permissionsCatalog.flatMap(group => group.permissions.filter(permission => permission.core).map(permission => permission.scope))
            }
            this.roleNameTouched = false
            this.cloneFrom = ''
            this.permissionSearch = ''
            this.expandAllPermissionGroups()
        },

        cleanErrors: function() {
            this.errors.name = ''
            this.errors.displayName = ''
        },

        dblClick: function(evt, row) {
            if (!this.isSystem(row) && userStore.isAllowed('roles:update')) {
                this.clone(row)
                this.$refs.editModal.show()
            }
            else if (userStore.isAllowed('roles:read')) {
                this.viewRole(row)
                this.$refs.viewModal.show()
            }
        },

        viewRole: function(row) {
            this.currentRole = {
                name: row.name,
                displayName: this.roleDisplayName(row),
                description: row.description || '',
                allows: row.allows === '*' ? '*' : [...(row.allows || [])],
                type: row.type,
                virtual: row.virtual
            }
            this.permissionSearch = ''
            this.expandAllPermissionGroups()
        },

        isSystem: function(row) {
            return row.virtual === true
        },

        expandAllPermissionGroups: function() {
            this.expandedPermissionGroups = this.permissionsCatalog.reduce((acc, group) => {
                acc[group.key] = true
                return acc
            }, {})
        },

        clearPermissions: function() {
            this.currentRole.allows = []
        },

        allPermissionScopes: function() {
            return this.permissionsCatalog.flatMap(group => group.permissions.map(permission => permission.scope))
        },

        roleAllowsAll: function(role) {
            return role.allows === '*'
        },

        roleAllowsList: function(role) {
            return role.allows === '*' ? [] : (role.allows || [])
        },

        roleFilter: function(rows, terms) {
            if (!rows)
                return []
            const query = Utils.normalizeString(terms.query || '')
            return rows.filter(row => {
                const haystack = Utils.normalizeString([
                    row.name,
                    this.roleDisplayName(row),
                    row.description || this.roleDescription(row)
                ].join(' '))

                if (query && haystack.indexOf(query) < 0)
                    return false
                if (terms.type && row.type !== terms.type)
                    return false
                return true
            })
        },

        typeOptions: function() {
            return [
                {label: $t('allTypes'), value: null},
                {label: $t('systemRole'), value: 'system'},
                {label: $t('customRole'), value: 'custom'}
            ]
        },

        typeLabel: function(row) {
            return this.isSystem(row) ? $t('systemRole') : $t('customRole')
        },

        roleDisplayName: function(row) {
            return row.displayName || row.name
        },

        roleDescription: function(row) {
            if (row.description)
                return row.description
            if (row.name === 'admin')
                return $t('adminRoleDescription')
            if (row.name === 'user')
                return $t('userRoleDescription')
            return $t('roleDescriptionFallback')
        },

        permissionProgress: function(row) {
            if (!this.permissionsCount)
                return 0
            return row.permissionCount / this.permissionsCount
        },

        permissionSummary: function(row) {
            if (row.allows === '*')
                return $t('allPermissions')
            return `${row.permissionCount} / ${this.permissionsCount} ${$t('permissions').toLowerCase()}`
        },

        roleOptions: function() {
            return this.roles
            .filter(role => !this.isSystem(role))
            .map(role => ({label: this.roleDisplayName(role), value: role.name}))
        },

        slugifyRoleName: function(value) {
            return (value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        },

        updateDisplayName: function(value) {
            this.currentRole.displayName = value
            if (!this.roleNameTouched)
                this.currentRole.name = this.slugifyRoleName(value)
        },

        updateRoleName: function(value) {
            this.currentRole.name = value
            this.roleNameTouched = true
        },

        filteredRolesCount: function() {
            return this.roleFilter(this.roles, this.search).length
        },

        pageStart: function() {
            return Utils.paginationRange(this.pagination.page, this.pagination.rowsPerPage, this.filteredRolesCount()).start
        },

        pageEnd: function() {
            return Utils.paginationRange(this.pagination.page, this.pagination.rowsPerPage, this.filteredRolesCount()).end
        }
    },

    computed: {
        selectedPermissionsCount: function() {
            return this.currentRole.allows === '*' ? this.permissionsCount : this.currentRole.allows.length
        },

        permissionsCount: function() {
            return this.permissionsCatalog.reduce((count, group) => count + group.permissions.length, 0)
        }
    }
}
