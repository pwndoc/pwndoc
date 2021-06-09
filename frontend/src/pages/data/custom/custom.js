import { Dialog, Notify } from 'quasar';
import draggable from 'vuedraggable'
import BasicEditor from 'components/editor';
import CustomFields from 'components/custom-fields'

import DataService from '@/services/data'
import Utils from '@/services/utils'
import UserService from '@/services/user'
import TemplateService from '@/services/template'

export default {
    data: () => {
        return {
            UserService: UserService,
            Utils: Utils,
            templates: [],

            languages: [],
            newLanguage: {locale: "", language: ""},
            editLanguages: [],
            editLanguage: false,

            auditTypes: [],
            newAuditType: {name: "", templates: [], sections: [], hidden: []},
            editAuditTypes: [],
            editAuditType: false,

            vulnTypes: [],
            newVulnType: {name: "", locale: ""},
            editVulnTypes: [],
            editVulnType: false,

            vulnCategories: [],
            newVulnCat: {name: ""},
            editCategories: [],
            editCategory: false,

            customFields: [],
            newCustomField: {
                label: "", 
                fieldType: "", 
                display: "general", 
                displaySub: "", 
                size: 12,
                offset: 0,
                required: false,
                description: '',
                text: [],
                options: []
            },
            cfLocale: "",
            cfDisplayOptions: [
                {label: 'Audit General', value: 'general'},
                {label: 'Audit Finding', value: 'finding'},
                {label: 'Audit Section', value: 'section'},
                {label: 'Vulnerability', value: 'vulnerability'}
            ],
            cfComponentOptions: [
                {label: 'Checkbox', value: 'checkbox', icon: 'check_box'},
                {label: 'Date', value: 'date', icon: 'event'},
                {label: 'Editor', value: 'text', icon: 'mdi-format-pilcrow'},
                {label: 'Input', value: 'input', icon: 'title'},
                {label: 'Radio', value: 'radio', icon: 'radio_button_checked'},
                {label: 'Select', value: 'select', icon: 'far fa-caret-square-down'},
                {label: 'Select Multiple', value: 'select-multiple', icon: 'filter_none'},
                {label: 'Space', value: 'space', icon: 'space_bar'}
            ],
            newCustomOption: "",

            sections: [],
            newSection: {field: "", name: "", icon: ""},
            editSections: [],
            editSection: false,

            errors: {locale: '', language: '', auditType: '', vulnType: '', vulnCat: '', vulnCatField: '', sectionField: '', sectionName: '', fieldLabel: '', fieldType: ''},

            selectedTab: "languages",
        }
    },

    components: {
        BasicEditor,
        CustomFields,
        draggable
    },

    mounted: function() {
        this.getTemplates()
        this.getLanguages()
        this.getAuditTypes()
        this.getVulnerabilityTypes()
        this.getVulnerabilityCategories()
        this.getSections()
        this.getCustomFields()
    },

    computed: {
        filteredCustomFields() {
            return this.customFields.filter(field =>
                (field.display === this.newCustomField.display && field.displayList.every(e => this.newCustomField.displayList.indexOf(e) > -1))
            )
        },

        newCustomFieldLangOptions() {
            return this.newCustomField.options.filter(e => e.locale === this.cfLocale)
        }
    },

    methods: {
        getTemplates: function() {
            TemplateService.getTemplates()
            .then((data) => {
                this.templates = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        requiredFieldsEmpty: function() {
            Object.keys(this.$refs).forEach(key => {
                if (key.startsWith('validate') && this.$refs[key]) {
                    if (Array.isArray(this.$refs[key]))
                        this.$refs[key].forEach(e => e.validate())
                    else
                        this.$refs[key].validate()
                }
            })
            if (this.selectedTab === 'languages')
                return !this.newLanguage.language || !this.newLanguage.locale
            if (this.selectedTab === 'audit-types') 
                return !this.newAuditType.name || this.newAuditType.templates.length !== this.languages.length || this.newAuditType.templates.some(e => !e)
        },

/* ===== LANGUAGES ===== */

        // Get available languages
        getLanguages: function() {
            DataService.getLanguages()
            .then((data) => {
                this.languages = data.data.datas;
                if (this.languages.length > 0) {
                    this.newVulnType.locale = this.languages[0].locale;
                    this.cfLocale = this.languages[0].locale;
                }
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Create Language
        createLanguage: function() {
            if (this.requiredFieldsEmpty())
                return;

            DataService.createLanguage(this.newLanguage)
            .then((data) => {
                this.newLanguage.locale = "";
                this.newLanguage.language = "";
                this.getLanguages();
                Notify.create({
                    message: 'Language created successfully',
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

         // Update Languages
         updateLanguages: function() {
            DataService.updateLanguages(this.editLanguages)
            .then((data) => {
                this.getLanguages()
                this.editLanguage = false
                Notify.create({
                    message: 'Languages updated successfully',
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

        // Remove Language
        removeLanguage: function(locale) {
            this.editLanguages = this.editLanguages.filter(e => e.locale !== locale)
        },

/* ===== AUDIT TYPES ===== */

        // Get available audit types
        getAuditTypes: function() {
            DataService.getAuditTypes()
            .then((data) => {
                this.auditTypes = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Create Audit type
        createAuditType: function() {
            if (this.requiredFieldsEmpty())
                return

            DataService.createAuditType(this.newAuditType)
            .then((data) => {
                this.newAuditType.name = "";
                this.newAuditType.templates = [];
                this.newAuditType.sections = [];
                this.newAuditType.hidden = [];
                this.getAuditTypes();
                Notify.create({
                    message: 'Audit type created successfully',
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

        // Update Audit Types
        updateAuditTypes: function() {
            DataService.updateAuditTypes(this.editAuditTypes)
            .then((data) => {
                this.getAuditTypes()
                this.editAuditType = false
                Notify.create({
                    message: 'Audit Types updated successfully',
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

        // Remove Audit Type
        removeAuditType: function(auditType) {
            this.editAuditTypes = this.editAuditTypes.filter(e => e.name !== auditType.name)
        },

        getTemplateOptionsLanguage: function(locale) {
            var result = []
            this.templates.forEach(e => result.push({name: e.name, locale: locale, template: e._id}))
            return result
        },

/* ===== VULNERABILITY TYPES ===== */

        // Get available vulnerability types
        getVulnerabilityTypes: function() {
            DataService.getVulnerabilityTypes()
            .then((data) => {
                this.vulnTypes = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Create vulnerability type
        createVulnerabilityType: function() {
            this.cleanErrors();
            if (!this.newVulnType.name)
                this.errors.vulnType = "Name required";
            
            if (this.errors.vulnType)
                return;

            DataService.createVulnerabilityType(this.newVulnType)
            .then((data) => {
                this.newVulnType.name = "";
                this.getVulnerabilityTypes();
                Notify.create({
                    message: 'Vulnerability type created successfully',
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

        // Update Audit Types
        updateVulnTypes: function() {
            DataService.updateVulnTypes(this.editVulnTypes)
            .then((data) => {
                this.getVulnerabilityTypes()
                this.editVulnType = false
                Notify.create({
                    message: 'Vulnerability Types updated successfully',
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

        // Remove vulnerability type
        removeVulnType: function(vulnType) {
            this.editVulnTypes = this.editVulnTypes.filter(e => e.name !== vulnType.name || e.locale !== vulnType.locale)
        },

/* ===== CATEGORIES ===== */

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

        // Create vulnerability category
        createVulnerabilityCategory: function() {
            this.cleanErrors();
            if (!this.newVulnCat.name)
                this.errors.vulnCat = "Name required";
            
            if (this.errors.vulnCat)
                return;

            DataService.createVulnerabilityCategory(this.newVulnCat)
            .then((data) => {
                this.newVulnCat.name = "";
                this.getVulnerabilityCategories();
                Notify.create({
                    message: 'Vulnerability category created successfully',
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

         // Update Vulnerability Categories
         updateVulnCategories: function() {
            DataService.updateVulnerabilityCategories(this.editCategories)
            .then((data) => {
                this.getVulnerabilityCategories()
                this.editCategory = false
                Notify.create({
                    message: 'Vulnerability Categories updated successfully',
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
        
        // Remove Category
        removeCategory: function(vulnCat) {
            this.editCategories = this.editCategories.filter(e => e.name !== vulnCat.name)
        },

/* ===== CUSTOM FIELDS ===== */

        // Get available custom fields
        getCustomFields: function() {
            DataService.getCustomFields()
            .then((data) => {
                this.customFields = data.data.datas.filter(e => e.display)
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Create custom field
        createCustomField: function() {
            if (this.newCustomField.fieldType !== 'space') {
                this.$refs['select-component'].validate()
                this.$refs['input-label'].validate()

                if (this.$refs['select-component'].hasError || this.$refs['input-label'].hasError)
                    return
            }

            this.newCustomField.position = this.customFields.length
            DataService.createCustomField(this.newCustomField)
            .then((data) => {
                this.newCustomField.label = ""
                this.newCustomField.options = []
                this.getCustomFields()
                Notify.create({
                    message: 'Custom Field created successfully',
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

        // Update Custom Fields
        updateCustomFields: function() {
            var position = 0
            this.customFields.forEach(e => e.position = position++)
            DataService.updateCustomFields(this.customFields)
            .then((data) => {
                this.getCustomFields()
                Notify.create({
                    message: 'Custom Fields updated successfully',
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

         // Delete custom field
         deleteCustomField: function(customField) {
            Dialog.create({
                title: 'Confirm Suppression',
                message: `
                <div class="row">
                    <div class="col-md-2">
                        <i class="material-icons text-warning" style="font-size:42px">warning</i>
                    </div>
                    <div class="col-md-10">
                        Custom Field <strong>${customField.label}</strong> will be permanently deleted.<br>
                        This field will be removed from <strong>ALL</strong> Vulnerablities and associated data
                        will be permanently <strong>LOST</strong>!
                    </div>
                </div>
                `,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'},
                html: true,
                style: "width: 600px"
            })
            .onOk(() => {
                DataService.deleteCustomField(customField._id)
                .then((data) => {
                    this.getCustomFields()
                    Notify.create({
                        message: `
                        Custom Field <strong>${customField.label}</strong> deleted successfully.<br>
                        <strong>${data.data.datas.vulnCount}</strong> Vulnerabilities were affected.`,
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right',
                        html: true
                    })
                })
                .catch((err) => {
                    console.log(err)
                    Notify.create({
                        message: err.response.data.datas.msg || err.response.data.datas,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
            })
        },

        canDisplayCustomField: function(field) {
            return (
                (this.newCustomField.display === field.display || (this.newCustomField.display === 'finding' && field.display === 'vulnerability')) && 
                (this.newCustomField.displaySub === field.displaySub || field.displaySub === '')
            )
        },

        canDisplayCustomFields: function() {
            return this.customFields.some(field => this.canDisplayCustomField(field))
        },

        // Return the index of the text array that match the selected locale
        // Also push default empty value if index not found
        getFieldLocaleText: function(fieldIdx) {
            var text = this.customFields[fieldIdx].text
            for (var i=0; i<text.length; i++) {
                if (text[i].locale === this.cfLocale)
                    return i
            }
            if (['select-multiple', 'checkbox'].includes(this.customFields[fieldIdx].fieldType))
                text.push({locale: this.cfLocale, value: []})
            else
                text.push({locale: this.cfLocale, value: ""})
            return i
        },

        addCustomFieldOption: function(options) {
            options.push({locale: this.cfLocale, value: this.newCustomOption})
            this.newCustomOption = ""
        },

        // Remove option of options based on index of computed lang Option
        removeCustomFieldOption: function(options, option) {
            var index = options.findIndex(e => e.locale === option.locale && e.value === option.value)
            options.splice(index, 1)
        },

        getOptionsGroup: function(options) {
            return options
            .filter(e => e.locale === this.cfLocale)
            .map(e => {return {label: e.value, value: e.value}})
        },

        getFieldLangOptions: function(options) {
            return options.filter(e => e.locale === this.cfLocale)
        },

/* ===== SECTIONS ===== */

        // Get available sections
        getSections: function() {
            DataService.getSections()
            .then((data) => {
                this.sections = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Create section
        createSection: function() {
            this.cleanErrors();
            if (!this.newSection.field)
                this.errors.sectionField = "Field required";
            if (!this.newSection.name)
                this.errors.sectionName = "Name required";
            
            if (this.errors.sectionName || this.errors.sectionField)
                return;

            DataService.createSection(this.newSection)
            .then((data) => {
                this.newSection.field = "";
                this.newSection.name = "";
                this.newSection.icon = ""
                this.getSections();
                Notify.create({
                    message: 'Section created successfully',
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

         // Update Sections
         updateSections: function() {
            Utils.syncEditors(this.$refs)
            DataService.updateSections(this.editSections)
            .then((data) => {
                this.sections = this.editSections
                this.editSection = false
                Notify.create({
                    message: 'Sections updated successfully',
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

        // Remove section
        removeSection: function(index) {
            this.editSections.splice(index, 1)
        },

        cleanErrors: function() {
            this.errors.locale = ''
            this.errors.language = ''
            this.errors.auditType = ''
            this.errors.vulnType = ''
            this.errors.vulnCat = ''
            this.errors.fieldLabel = ''
            this.errors.fieldType = ''
            this.errors.sectionField = ''
            this.errors.sectionName = ''
        }
    }
}