import { Notify, Dialog } from 'quasar';

import Breadcrumb from 'components/breadcrumb';

import AuditService from '@/services/audit';
import ClientService from '@/services/client';
import CompanyService from '@/services/company';
import CollabService from '@/services/collaborator';
import TemplateService from '@/services/template';
import DataService from '@/services/data';

export default {
    data: () => {
        return {
            // Set audit ID
            auditId: null,
            // Current editing audit object
            audit: {
                // name: "",
                // location: "",
                // auditType: "",
                // client: {},
                // company: {},
                // collaborators: [],
                // date: "",
                // date_start: "",
                // date_end: "",
                // scope: [],
                // language: "",
                // template: "",
                // idPrefix: ""
                // idStart: 1
            },
            auditOrig: {},
            // List of existing clients
            clients: [],
            // List of filtered clients when company is selected
            selectClients: [],
            // List of existing Collaborators
            collaborators: [],
            // List of existing Companies
            companies: [],
            // List of existing Templates
            templates: [],
            // List of existing Languages
            languages: [],
            // List of existing audit types
            auditTypes: [],
        }
    },

    components: {
        Breadcrumb
    },

    mounted: function() {
        this.auditId = this.$route.params.auditId;
        this.getAuditGeneral();
        this.getClients();
        this.getCollaborators();
        this.getTemplates();
        this.getLanguages();
        this.getAuditTypes();

        this.$socket.emit('menu', {menu: 'general', room: this.auditId});

        // save on ctrl+s
        // var lastSave = 0;
        document.addEventListener('keydown', this._listener, false)
    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false)
    },

    beforeRouteLeave (to, from , next) {
        if (this.$_.isEqual(this.audit, this.auditOrig))
            next();
        else {
            Dialog.create({
                title: 'There are unsaved changes !',
                message: `Do you really want to leave ?`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => next())
        }
    },

    computed: {
        auditTypesLang: function() {
            return this.auditTypes.filter(type => type.locale === this.audit.language)
        }
    },

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                this.updateAuditGeneral();
            }
        },

        // Get Audit datas from uuid
        getAuditGeneral: function() {
            AuditService.getAuditGeneral(this.auditId)
            .then((data) => {
                this.audit = data.data.datas;
                this.auditOrig = this.$_.cloneDeep(this.audit);
            })
            .catch((err) => {              
                console.log(err.response)
            })
        },

        // Save Audit
        updateAuditGeneral: function() {
            AuditService.updateAuditGeneral(this.auditId, this.audit)
            .then(() => {
                this.auditOrig = this.$_.cloneDeep(this.audit);
                Notify.create({
                    message: 'Audit updated successfully',
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

        // Get Clients list
        getClients: function() {
            ClientService.getClients()
            .then((data) => {
                this.clients = data.data.datas;
                this.selectClients = this.clients;
                this.getCompanies();
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get Companies list
        getCompanies: function() {
            CompanyService.getCompanies()
            .then((data) => {
                this.companies = data.data.datas;
                this.filterClients()
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get Collaborators list
        getCollaborators: function() {
            CollabService.getCollabs()
            .then((data) => {
                this.collaborators = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get Templates list
        getTemplates: function() {
            TemplateService.getTemplates()
            .then((data) => {
                this.templates = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get Languages list
        getLanguages: function() {
            DataService.getLanguages()
            .then((data) => {
                this.languages = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get Audit types
        getAuditTypes: function() {
            DataService.getAuditTypes()
            .then((data) => {
                this.auditTypes = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Filter client options when selecting company
        filterClients: function(value) {
            if (this.audit.company) {
                this.selectClients = [];
                this.clients.map(client => {
                    if (client.company && client.company.name === this.audit.company.name) this.selectClients.push(client)
                })
            }
            else
                this.selectClients = this.clients;
        },

        // Filter company options when selecting client 
        filterCompany: function(value) {
            if (value && !value.company) {
                this.audit.company = {};
            }
            else if (value) {
                for (var i=0; i<this.companies.length; i++) {
                    if (this.companies[i].name === value.company.name) {
                        this.audit.company = this.companies[i];
                        break;
                    }
                }
            }
        }

    }
}