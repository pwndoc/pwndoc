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
                {name: 'username', label: $t('username'), field: 'username', align: 'left', sortable: true},
                {name: 'firstname', label: $t('firstname'), field: 'firstname', align: 'left', sortable: true},
                {name: 'lastname', label: $t('lastname'), field: 'lastname', align: 'left', sortable: true},
                {name: 'email', label: $t('email'), field: 'email', align: 'left', sortable: true},
                {name: 'jobTitle', label: $t('jobTitle'), field: 'jobTitle', align: 'left', sortable: true},
                {name: 'roles', label: $t('roles'), field: 'roles', align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            // Datatable pagination
            pagination: {
                page: 1,
                rowsPerPage: 25,
                sortBy: 'username'
            },
            rowsPerPageOptions: [
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:'All', value:0}
            ],
            // Search filter
            search: {username: '', firstname: '', lastname: '', roles: [], email: '', jobTitle: '', enabled: true},
            customFilter: Utils.customFilter,
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
            selected: [],
            bulkRoles: [],
            bulkAction: 'add',
            strongPassword: [Utils.strongPassword]
        }
    },

    mounted: function() {
        this.getCollabs()
        this.getRoles()
        if (this.$route.query.role)
            this.search.roles = [this.$route.query.role]
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
                this.roles = data.data.datas.map(role => role.name)
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
        }
    }
}
