import { Dialog, Notify } from 'quasar';
import Vue from 'vue'

import ClientService from '@/services/client'
import CompanyService from '@/services/company'
import Utils from '@/services/utils'

export default {
    data: () => {
        return {
            // clients list
            clients: [],
            // Loading state
            loading: true,
            // Companies list
            companies: [],
            // Datatable headers
            dtHeaders: [
                {name: 'firstname', label: 'Firstname', field: 'firstname', align: 'left', sortable: true},
                {name: 'lastname', label: 'Lastname', field: 'lastname', align: 'left', sortable: true},
                {name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true},
                {name: 'company', label: 'Company', field: row => (row.company)?row.company.name:'', align: 'left', sortable: true},
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
                this.errors.lastname = "Lastname required";
            if (!this.currentClient.firstname)
                this.errors.firstname = "Firstname required";
            if (!this.currentClient.email)
                this.errors.email = "Email required";
            
            if (this.errors.lastname || this.errors.firstname || this.errors.email)
                return;

            ClientService.createClient(this.currentClient)
            .then(() => {
                this.getClients();
                this.$refs.createModal.hide();
                Notify.create({
                    message: 'Client created successfully',
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
                this.errors.lastname = "Lastname required";
            if (!this.currentClient.firstname)
                this.errors.firstname = "Firstname required";
            if (!this.currentClient.email)
                this.errors.email = "Email required";
            
            if (this.errors.lastname || this.errors.firstname || this.errors.email)
                return;

            ClientService.updateClient(this.idUpdate, this.currentClient)
            .then(() => {
                this.getClients();
                this.$refs.editModal.hide();
                Notify.create({
                    message: 'Client updated successfully',
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
                    message: 'Client deleted successfully',
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
                title: 'Confirm Suppression',
                message: `Client «${client.name}» will be permanently deleted`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
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