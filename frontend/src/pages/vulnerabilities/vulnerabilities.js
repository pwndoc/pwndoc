import { Dialog, Notify } from 'quasar';

import BasicEditor from 'components/editor/Editor.vue';
import Breadcrumb from 'components/breadcrumb'
import Cvss3Calculator from 'components/cvss3calculator'
import Cvss4Calculator from 'components/cvss4calculator'
import TextareaArray from 'components/textarea-array'
import CustomFields from 'components/custom-fields'
import DraftRecoveryStatus from 'components/draft-recovery-status.vue'

import VulnerabilityService from '@/services/vulnerability'
import DataService from '@/services/data'
import { useUserStore } from 'src/stores/user'
import Utils from '@/services/utils'
import { createDraftRecovery } from '@/composables/useDraftRecovery'
import DraftRecoveryService from '@/services/draft-recovery'
import VulnerabilityQaDialog from '@/components/vulnerability-qa-dialog.vue'

import { $t } from 'boot/i18n'

const userStore = useUserStore()

export default {
    data: () => {
        return {
            userStore: userStore,
            // Vulnerabilities list
            vulnerabilities: [],
            // Loading state
            loading: true,
            // Datatable headers
            dtHeaders: [
                {name: 'title', label: $t('title'), field: 'title', align: 'left', sortable: true},
                {name: 'category', label: $t('category'), field: 'category', align: 'left', sortable: true},
                {name: 'type', label: $t('type'), field: 'type', align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            // Datatable pagination
            pagination: {
                page: 1,
                rowsPerPage: 25,
                sortBy: 'title'
            },
            rowsPerPageOptions: [
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:'All', value:0}
            ],
            filteredRowsCount: 0,
            // Vulnerabilities languages
            languages: [],
            locale: '',
            // Search filter
            search: {title: '', type: '', category: '', valid: 0, new: 1, updates: 2},
            // Errors messages
            errors: {title: ''},
            // Selected or New Vulnerability
            currentVulnerability: {
                cvssv3: '',
                cvssv4: '',
                priority: '',
                remediationComplexity: '',
                details: [] 
            },
            currentVulnerabilityOrig: null,
            currentLanguage: "",
            displayFilters: {valid: true, new: true, updates: true},
            dtLanguage: "",
            currentDetailsIndex: 0,
            vulnerabilityId: '',
            vulnUpdates: [],
            currentUpdate: '',
            currentUpdateLocale: '',
            vulnTypes: [],
            // Merge languages
            mergeLanguageLeft: '',
            mergeLanguageRight: '',
            mergeVulnLeft: '',
            mergeVulnRight: '',
            // Vulnerability categories
            vulnCategories: [],
            currentCategory: null,
            // Custom Fields
            customFields: [],
            draftRecovery: null,
            draftRecoveryPaused: false,
            vulnerabilityDrafts: []
        }
    },

    components: {
        BasicEditor,
        Breadcrumb,
        Cvss3Calculator,
        Cvss4Calculator,
        TextareaArray,
        CustomFields,
        DraftRecoveryStatus
    },

    mounted: function() {
        this.getLanguages()
        this.getVulnTypes()
        this.getVulnerabilities()
        this.getVulnerabilityCategories()
        this.getCustomFields()
        this.setupDraftRecovery()
        this.refreshVulnerabilityDrafts()
    },

    unmounted: function() {
        if (this.draftRecovery)
            this.draftRecovery.stop()
    },

    watch: {
        currentLanguage: function(val, oldVal) {
            this.setCurrentDetails();
        },
        draftRecoveryRevision: function() {
            this.refreshVulnerabilityDrafts()
        }
    },

    computed: {
        vulnTypesLang: function() {
            return this.vulnTypes.filter(type => type.locale === this.currentLanguage);
        },

        computedVulnerabilities: function() {
            var result = [];
            this.vulnerabilities.forEach(vuln => {
                for (var i=0; i<vuln.details.length; i++) {
                    if (vuln.details[i].locale === this.dtLanguage && vuln.details[i].title) {
                        result.push(vuln);
                    }
                }
            })
            return result;
        },

        vulnCategoriesOptions: function() {
            var result = this.vulnCategories.map(cat => {return cat.name})
            result.unshift('No Category')
            return result
        },

        vulnTypeOptions: function() {
            var result = this.vulnTypes.filter(type => type.locale === this.dtLanguage).map(type => {return type.name})
            result.unshift('Undefined')
            return result
        },

        filteredVulnerabilitiesMergeLeft: function() {
            return this.vulnerabilities.filter(vuln => 
                this.getVulnTitleLocale(vuln, this.mergeLanguageRight) === 'undefined' &&
                this.getVulnTitleLocale(vuln, this.mergeLanguageLeft) !== 'undefined'
            )
        },

        filteredVulnerabilitiesMergeRight: function() {
            return this.vulnerabilities.filter(vuln => 
                this.getVulnTitleLocale(vuln, this.mergeLanguageLeft) === 'undefined' &&
                this.getVulnTitleLocale(vuln, this.mergeLanguageRight) !== 'undefined'
            )
        },

        draftRecoveryRevision: function() {
            return DraftRecoveryService.state.revision
        },

        aiQaEnabled: function() {
            return this.$settings?.ai?.public?.enabled !== false &&
                userStore.isAllowed('ai:qa')
        },

        vulnerabilityQaCount: function() {
            return this.computedVulnerabilities.length
        }
    },

    methods: {
        // Get available languages
        getLanguages: function() {
            DataService.getLanguages()
            .then((data) => {
                this.languages = data.data.datas;
                if (this.languages.length > 0) {
                    this.dtLanguage = this.languages[0].locale;
                    this.cleanCurrentVulnerability();
                }
            })
            .catch((err) => {
                console.log(err)
            })
        },

         // Get available custom fields
         getCustomFields: function() {
            DataService.getCustomFields()
            .then((data) => {
                this.customFields = data.data.datas
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get Vulnerabilities types
        getVulnTypes: function() {
            DataService.getVulnerabilityTypes()
            .then((data) => {
                this.vulnTypes = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get available vulnerability categories
        getVulnerabilityCategories: function() {
            DataService.getVulnerabilityCategories()
            .then((data) => {
                this.vulnCategories = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        getVulnerabilities: function() {
            this.loading = true
            VulnerabilityService.getVulnerabilities()
            .then((data) => {
                this.vulnerabilities = data.data.datas
                this.loading = false
            })
            .catch((err) => {
                console.log(err)
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        createVulnerability: function() {
            this.cleanErrors();
            var index = this.currentVulnerability.details.findIndex(obj => obj.title !== '');
            if (index < 0)
                this.errors.title = $t('err.titleRequired');
            
            if (this.errors.title)
                return;

            VulnerabilityService.createVulnerabilities([this.currentVulnerability])
            .then(() => {
                if (this.draftRecovery)
                    this.draftRecovery.clearDraft()
                this.getVulnerabilities();
                this.$refs.createModal.hide();
                Notify.create({
                    message: $t('msg.vulnerabilityCreatedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        updateVulnerability: function() {
            this.cleanErrors();
            var index = this.currentVulnerability.details.findIndex(obj => obj.title !== '');
            if (index < 0)
                this.errors.title = $t('err.titleRequired');
            
            if (this.errors.title)
                return;

            VulnerabilityService.updateVulnerability(this.vulnerabilityId, this.currentVulnerability)
            .then(() => {
                if (this.draftRecovery)
                    this.draftRecovery.clearDraft()
                this.getVulnerabilities();
                this.$refs.editModal.hide();
                this.$refs.updatesModal.hide();
                Notify.create({
                    message: $t('msg.vulnerabilityUpdatedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        deleteVulnerability: function(vulnerabilityId) {
            VulnerabilityService.deleteVulnerability(vulnerabilityId)
            .then(() => {
                this.getVulnerabilities();
                Notify.create({
                    message: $t('msg.vulnerabilityDeletedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        confirmDeleteVulnerability: function(row) {
            Dialog.create({
                title: $t('msg.confirmSuppression'),
                message: $t('msg.vulnerabilityWillBeDeleted'),
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => this.deleteVulnerability(row._id))
        },

        getVulnUpdates: function(vulnId) {
            VulnerabilityService.getVulnUpdates(vulnId)
            .then((data) => {
                this.vulnUpdates = data.data.datas;
                this.vulnUpdates.forEach(vuln => {
                    vuln.customFields = Utils.filterCustomFields('vulnerability', this.currentVulnerability.category, this.customFields, vuln.customFields, vuln.locale)
                })
                if (this.vulnUpdates.length > 0) {
                    this.currentUpdate = this.vulnUpdates[0]._id || null;
                    this.currentLanguage = this.vulnUpdates[0].locale || null;
                }
            })
            .catch((err) => {
                console.log(err)
            })
        },

        clone: function(row) {
            this.cleanCurrentVulnerability();
            
            this.currentVulnerability = this.$_.cloneDeep(row)
            this.setCurrentDetails();
            this.currentVulnerabilityOrig = this.$_.cloneDeep(this.currentVulnerability)
            
            this.vulnerabilityId = row._id;
            if (userStore.isAllowed('vulnerabilities:update'))
                this.getVulnUpdates(this.vulnerabilityId);
        },

        openVulnerability: async function(row) {
            this.clone(row)
            await this.draftRecovery.maybePromptRecovery()
            if (userStore.isAllowed('vulnerabilities:update') && row.status === 2)
                this.$refs.updatesModal.show()
            else
                this.$refs.editModal.show()
        },

        openCreateVulnerability: async function(category) {
            this.currentCategory = category ? this.$_.cloneDeep(category) : null
            this.vulnerabilityId = ''
            this.cleanCurrentVulnerability()
            this.currentVulnerabilityOrig = this.$_.cloneDeep(this.currentVulnerability)
            await this.draftRecovery.maybePromptRecovery()

            this.$refs.createModal.show()
        },

        cleanupCurrentVulnerability: async function() {
            if (this.draftRecovery) {
                await this.draftRecovery.flushPendingWrite()
                this.draftRecovery.resetForKey()
            }
            this.draftRecoveryPaused = true
            this.vulnerabilityId = ''
            this.cleanCurrentVulnerability()
            this.currentVulnerabilityOrig = this.$_.cloneDeep(this.currentVulnerability)
            await this.$nextTick()
            this.draftRecoveryPaused = false
            await this.refreshVulnerabilityDrafts()
        },

        editChangeCategory: function(category) {
            Dialog.create({
                title: $t('msg.confirmCategoryChange'),
                message: $t('msg.categoryChangingNotice'),
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => {
                if (category){
                    this.currentVulnerability.category = category.name
                }
                else {
                    this.currentVulnerability.category = null
                }
                this.setCurrentDetails()
            })
        },

        cleanErrors: function() {
            this.errors.title = '';
        },  

        cleanCurrentVulnerability: function() {
            this.cleanErrors();
            this.currentVulnerability.cvssv3 = '';
            this.currentVulnerability.cvssv4 = '';
            this.currentVulnerability.priority = '';
            this.currentVulnerability.remediationComplexity = '';
            this.currentVulnerability.details = [];
            delete this.currentVulnerability.creator;
            this.currentLanguage = this.dtLanguage;
            if (this.currentCategory && this.currentCategory.name) 
                this.currentVulnerability.category = this.currentCategory.name
            else
                this.currentVulnerability.category = null

            this.setCurrentDetails();
        },

        setupDraftRecovery: function() {
            if (this.draftRecovery)
                return

            this.draftRecovery = createDraftRecovery(this, {
                scope: () => this.vulnerabilityId ? 'vuln-modal-edit' : 'vuln-modal-create',
                refKey: () => this.vulnerabilityId || `_new:${this.currentCategory?.name || 'none'}`,
                userId: () => userStore.id,
                getCurrent: () => this.currentVulnerability,
                setCurrent: (data) => {
                    this.currentVulnerability = data
                    if (!this.vulnerabilityId && data.category)
                        this.currentCategory = { name: data.category }
                    this.setCurrentDetails()
                },
                getOriginal: () => this.currentVulnerabilityOrig,
                isDirty: () => !!this.currentVulnerabilityOrig && !this.$_.isEqual(this.currentVulnerability, this.currentVulnerabilityOrig),
                isReadOnly: () => this.draftRecoveryPaused || (this.vulnerabilityId ? !userStore.isAllowed('vulnerabilities:update') : !userStore.isAllowed('vulnerabilities:create')),
                afterRestore: async () => {
                    await this.$nextTick()
                }
            })
        },

        refreshVulnerabilityDrafts: async function() {
            if (!userStore.id) {
                this.vulnerabilityDrafts = []
                return
            }

            this.vulnerabilityDrafts = await DraftRecoveryService.listDrafts({
                userId: userStore.id,
                scopes: ['vuln-modal-edit', 'vuln-modal-create']
            })
        },

        hasDraftForVulnerability: function(vulnerabilityId) {
            if (!vulnerabilityId || this.vulnerabilityId === vulnerabilityId)
                return false
            return this.vulnerabilityDrafts.some(draft =>
                draft.scope === 'vuln-modal-edit' &&
                draft.refKey === vulnerabilityId
            )
        },

        hasCreateDraftForCategory: function(categoryName) {
            const refKey = `_new:${categoryName || 'none'}`
            return this.vulnerabilityDrafts.some(draft =>
                draft.scope === 'vuln-modal-create' &&
                draft.refKey === refKey
            )
        },

        // Create detail if locale doesn't exist else set the currentDetailIndex
        setCurrentDetails: function(value) {
            var index = this.currentVulnerability.details.findIndex(obj => obj.locale === this.currentLanguage);
            if (index < 0) {
                var details = {
                    locale: this.currentLanguage,
                    title: '',
                    vulnType: '',
                    description: '',
                    observation: '',
                    remediation: '',
                    references: [],
                    customFields: []
                }
                details.customFields = Utils.filterCustomFields('vulnerability', this.currentVulnerability.category, this.customFields, [], this.currentLanguage)
                
                this.currentVulnerability.details.push(details)
                index = this.currentVulnerability.details.length - 1;
            }
            else {
                this.currentVulnerability.details[index].customFields = Utils.filterCustomFields('vulnerability', this.currentVulnerability.category, this.customFields, this.currentVulnerability.details[index].customFields, this.currentLanguage)
            }
            this.currentDetailsIndex = index;
        },

        isTextInCustomFields: function(field) {

            if (this.currentVulnerability.details[this.currentDetailsIndex].customFields) {
                return typeof this.currentVulnerability.details[this.currentDetailsIndex].customFields.find(f => {
                    return f.customField === field.customField._id && f.text === field.text
                }) === 'undefined'
            }
            return false
        },

        getTextDiffInCustomFields: function(field) {
            var result = ''
            if (this.currentVulnerability.details[this.currentDetailsIndex].customFields) {
                this.currentVulnerability.details[this.currentDetailsIndex].customFields.find(f => {
                    if (f.customField === field.customField._id)
                        result = f.text
                })
            }
            return result
        },

        getDtTitle: function(row) {
            var index = row.details.findIndex(obj => obj.locale === this.dtLanguage);
            if (index < 0 || !row.details[index].title)
                return $t('err.notDefinedLanguage');
            else
                return row.details[index].title;         
        },

        getDtType: function(row) {
            var index = row.details.findIndex(obj => obj.locale === this.dtLanguage);
            if (index < 0 || !row.details[index].vulnType)
                return "Undefined";
            else
                return row.details[index].vulnType;         
        },

        customSort: function(rows, sortBy, descending) {
            if (rows) {
                var data = [...rows];

                if (sortBy === 'type') {
                    (descending)
                        ? data.sort((a, b) => this.getDtType(b).localeCompare(this.getDtType(a)))
                        : data.sort((a, b) => this.getDtType(a).localeCompare(this.getDtType(b)))
                }
                else if (sortBy === 'title') {
                    (descending)
                        ? data.sort((a, b) => this.getDtTitle(b).localeCompare(this.getDtTitle(a)))
                        : data.sort((a, b) => this.getDtTitle(a).localeCompare(this.getDtTitle(b)))
                }
                else if (sortBy === 'category') {
                    (descending)
                        ? data.sort((a, b) => (b.category || $t('noCategory')).localeCompare(a.category || $t('noCategory')))
                        : data.sort((a, b) => (a.category || $t('noCategory')).localeCompare(b.category || $t('noCategory')))
                }
                return data;
            }
        },

        customFilter: function(rows, terms, cols, getCellValue) {
            var result = rows && rows.filter(row => {
                var title = this.getDtTitle(row).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                var type = this.getDtType(row).toLowerCase()
                var category = (row.category || $t('noCategory')).toLowerCase()
                var termTitle = (terms.title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                var termCategory = (terms.category || "").toLowerCase()
                var termVulnType = (terms.type || "").toLowerCase()
                return title.indexOf(termTitle) > -1 && 
                type.indexOf(termVulnType||"") > -1 &&
                category.indexOf(termCategory||"") > -1 &&
                (row.status === terms.valid || row.status === terms.new || row.status === terms.updates)
            })
            this.filteredRowsCount = result.length;
            return result;
        },

        goToAudits: function(row) {
            var title = this.getDtTitle(row);
            this.$router.push({name: 'audits', query: {findingTitle: title}});
        },

        runVulnerabilityQa: function(row) {
            Dialog.create({
                component: VulnerabilityQaDialog,
                componentProps: {
                    locale: this.dtLanguage,
                    vulnerabilityId: row._id,
                    title: this.getDtTitle(row)
                }
            })
        },

        confirmRunAllVulnerabilityQa: function() {
            const count = this.vulnerabilityQaCount
            if (!count)
                return

            Dialog.create({
                title: $t('vulnerabilityQa.allWarningTitle'),
                message: $t('vulnerabilityQa.allWarningMessage', { count: count }),
                ok: { label: $t('vulnerabilityQa.runAll'), color: 'warning' },
                cancel: { label: $t('btn.cancel'), color: 'white' },
                focus: 'cancel'
            })
            .onOk(() => {
                Dialog.create({
                    component: VulnerabilityQaDialog,
                    componentProps: {
                        locale: this.dtLanguage
                    }
                })
            })
        },

        getVulnTitleLocale: function(vuln, locale) {
            for (var i=0; i<vuln.details.length; i++) {
                if (vuln.details[i].locale === locale && vuln.details[i].title) return vuln.details[i].title;
            }
            return "undefined";
        },

        mergeVulnerabilities: function() {
            VulnerabilityService.mergeVulnerability(this.mergeVulnLeft, this.mergeVulnRight, this.mergeLanguageRight)
            .then(() => {
                this.getVulnerabilities();
                Notify.create({
                    message: $t('msg.vulnerabilityMergeOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        dblClick: function(row) {
            this.openVulnerability(row)
        }
    }
}
