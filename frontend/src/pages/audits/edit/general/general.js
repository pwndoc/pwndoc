import { Notify, Dialog } from 'quasar';

import Breadcrumb from 'components/breadcrumb';
import TextareaArray from 'components/textarea-array'
import CustomFields from 'components/custom-fields'

import AuditService from '@/services/audit';
import ClientService from '@/services/client';
import CompanyService from '@/services/company';
import CollabService from '@/services/collaborator';
import ReviewerService from '@/services/reviewer';
import TemplateService from '@/services/template';
import DataService from '@/services/data';
import Utils from '@/services/utils';
import UserService from '@/services/user'

export default {
    props: {
        isReviewing: Boolean,
		isEditing: Boolean,
		isApproved: Boolean,
		isReadyForReview: Boolean,
        fullyApproved: Boolean
    },
    data: () => {
        return {
            // Set audit ID
            auditId: null,
            // Current editing audit object
            audit: {
                creator: {},
                name: "",
                location: "",
                auditType: "",
                client: {},
                company: {},
                collaborators: [],
                reviewers: [],
                date: "",
                date_start: "",
                date_end: "",
                scope: [],
                language: "",
                template: "",
                customFields: [],
                isReadyForReview: false,
                approvals: []
            },
            auditOrig: {},
            // List of existing clients
            clients: [],
            // List of filtered clients when company is selected
            selectClients: [],
            // List of existing Collaborators
            collaborators: [],
            // List of existing reviewers
            reviewers: [],
            // List of existing Companies
            companies: [],
            // List of filtered companies
            selectCompanies: [],
            // List of existing Templates
            templates: [],
            // List of existing Languages
            languages: [],
            // List of existing audit types
            auditTypes: [],
            // List of CustomFields
            customFields: []
        }
    },

    components: {
        Breadcrumb,
        TextareaArray,
        CustomFields
    },

    mounted: function() {
        this.auditId = this.$route.params.auditId;
        this.getAuditGeneral();
        this.getClients();
        this.getTemplates();
        this.getLanguages();
        this.getAuditTypes();
        this.isApprovedCopy = this.isApproved;
        this.isReadyForReviewCopy = this.isReadyForReview;

        this.$socket.emit('menu', {menu: 'general', room: this.auditId});

        // save on ctrl+s
        // var lastSave = 0;
        document.addEventListener('keydown', this._listener, false)
    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false)
    },

    beforeRouteLeave (to, from , next) {
        Utils.syncEditors(this.$refs)
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

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                this.updateAuditGeneral();
            }
        },

        // Get Audit datas from uuid
        getAuditGeneral: function() {
            DataService.getCustomFields()
            .then((data) => {
                this.customFields = data.data.datas
                return AuditService.getAuditGeneral(this.auditId)
            })
            .then((data) => {
                this.audit = data.data.datas;
                this.auditOrig = this.$_.cloneDeep(this.audit);
                this.getCollaborators();
                this.getReviewers();
            })
            .catch((err) => {              
                console.log(err.response)
            })
        },

        // Save Audit
        updateAuditGeneral: function() {
            Utils.syncEditors(this.$refs)
            this.$nextTick(() => {
                if (this.$refs.customfields && this.$refs.customfields.requiredFieldsEmpty()) {
                    Notify.create({
                        message: 'Please fill all required Fields',
                        color: 'negative',
                        textColor:'white',
                        position: 'top-right'
                    })
                    return
                }
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
            })
        },

        // Get Clients list
        getClients: function() {
            ClientService.getClients()
            .then((data) => {
                this.clients = data.data.datas;
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
                var creatorId = ""
                if (this.audit.creator)
                    creatorId = this.audit.creator._id
                this.collaborators = data.data.datas.filter(e => e._id !== creatorId)
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get Reviewers list
        getReviewers: function() {
            ReviewerService.getReviewers()
            .then((data) => {
                var creatorId = ""
                if (this.audit.creator)
                    creatorId = this.audit.creator._id
                this.reviewers = data.data.datas.filter(e => e._id !== creatorId)
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
        filterClients: function() {
            this.audit.client = null
            if (this.audit.company) {
                this.selectClients = [];
                this.clients.map(client => {
                    if (client.company && client.company.name === this.audit.company.name) this.selectClients.push(client)
                })
            }
            else
                this.selectClients = this.clients;
        },

        // Set Company when selecting client 
        setCompanyFromClient: function(value) {
            if (value && !value.company) {
                this.audit.company = null;
            }
            else if (value) {
                for (var i=0; i<this.companies.length; i++) {
                    if (this.companies[i].name === value.company.name) {
                        this.audit.company = this.companies[i];
                        break;
                    }
                }
            }
        },

        createSelectCompany: function(val, done) {
            var index = this.companies.findIndex(e => Utils.normalizeString(e.name) === Utils.normalizeString(val))
            if (index > -1)
                done(this.companies[index], 'add-unique')
            else
                done(val, 'add-unique')
        },

        filterSelectCompany (val, update) {   
            if (val === '') {
                update(() => this.selectCompanies = this.companies)
                return
              }
            update(() => {
                const needle = Utils.normalizeString(val)
                this.selectCompanies = this.companies.filter(v => Utils.normalizeString(v.name).indexOf(needle) > -1)
            })
        },

        toggleAskReview: function() {
            AuditService.updateAuditGeneral(this.auditId, { isReadyForReview: !this.audit.isReadyForReview })
            .then(() => {
                this.$emit('toggleAskReview');
                this.audit.isReadyForReview = !this.audit.isReadyForReview;
                this.auditOrig.isReadyForReview = this.audit.isReadyForReview;
                Notify.create({
                    message: 'Audit review status updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {             
                console.log(err.response)
            });
        },

        toggleApproval: function() {
            AuditService.toggleApproval(this.auditId)
            .then(() => {
                this.$emit('toggleApproval');

                Notify.create({
                    message: 'Audit approval updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {          
                console.log(err.response)
            });
        }
    }
}