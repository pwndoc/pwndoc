import { Dialog, Notify } from 'quasar';
import Vue from 'vue'

import CollabService from '@/services/collaborator'
import UserService from '@/services/user'
import DataService from '@/services/data'
import Utils from '@/services/utils'

import { $t } from '@/boot/i18n'

export default {
    data: () => {
        return {
            UserService: UserService,
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
                {name: 'role', label: $t('role'), field: 'role', align: 'left', sortable: true},
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
            search: {username: '', firstname: '', lastname: '', role: '', email: '', enabled: true},
            customFilter: Utils.customFilter,
            // Errors messages
            errors: {lastname: '', firstname: '', username: ''},
            // Collab to create or update
            currentCollab: {
                lastname: '', 
                firstname: '', 
                username: '',
                role: '',
                email: '',
                phone: '',
                totpEnabled: false
            },
            // Username to identify collab to update
            idUpdate: '',
            // List of roles
            roles: [],
            strongPassword: [Utils.strongPassword]
        }
    },

    mounted: function() {
        this.getCollabs()
        this.getRoles()
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
            DataService.getRoles()
            .then((data) => {
                this.roles = data.data.datas
            })
            .catch((err) => {
                console.log(err)
            })
        },

        clone: function(row) {
            this.currentCollab = this.$_.clone(row);
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
            this.currentCollab.role = 'user';
            this.currentCollab.password = '';
            this.currentCollab.email = '';
            this.currentCollab.phone = '';
        },

        dblClick: function(evt, row) {
            if (this.UserService.isAllowed('users:updates')) {
                this.clone(row)
                this.$refs.editModal.show()  
            }     
        }
    }
}