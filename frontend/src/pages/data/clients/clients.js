import { Dialog, Notify } from 'quasar';

import ClientService from '@/services/client'
import CompanyService from '@/services/company'
import Utils from '@/services/utils'

export default {
    data() {
        return {
            // clients list
            clients: [],
            // Loading state
            loading: true,
            // Companies list
            companies: [],
            // Datatable headers
            dtHeaders: [
                {name: 'firstname', label: this.$t('firstname'), field: 'firstname', align: 'left', sortable: true},
                {name: 'lastname', label: this.$t('lastname'), field: 'lastname', align: 'left', sortable: true},
                {name: 'email', label: this.$t('email'), field: 'email', align: 'left', sortable: true},
                {name: 'company', label: this.$t('company'), field: row => (row.company)?row.company.name:'', align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            // Datatable pagination
            pagination: {
                page: 1,
                rowsPerPage: 25,
                sortBy: 'firstname'
            },
            rowsPerPageOptions: [
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:'All', value:0}
            ],
            // Search filter
            search: {firstname: '', lastname: '', email: '', 'company.name': ''},
            customFilter: Utils.customFilter,
            // Errors messages
            errors: {lastname: '', firstname: '', email: ''},
            // Selected or New Client
            currentClient: {
                lastname: '',
                firstname: '',
                email: '',
                phone: '',
                cell: '',
                title: '',
                company: {}
            },
            // Email to identify client to update
            idUpdate: '',
        }
    },

    mounted: function() {
        this.getClients();
        this.getCompanies();
    },

    methods: {
        getClients: function() {
            this.loading = true
            ClientService.getClients()
            .then((data) => {
                this.clients = data.data.datas
                this.loading = false
            })
            .catch((err) => {
                console.log(err)
            })
        },

        createClient: function() {
            this.cleanErrors();
            if (!this.currentClient.lastname)
                this.errors.lastname = this.$t('msg.lastnameRequired');
            if (!this.currentClient.firstname)
                this.errors.firstname = this.$t('msg.firstnameRequired');
            if (!this.currentClient.email)
                this.errors.email = this.$t('msg.emailRequired');
            
            if (this.errors.lastname || this.errors.firstname || this.errors.email)
                return;

            ClientService.createClient(this.currentClient)
            .then(() => {
                this.getClients();
                this.$refs.createModal.hide();
                Notify.create({
                    message: this.$t('msg.clientCreatedOk'),
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

        updateClient: function() {
            this.cleanErrors();
            if (!this.currentClient.lastname)
                this.errors.lastname = this.$t('msg.lastnameRequired');
            if (!this.currentClient.firstname)
                this.errors.firstname = this.$t('msg.firstnameRequired');
            if (!this.currentClient.email)
                this.errors.email = this.$t('msg.emailRequired');
            
            if (this.errors.lastname || this.errors.firstname || this.errors.email)
                return;

            ClientService.updateClient(this.idUpdate, this.currentClient)
            .then(() => {
                this.getClients();
                this.$refs.editModal.hide();
                Notify.create({
                    message: this.$t('msg.clientUpdatedOk'),
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

        deleteClient: function(clientId) {
            ClientService.deleteClient(clientId)
            .then(() => {
                this.getClients();
                Notify.create({
                    message: this.$t('msg.clientDeletedOk'),
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

        confirmDeleteClient: function(client) {
            Dialog.create({
                title: this.$t('msg.confirmSuppression'),
                message: `${this.$t('client')} «${client.firstname} ${client.lastname}» ${this.$t('msg.deleteNotice')}`,
                ok: {label: this.$t('btn.confirm'), color: 'negative'},
                cancel: {label: this.$t('btn.cancel'), color: 'white'}
            })
            .onOk(() => this.deleteClient(client._id))
        },

        getCompanies: function() {
            CompanyService.getCompanies()
            .then((data) => {
                // this.companies = data.data.datas.map(company => {return {label: company.name, value: company.name}});
                this.companies = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        clone: function(row) {
            this.currentClient = this.$_.clone(row);
            this.idUpdate = row._id;
        },

        cleanErrors: function() {
            this.errors.lastname = '';
            this.errors.firstname = '';
            this.errors.email = '';
        },

        cleanCurrentClient: function() {
            this.currentClient.lastname = '';
            this.currentClient.firstname = '';
            this.currentClient.email = '';
            this.currentClient.phone = '';
            this.currentClient.cell = '';            
            this.currentClient.title = '';        
            this.currentClient.company = {name: ''};        
        },

        dblClick: function(evt, row) {
            this.clone(row)
            this.$refs.editModal.show()       
        }
    }
}