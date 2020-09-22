import { Dialog, Notify } from 'quasar';

import BasicEditor from 'components/editor';
import Breadcrumb from 'components/breadcrumb'
import CvssCalculator from 'components/cvsscalculator'

import VulnerabilityService from '@/services/vulnerability'
import DataService from '@/services/data'
import UserService from '@/services/user'

export default {
    data: () => {
        return {
            UserService: UserService,
            // Vulnerabilities list
            vulnerabilities: [],
            // Datatable headers
            dtHeaders: [
                {name: 'title', label: 'Title', field: 'title', align: 'left', sortable: true},
                {name: 'category', label: 'Category', field: 'category', align: 'left', sortable: true},
                {name: 'type', label: 'Type', field: 'type', align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            // Datatable pagination
            pagination: {
                page: 1,
                rowsPerPage: 20,
                sortBy: 'title'
            },
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
                cvssScore: '',
                cvssSeverity: '',
                priority: '',
                remediationComplexity: '',
                references: [],
                details: [] 
            },
            currentLanguage: "",
            displayFilters: {valid: true, new: true, updates: true},
            dtLanguage: "",
            currentDetailsIndex: 0,
            vulnerabilityId: '',
            vulnUpdates: [],
            currentUpdate: '',
            currentUpdateLocale: '',
            vulnTypes: [],
            referencesString: '',
            // Merge languages
            mergeLanguageLeft: '',
            mergeLanguageRight: '',
            mergeVulnLeft: '',
            mergeVulnRight: '',
            // Vulnerability categories
            vulnCategories: [],
            currentCategory: null
        }
    },

    components: {
        BasicEditor,
        Breadcrumb,
        CvssCalculator
    },

    mounted: function() {
        this.getLanguages();
        this.getVulnTypes();
        this.getVulnerabilities();
        this.getVulnerabilityCategories()
    },

    watch: {
        currentLanguage: function(val, oldVal) {
            this.setCurrentDetails();
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
            VulnerabilityService.getVulnerabilities()
            .then((data) => {
                this.vulnerabilities = data.data.datas
            })
            .catch((err) => {
                console.log(err)
            })
        },

        createVulnerability: function() {
            this.cleanErrors();
            var index = this.currentVulnerability.details.findIndex(obj => obj.title !== '');
            if (index < 0)
                this.errors.title = "Title required";
            
            if (this.errors.title)
                return;

            this.currentVulnerability.references = this.referencesString.split('\n').filter(e => e !== '')
            VulnerabilityService.createVulnerabilities([this.currentVulnerability])
            .then(() => {
                this.getVulnerabilities();
                this.$refs.createModal.hide();
                Notify.create({
                    message: 'Vulnerability created successfully',
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
                this.errors.title = "Title required";
            
            if (this.errors.title)
                return;

            this.currentVulnerability.references = this.referencesString.split('\n').filter(e => e !== '')
            VulnerabilityService.updateVulnerability(this.vulnerabilityId, this.currentVulnerability)
            .then(() => {
                this.getVulnerabilities();
                this.$refs.editModal.hide();
                this.$refs.updatesModal.hide();
                Notify.create({
                    message: 'Vulnerability updated successfully',
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
                    message: 'Vulnerability deleted successfully',
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
                title: 'Confirm Suppression',
                message: `Vulnerability will be permanently deleted`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => this.deleteVulnerability(row._id))
        },

        getVulnUpdates: function(vulnId) {
            VulnerabilityService.getVulnUpdates(vulnId)
            .then((data) => {
                this.vulnUpdates = data.data.datas;
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
            this.referencesString = ""
            if (this.currentVulnerability.references && this.currentVulnerability.references.length > 0)
                this.referencesString = this.currentVulnerability.references.join('\n')
            this.setCurrentDetails();
            
            this.vulnerabilityId = row._id;
            this.getVulnUpdates(this.vulnerabilityId);
        },

        editChangeCategory: function(category) {
            Dialog.create({
                title: 'Confirm Category change',
                message: `All present custom fields will be lost once vulnerability is updated`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => {
                if (category){
                    this.currentVulnerability.category = category.name
                    this.currentVulnerability.details[this.currentDetailsIndex].customFields = category.fields
                }
                else {
                    this.currentVulnerability.category = null
                    this.currentVulnerability.details[this.currentDetailsIndex].customFields = []
                }
                // this.updateVulnerability()
            })
        },

        cleanErrors: function() {
            this.errors.title = '';
        },  

        cleanCurrentVulnerability: function() {
            this.cleanErrors();
            this.currentVulnerability.cvssv3 = '';
            this.currentVulnerability.cvssScore = '';
            this.currentVulnerability.cvssSeverity = '';
            this.currentVulnerability.priority = '';
            this.currentVulnerability.remediationComplexity = '';
            this.currentVulnerability.references = [];
            this.currentVulnerability.details = [];
            this.currentLanguage = this.dtLanguage;
            if (this.currentCategory && this.currentCategory.name) 
                this.currentVulnerability.category = this.currentCategory.name
            else
                this.currentVulnerability.category = null

            this.referencesString = ''
            this.setCurrentDetails();
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
                    remediation: ''
                }
                if (this.currentCategory && this.currentCategory.fields && this.currentCategory.fields.length > 0) {
                    details.customFields = []
                    this.currentCategory.fields.forEach(field => {
                        details.customFields.push({
                            label: field.label,
                            fieldType: field.fieldType,
                            text: ''
                        })
                    })
                }
                
                this.currentVulnerability.details.push(details)
                index = this.currentVulnerability.details.length - 1;
            }
            this.currentDetailsIndex = index;
        },

        isTextInCustomFields: function(text) {
            var result = false
            if (this.currentVulnerability.details[this.currentDetailsIndex].customFields) {
                result = typeof this.currentVulnerability.details[this.currentDetailsIndex].customFields.find(f => f.text === text) === 'undefined'
            }
            return result
        },

        getDtTitle: function(row) {
            var index = row.details.findIndex(obj => obj.locale === this.dtLanguage);
            if (index < 0 || !row.details[index].title)
                return "Not defined for this language yet";
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
                        ? data.sort((a, b) => (b.category || 'No Category').localeCompare(a.category || 'No Category'))
                        : data.sort((a, b) => (a.category || 'No Category').localeCompare(b.category || 'No Category'))
                }
                return data;
            }
        },

        customFilter: function(rows, terms, cols, getCellValue) {
            var result = rows && rows.filter(row => {
                var title = this.getDtTitle(row).toLowerCase()
                var type = this.getDtType(row).toLowerCase()
                var category = (row.category || "No Category").toLowerCase()
                var termTitle = (terms.title || "").toLowerCase()
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
            this.$router.push({name: 'audits', params: {finding: title}});
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
                    message: 'Vulnerability merge successfully',
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
        }
    }
}