import { Dialog, Notify } from 'quasar';
import Vue from 'vue'

import DataService from '@/services/data'

export default {
    data: () => {
        return {
            languages: [],
            newLanguage: {locale: "", language: ""},

            auditTypes: [],
            newAuditType: {name: "", locale: ""},

            vulnTypes: [],
            newVulnType: {name: "", locale: ""},

            sections: [],
            newSection: {field: "", name: "", locale: ""},

            errors: {locale: '', language: '', auditType: '', vulnType: '', sectionField: '', sectionName: ''}
        }
    },

    mounted: function() {
        this.getLanguages();
        this.getAuditTypes();
        this.getVulnerabilityTypes();
        this.getSections();
    },

    methods: {
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

        // Delete Language
        deleteLanguage: function(locale) {
            DataService.deleteLanguage(locale)
            .then((data) => {
                this.getLanguages();
                Notify.create({
                    message: 'Language deleted successfully',
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

        // Delete Audit type
        deleteAuditType: function(name) {
            DataService.deleteAuditType(name)
            .then((data) => {
                this.getAuditTypes();
                Notify.create({
                    message: 'Audit type deleted successfully',
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

        // Delete vulnerability type
        deleteVulnerabilityType: function(name) {
            DataService.deleteVulnerabilityType(name)
            .then((data) => {
                this.getVulnerabilityTypes();
                Notify.create({
                    message: 'Vulnerability type deleted successfully',
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

        // Delete section
        deleteSection: function(field) {
            DataService.deleteSection(field)
            .then((data) => {
                this.getSections();
                Notify.create({
                    message: 'Section deleted successfully',
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

        cleanErrors: function() {
            this.errors.locale = '';
            this.errors.language = '';
            this.errors.auditType = '';
            this.errors.vulnType = '';
            this.errors.sectionField = '';
            this.errors.sectionName = '';
        }
    }
}