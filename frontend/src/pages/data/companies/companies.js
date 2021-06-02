import { Dialog, Notify } from 'quasar';
import Vue from 'vue'

import CompanyService from '@/services/company'
import Utils from '@/services/utils'

export default {
    data: () => {
        return {
            // Companies list
            companies: [],
            // Loading state
            loading: true,
            // Datatable headers
            dtHeaders: [
                {name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true},
                {name: 'logo', label: 'Logo', field: 'logo', align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            // Datatable pagination
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
            // Search filter
            search: {name: ''},
            customFilter: Utils.customFilter,
            // Errors messages
            errors: {name: ''},
            // Company to create or update
            currentCompany: {
                name: '', 
                logo: ''
            },
            // Name for update
            idUpdate: ''
        }
    },

    mounted: function() {
        this.getCompanies()
    },

    methods: {
        getCompanies: function() {
            this.loading = true
            CompanyService.getCompanies()
            .then((data) => {
                this.companies = data.data.datas
                this.loading = false
            })
            .catch((err) => {
                console.log(err)
            })
        },
            
        createCompany: function() {
            this.cleanErrors();
            if (!this.currentCompany.name)
                this.errors.lastname = "Name required";

            if (this.errors.name)
                return;

            CompanyService.createCompany(this.currentCompany)
            .then(() => {
                this.getCompanies();
                this.$refs.createModal.hide();
                Notify.create({
                    message: 'Company created successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                console.log(err)
                Notify.create({
                    message: (typeof err === "String") ? err : err.message,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        updateCompany: function() {
            this.cleanErrors();
            if (!this.currentCompany.name)
                this.errors.lastname = "Name required";

            if (this.errors.name)
                return;

            CompanyService.updateCompany(this.idUpdate, this.currentCompany)
            .then(() => {
                this.getCompanies();
                this.$refs.editModal.hide();
                Notify.create({
                    message: 'Company updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.message,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        deleteCompany: function(companyId) {
            CompanyService.deleteCompany(companyId)
            .then(() => {
                this.getCompanies();
                Notify.create({
                    message: 'Company deleted successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.message,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        confirmDeleteCompany: function(company) {
            Dialog.create({
                title: 'Confirm Suppression',
                message: `Company «${company.name}» will be permanently deleted`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => this.deleteCompany(company._id))
        },

        clone: function(row) {
            this.cleanCurrentCompany();
            this.currentCompany.name = row.name;
            this.currentCompany.logo = row.logo;
            this.idUpdate = row._id;
        },

        cleanErrors: function() {
            this.errors.name = '';
        },

        cleanCurrentCompany: function() {
            this.currentCompany.name = '';
            this.currentCompany.logo = '';
        },

        handleImage: function(files) {
            var file = files[0];
            var fileReader = new FileReader();

            fileReader.onloadend = (e) => {
                this.currentCompany.logo = fileReader.result;
            }

            fileReader.readAsDataURL(file);
        },

        dblClick: function(evt, row) {
                this.clone(row)
                this.$refs.editModal.show()       
        }
    }
}