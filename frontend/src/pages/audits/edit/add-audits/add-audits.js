import { Notify } from 'quasar';

import AuditStateIcon from 'components/audit-state-icon'
import Breadcrumb from 'components/breadcrumb'

import AuditService from '@/services/audit'
import DataService from '@/services/data'
import CompanyService from '@/services/company'
import { useUserStore } from 'src/stores/user'

import { $t } from '@/boot/i18n'

const userStore = useUserStore()

export default {
    data: () => {
        return {
            // Audits list
            audits: [],
            // Loading state
            loading: true,
            // AuditTypes list
            auditTypes: [],
            // Companies list
            companies: [],
            // Languages availbable
            languages: [],
            // Datatable headers
            dtHeaders: [
                {name: 'name', label: $t('name'), field: 'name', align: 'left', sortable: true},
                {name: 'language', label: $t('language'), field: 'language', align: 'left', sortable: true},
                {name: 'company', label: $t('company'), field: row => (row.company)?row.company.name:'', align: 'left', sortable: true},
                {name: 'users', label: $t('participants'), align: 'left', sortable: true},
                {name: 'date', label: $t('date'), field: row => row.createdAt.split('T')[0], align: 'left', sortable: true},
                {name: 'connected', label: '', align: 'left', sortable: false},
                {name: 'reviews', label: '', align: 'left', sortable: false},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            visibleColumns: ['name', 'language', 'company', 'users', 'date', 'action'],
            // Datatable pagination
            pagination: {
                page: 1,
                rowsPerPage: 25,
                sortBy: 'date',
                descending: true
            },
            rowsPerPageOptions: [
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:'All', value:0}
            ],
            // Search filter
            search: {name: '', language: '', company: '', users: '', date: ''},
            myAudits: false,
            // Errors messages
            errors: {name: '', language: '', auditType: ''},
            // Selected or New Audit
            currentAudit: {name: '', language: '', auditType: '', type: 'default'}
        }
    },

    inject: [
        'frontEndAuditState',
        'auditParent'
    ],

    components: {
        AuditStateIcon,
        Breadcrumb
    },

    computed: {
        displayLanguage: function() {
            return localStorage.getItem("system_language") || null;
        },
        shouldHideLanguageField: function() {
            // Hide language field if there's only one language AND it matches the display language
            if (!this.languages || this.languages.length !== 1) {
                return false;
            }
            
            // If no display language is set, don't hide the field
            if (!this.displayLanguage) {
                return false;
            }
            
            const languageLocale = String(this.languages[0].locale || '').toLowerCase().trim();
            const displayLang = String(this.displayLanguage || '').toLowerCase().trim();
            
            if (!languageLocale || !displayLang) {
                return false;
            }
            
            // Normalize both values (replace underscores with hyphens, handle case)
            const normalizedLanguage = languageLocale.replace(/_/g, '-');
            const normalizedDisplay = displayLang.replace(/_/g, '-');
            
            // Extract base language code (e.g., "en" from "en-US", "fr" from "fr-FR", etc.)
            const languageBase = normalizedLanguage.split('-')[0];
            const displayBase = normalizedDisplay.split('-')[0];
            
            // Match if exact match or if base language codes match
            // This handles cases like "en" matching "en-us", "fr" matching "fr-FR", etc.
            const matches = normalizedLanguage === normalizedDisplay || languageBase === displayBase;
            
            return matches;
        }
    },

    watch: {
        languages: {
            handler: function(newVal) {
                // Auto-select language if only one is available
                if (newVal && newVal.length === 1) {
                    // Always set it if there's only one language, unless it's already set to that language
                    if (this.currentAudit.language !== newVal[0].locale) {
                        this.currentAudit.language = newVal[0].locale;
                    }
                }
            },
            immediate: true
        },
    },

    mounted: function() {
        this.search.finding = this.$route.params.finding;

        if (this.$settings.reviews.enabled)
            this.visibleColumns.push('reviews')

        this.currentAudit.language = this.auditParent.language

        this.getAudits();
        this.getLanguages();
        this.getAuditTypes();
        this.getCompanies();

        this.$socket.emit('menu', {menu: 'addAudits', room: this.auditParent._id});
    },

    methods: {
        getLanguages: function() {
            DataService.getLanguages()
            .then((data) => {
                this.languages = data.data.datas;
                // Auto-select language if only one is available (and not already set to parent language)
                if (this.languages.length === 1 && !this.currentAudit.language) {
                    this.currentAudit.language = this.languages[0].locale;
                }
            })
            .catch((err) => {
                console.log(err)
            })
        },

        getAuditTypes: function() {
            DataService.getAuditTypes()
            .then((data) => {
                this.auditTypes = data.data.datas
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
            })
            .catch((err) => {
                console.log(err)
            })
        },

        getAudits: function() {
            this.loading = true
            AuditService.getAudits({type: 'default'})
            .then((data) => {
                this.audits = data.data.datas.filter(e => !e.parentId)
                this.loading = false
            })
            .catch((err) => {
                console.log(err)
            })
        },

        createAudit: function() {
            this.cleanErrors();
            if (!this.currentAudit.name)
                this.errors.name = "Name required";
            if (!this.currentAudit.language)
                this.errors.language = "Language required";
            if (!this.currentAudit.auditType)
                this.errors.auditType = "Assessment required";
                
            
            if (this.errors.name || this.errors.language || this.errors.auditType)
                return;

            this.currentAudit.parentId = this.auditParent._id

            AuditService.createAudit(this.currentAudit)
            .then((response) => {
                this.$refs.createModal.hide();
                this.$router.push("/audits/" + response.data.datas.audit._id)
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

        updateAuditParent: function(audit) {
            if (audit && audit._id) {
                AuditService.updateAuditParent(audit._id, this.auditParent._id)
                .then(() => {
                    this.audits = this.audits.filter(e => e._id !== audit._id)
                    Notify.create({
                        message: $t('msg.auditUpdateOk'),
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
            }
        },

        cleanErrors: function() {
            this.errors.name = '';
            this.errors.language = '';
            this.errors.auditType = '';
        },

        cleanCurrentAudit: function() {
            this.cleanErrors();
            this.currentAudit.name = '';
            this.currentAudit.auditType = '';
            this.currentAudit.type = 'default';
            // Auto-select language if only one is available when modal opens
            if (this.languages && this.languages.length === 1) {
                this.currentAudit.language = this.languages[0].locale;
            } else {
                // Otherwise default to parent language
                this.currentAudit.language = this.auditParent.language;
            }
        },

        // Convert language locale of audit for table display
        convertLocale: function(locale) {
            for (var i=0; i<this.languages.length; i++)
                if (this.languages[i].locale === locale)
                    return this.languages[i].language;
            return ""
        },

        convertParticipants: function(row) {
            var collabs = (row.collaborators)? row.collaborators: [];
            var result = (row.creator)? [row.creator.username]: [];
            collabs.forEach(collab => result.push(collab.username));
            return result.join(', '); 
        },

        customFilter: function(rows, terms, cols, getCellValue) {
            var username = userStore.username.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

            var nameTerm = (terms.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            var languageTerm = (terms.language)? terms.language.toLowerCase(): ""
            var companyTerm = (terms.company)? terms.company.toLowerCase(): ""
            var usersTerm = (terms.users || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            var dateTerm = (terms.date)? terms.date.toLowerCase(): ""

            return rows && rows.filter(row => {
                var name = (row.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                var language = (row.language)? row.language.toLowerCase(): ""
                var companyName = (row.company)? row.company.name.toLowerCase(): ""
                var users = this.convertParticipants(row).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                var date = (row.createdAt)? row.createdAt.split('T')[0]: "";

                return name.indexOf(nameTerm) > -1 &&
                    language.indexOf(languageTerm) > -1 &&
                    (!companyTerm || companyTerm === companyName) &&
                    users.indexOf(usersTerm) > -1 &&
                    date.indexOf(dateTerm) > -1 &&
                    ((this.myAudits && users.indexOf(username) > -1) || !this.myAudits) &&
                    ((this.displayConnected && row.connected && row.connected.length > 0) || !this.displayConnected) &&
                    ((this.displayReadyForReview && users.indexOf(username) < 0 && row.state === 'REVIEW') || !this.displayReadyForReview)
            })
        },

        dblClick: function(evt, row) {
            if (row)
                this.updateAuditParent(row)
        }
    }
}