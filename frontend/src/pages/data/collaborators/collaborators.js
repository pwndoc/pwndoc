import { Notify } from 'quasar';
import CollabService from '@/services/collaborator'
import RoleService from '@/services/role'
import Utils from '@/services/utils'
import { useUserStore } from 'src/stores/user'

import { $t } from '@/boot/i18n'

const userStore = useUserStore()

export default {
    data: () => {
        return {
            userStore: userStore,
            // Collaborators list
            collabs: [],
            // Loading state
            loading: true,
            // Datatable headers
            dtHeaders: [
                {name: 'name', label: $t('name'), field: row => `${row.firstname || ''} ${row.lastname || ''}`.trim(), align: 'left', sortable: true},
                {name: 'username', label: $t('username'), field: 'username', align: 'left', sortable: true},
                {name: 'email', label: $t('email'), field: 'email', align: 'left', sortable: true},
                {name: 'roles', label: $t('role'), field: 'roles', align: 'left', sortable: true},
                {name: 'status', label: $t('status'), field: 'enabled', align: 'left', sortable: true},
                {name: 'action', label: $t('actions'), field: 'action', align: 'right', sortable: false},
            ],
            // Datatable pagination
            pagination: {
                page: 1,
                rowsPerPage: 10,
                sortBy: 'username'
            },
            rowsPerPageOptions: [
                {label:'10', value:10},
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:$t('all'), value:0}
            ],
            // Search filter
            search: {query: '', roles: null, enabled: true},
            // Errors messages
            errors: {lastname: '', firstname: '', username: ''},
            // Collab to create or update
            currentCollab: {
                lastname: '', 
                firstname: '', 
                username: '',
                roles: ['user'],
                email: '',
                phone: '',
                jobTitle: '',
                password: '',
                totpEnabled: false
            },
            // Username to identify collab to update
            idUpdate: '',
            // List of roles
            roles: [],
            rolesByName: {},
            selected: [],
            bulkRoles: [],
            bulkAction: 'add',
            disableUsers: [],
            strongPassword: [Utils.strongPassword]
        }
    },

    mounted: function() {
        this.getCollabs()
        this.getRoles()
        if (this.$route.query.role)
            this.search.roles = this.$route.query.role
    },

    computed: {
        canUpdateUsers: function() {
            return userStore.isAllowed('users:update')
        },

        tableColumns: function() {
            if (this.canUpdateUsers)
                return this.dtHeaders
            return this.dtHeaders.filter(column => column.name !== 'action')
        }
    },

    methods: {
        getCollabs: function() {
            this.loading = true
            CollabService.getCollabs()
            .then((data) => {
                this.collabs = data.data.datas
                this.loading = false
            })
            .catch((err) => {
                console.log(err)
            })
        },

        createCollab: function() {
            this.cleanErrors();
            if (!this.currentCollab.lastname)
                this.errors.lastname = $t('msg.lastnameRequired');
            if (!this.currentCollab.firstname)
                this.errors.firstname = $t('msg.firstnameRequired');
            if (!this.currentCollab.username)
                this.errors.username = $t('msg.usernameRequired');
            if (!this.currentCollab.password)
                this.errors.password = $t('msg.passwordRequired');

            if (this.errors.lastname || this.errors.firstname || this.errors.username || this.errors.password || !this.$refs.pwdCreateRef.validate())
                return;

            CollabService.createCollab(this.currentCollab)
            .then(() => {
                this.getCollabs();
                this.$refs.createModal.hide();
                Notify.create({
                    message: $t('msg.collaboratorCreatedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        updateCollab: function() {
            this.cleanErrors();
            if (!this.currentCollab.lastname)
                this.errors.lastname = $t('msg.lastnameRequired');
            if (!this.currentCollab.firstname)
                this.errors.firstname = $t('msg.firstnameRequired');
            if (!this.currentCollab.username)
                this.errors.username = $t('msg.usernameRequired');

            if (this.errors.lastname || this.errors.firstname || this.errors.username || !this.$refs.pwdUpdateRef.validate())
                return;
            
            CollabService.updateCollab(this.idUpdate, this.currentCollab)
            .then(() => {
                this.getCollabs();
                this.$refs.editModal.hide();
                Notify.create({
                    message: $t('msg.collaboratorUpdatedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        getRoles: function() {
            RoleService.getRoles()
            .then((data) => {
                this.roles = data.data.datas.map(role => ({...role, displayName: role.displayName || role.name}))
                this.rolesByName = this.roles.reduce((acc, role) => {
                    acc[role.name] = role
                    return acc
                }, {})
            })
            .catch((err) => {
                console.log(err)
            })
        },

        clone: function(row) {
            this.currentCollab = this.$_.clone(row);
            this.currentCollab.roles = this.currentCollab.roles || [];
            this.idUpdate = row._id;
        },

        cleanErrors: function() {
            this.errors.lastname = '';
            this.errors.firstname = '';
            this.errors.username = '';
            this.errors.password = '';
        },

        cleanCurrentCollab: function() {
            this.currentCollab.lastname = '';
            this.currentCollab.firstname = '';
            this.currentCollab.username = '';
            this.currentCollab.roles = ['user'];
            this.currentCollab.password = '';
            this.currentCollab.email = '';
            this.currentCollab.phone = '';
            this.currentCollab.jobTitle = '';
        },

        dblClick: function(evt, row) {
            if (userStore.isAllowed('users:update')) {
                this.clone(row)
                this.$refs.editModal.show()  
            }     
        },

        openBulkRoles: function(action) {
            this.bulkAction = action
            this.bulkRoles = []
            this.$refs.bulkRolesModal.show()
        },

        applyBulkRoles: function() {
            const payload = {
                userIds: this.selected.map(user => user._id),
                add: this.bulkAction === 'add' ? this.bulkRoles : [],
                remove: this.bulkAction === 'remove' ? this.bulkRoles : []
            }
            CollabService.bulkRoles(payload)
            .then(() => {
                this.selected = []
                this.getCollabs()
                this.$refs.bulkRolesModal.hide()
                Notify.create({message: $t('msg.usersUpdatedOk'), color: 'positive', textColor:'white', position: 'top-right'})
            })
            .catch((err) => {
                Notify.create({message: err.response.data.datas, color: 'negative', textColor:'white', position: 'top-right'})
            })
        },

        bulkSetEnabled: function(enabled) {
            if (!enabled) {
                this.openDisableConfirmation(this.selected)
                return
            }

            CollabService.bulkStatus({
                userIds: this.selected.map(user => user._id),
                enabled: enabled
            })
            .then(() => {
                this.selected = []
                this.getCollabs()
                Notify.create({message: $t('msg.usersUpdatedOk'), color: 'positive', textColor:'white', position: 'top-right'})
            })
            .catch((err) => {
                Notify.create({message: err.response.data.datas, color: 'negative', textColor:'white', position: 'top-right'})
            })
        },

        setEnabled: function(row, enabled) {
            if (!enabled) {
                this.openDisableConfirmation([row])
                return
            }

            CollabService.bulkStatus({
                userIds: [row._id],
                enabled: enabled
            })
            .then(() => {
                this.getCollabs()
                Notify.create({message: $t('msg.usersUpdatedOk'), color: 'positive', textColor:'white', position: 'top-right'})
            })
            .catch((err) => {
                Notify.create({message: err.response.data.datas, color: 'negative', textColor:'white', position: 'top-right'})
            })
        },

        openDisableConfirmation: function(users) {
            this.disableUsers = [...users]
            this.$refs.disableModal.show()
        },

        disableConfirmationTitle: function() {
            if (this.disableUsers.length === 1)
                return `${$t('btn.disable')} ${this.fullName(this.disableUsers[0])}?`
            return `${$t('btn.disable')} ${this.disableUsers.length} ${$t('users')}?`
        },

        confirmDisableUsers: function() {
            CollabService.bulkStatus({
                userIds: this.disableUsers.map(user => user._id),
                enabled: false
            })
            .then(() => {
                const disabledIds = this.disableUsers.map(user => user._id)
                this.selected = this.selected.filter(user => !disabledIds.includes(user._id))
                this.disableUsers = []
                this.getCollabs()
                this.$refs.disableModal.hide()
                Notify.create({message: $t('msg.usersUpdatedOk'), color: 'positive', textColor:'white', position: 'top-right'})
            })
            .catch((err) => {
                Notify.create({message: err.response.data.datas, color: 'negative', textColor:'white', position: 'top-right'})
            })
        },

        collaboratorFilter: function(rows, terms) {
            if (!rows)
                return []
            return rows.filter(row => {
                const query = Utils.normalizeString(terms.query || '')
                const haystack = Utils.normalizeString([
                    row.firstname,
                    row.lastname,
                    row.username,
                    row.email
                ].join(' '))

                if (query && haystack.indexOf(query) < 0)
                    return false

                if (terms.roles && !(row.roles || []).includes(terms.roles))
                    return false

                if (typeof terms.enabled === 'boolean' && row.enabled !== terms.enabled)
                    return false

                return true
            })
        },

        fullName: function(row) {
            const name = `${row.firstname || ''} ${row.lastname || ''}`.trim()
            return name || row.username
        },

        initials: function(row) {
            return this.fullName(row)
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join('') || '?'
        },

        avatarColor: function(username) {
            const palette = ['#2f80ed', '#27ae60', '#9b51e0', '#f2994a', '#eb5757', '#00a3a3', '#6f42c1', '#2d9cdb']
            const input = username || ''
            let hash = 0
            for (let i = 0; i < input.length; i++)
                hash = ((hash << 5) - hash) + input.charCodeAt(i)
            return palette[Math.abs(hash) % palette.length]
        },

        roleColor: function(role) {
            const normalizedRole = (role || '').toLowerCase()
            if (normalizedRole === 'admin')
                return 'orange'
            if (normalizedRole === 'user')
                return 'grey-7'
            return 'blue-grey'
        },

        roleLabel: function(role) {
            return this.rolesByName[role]?.displayName || role
        },

        roleOptions: function() {
            return this.roles.map(role => ({label: this.roleLabel(role.name), value: role.name}))
        },

        primaryRole: function(row) {
            const rowRoles = (row.roles && row.roles.length) ? row.roles : ["user"]
            if (this.search.roles && rowRoles.includes(this.search.roles))
                return this.search.roles
            return rowRoles[0]
        },

        statusOptions: function() {
            return [
                {label: $t('statusActive'), value: true},
                {label: $t('statusDisabled'), value: false},
                {label: $t('any'), value: null}
            ]
        },

        filteredCollabsCount: function() {
            return this.collaboratorFilter(this.collabs, this.search).length
        },

        pageStart: function() {
            return Utils.paginationRange(this.pagination.page, this.pagination.rowsPerPage, this.filteredCollabsCount()).start
        },

        pageEnd: function() {
            return Utils.paginationRange(this.pagination.page, this.pagination.rowsPerPage, this.filteredCollabsCount()).end
        }
    }
}
