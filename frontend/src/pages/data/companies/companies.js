import { Dialog, Notify } from 'quasar';
import Vue from 'vue'

import CompanyService from '@/services/company'
import Utils from '@/services/utils'

import { $t } from '@/boot/i18n'

export default {
    data: () => {
        return {
            // Companies list
            companies: [],
            // Loading state
            loading: true,
            // Datatable headers
            dtHeaders: [
                {name: 'name', label: $t('name'), field: 'name', align: 'left', sortable: true},
                {name: 'shortName', label: $t('shortName'), field: 'shortName', align: 'left', sortable: true},
                {name: 'logo', label: $t('logo'), field: 'logo', align: 'left', sortable: true},
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
                shortName: '',
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
                this.errors.name = $t('msg.nameRequired');

            if (this.errors.name)
                return;

            CompanyService.createCompany(this.currentCompany)
            .then(() => {
                this.getCompanies();
                this.$refs.createModal.hide();
                Notify.create({
                    message: $t('msg.companyCreatedOk'),
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
                this.errors.name = $t('msg.nameRequired');

            if (this.errors.name)
                return;

            CompanyService.updateCompany(this.idUpdate, this.currentCompany)
            .then(() => {
                this.getCompanies();
                this.$refs.editModal.hide();
                Notify.create({
                    message: $t('msg.companyUpdatedOk'),
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
                    message: $t('msg.companyDeletedOk'),
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
                title: $t('msg.confirmSuppression'),
                message: `${$t('company')} «${company.name}» ${$t('msg.deleteNotice')}`,
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => this.deleteCompany(company._id))
        },

        clone: function(row) {
            this.cleanCurrentCompany();
            Object.assign(this.currentCompany, row);
            this.idUpdate = row._id;
        },

        cleanErrors: function() {
            this.errors.name = '';
        },

        cleanCurrentCompany: function() {
            this.currentCompany.name = '';
            this.currentCompany.shortName = '';
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