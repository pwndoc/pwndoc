import { Dialog, Notify } from 'quasar';
import draggable from 'vuedraggable'
import BasicEditor from 'components/editor';

import DataService from '@/services/data'
import Utils from '@/services/utils'

export default {
    data: () => {
        return {
            languages: [],
            newLanguage: {locale: "", language: ""},
            editLanguages: [],
            editLanguage: false,

            auditTypes: [],
            newAuditType: {name: "", locale: ""},
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
            newCustomField: {label: "", fieldType: "", vulnerability: false, finding: false, categories: []},
            editCustomFields: [],
            editCustomField: false,

            sections: [],
            newSection: {field: "", name: "", locale: "", icon: ""},
            editSections: [],
            editSection: false,

            errors: {locale: '', language: '', auditType: '', vulnType: '', vulnCat: '', vulnCatField: '', sectionField: '', sectionName: '', fieldLabel: '', fieldType: ''}
        }
    },

    components: {
        BasicEditor,
        draggable
    },

    mounted: function() {
        this.getLanguages()
        this.getAuditTypes()
        this.getVulnerabilityTypes()
        this.getVulnerabilityCategories()
        this.getSections()
        this.getCustomFields()
    },

    methods: {
/* ===== LANGUAGES ===== */

        // Get available languages
        getLanguages: function() {
            DataService.getLanguages()
            .then((data) => {
                this.languages = data.data.datas;
                if (this.languages.length > 0) {
                    this.newAuditType.locale = this.languages[0].locale;
                    this.newVulnType.locale = this.languages[0].locale;
                    this.newSection.locale = this.languages[0].locale;
                }
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Create Language
        createLanguage: function() {
            this.cleanErrors();
            if (!this.newLanguage.locale)
                this.errors.locale = "Locale required";
            if (!this.newLanguage.language)
                this.errors.language = "Language required";
            
            if (this.errors.locale || this.errors.language)
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
            this.cleanErrors();
            if (!this.newAuditType.name)
                this.errors.auditType = "Name required";
            
            if (this.errors.auditType)
                return;

            DataService.createAuditType(this.newAuditType)
            .then((data) => {
                this.newAuditType.name = "";
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
            this.editAuditTypes = this.editAuditTypes.filter(e => e.name !== auditType.name || e.locale !== auditType.locale)
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
                this.customFields = data.data.datas
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Create custom field
        createCustomField: function() {
            this.cleanErrors();
            if (!this.newCustomField.label)
                this.errors.fieldLabel = "Label required"
            if (!this.newCustomField.fieldType)
                this.errors.fieldType = "Field Type required"
            
            if (this.errors.fieldLabel || this.errors.fieldType)
                return;

            DataService.createCustomField(this.newCustomField)
            .then((data) => {
                this.newCustomField.label = ""
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
            this.editCustomFields.forEach(e => e.position = position++)
            DataService.updateCustomFields(this.editCustomFields)
            .then((data) => {
                this.getCustomFields()
                this.editCustomField = false
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
                    this.editCustomField = false
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
                        message: err.response.data.datas.msg,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
            })
        },

        test:function(scope) {console.log(scope)},

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

            Utils.syncEditors(this.$refs)

            if (this.newSection.text) this.newSection.text = this.newSection.text.replace(/(<p><\/p>)+$/, '')
            DataService.createSection(this.newSection)
            .then((data) => {
                this.newSection.field = "";
                this.newSection.name = "";
                this.newSection.text = ""
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