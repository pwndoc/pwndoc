import Vue from 'vue'

export default {
    getRoles: function() {
        return Vue.prototype.$axios.get(`data/roles`)
    },

    getLanguages: function() {
        return Vue.prototype.$axios.get(`data/languages`)
    },

    createLanguage: function(language) {
        return Vue.prototype.$axios.post(`data/languages`, language)
    },

    deleteLanguage: function(locale) {
        return Vue.prototype.$axios.delete(`data/languages/${locale}`)
    },

    updateLanguages: function(languages) {
        return Vue.prototype.$axios.put(`data/languages`, languages)
    },

    getAuditTypes: function() {
        return Vue.prototype.$axios.get(`data/audit-types`)
    },

    createAuditType: function(auditType) {
        return Vue.prototype.$axios.post(`data/audit-types`, auditType)
    },

    deleteAuditType: function(name) {
        return Vue.prototype.$axios.delete(`data/audit-types/${name}`)
    },

    updateAuditTypes: function(auditTypes) {
        return Vue.prototype.$axios.put(`data/audit-types`, auditTypes)
    },

    getVulnerabilityTypes: function() {
        return Vue.prototype.$axios.get(`data/vulnerability-types`)
    },

    createVulnerabilityType: function(vulnerabilityType) {
        return Vue.prototype.$axios.post(`data/vulnerability-types`, vulnerabilityType)
    },

    deleteVulnerabilityType: function(name) {
        return Vue.prototype.$axios.delete(`data/vulnerability-types/${name}`)
    },

    updateVulnTypes: function(vulnTypes) {
        return Vue.prototype.$axios.put(`data/vulnerability-types`, vulnTypes)
    },

    getVulnerabilityCategories: function() {
        return Vue.prototype.$axios.get(`data/vulnerability-categories`)
    },

    createVulnerabilityCategory: function(vulnerabilityCategory) {
        return Vue.prototype.$axios.post(`data/vulnerability-categories`, vulnerabilityCategory)
    },

    updateVulnerabilityCategories: function(vulnCategories) {
        return Vue.prototype.$axios.put(`data/vulnerability-categories/`, vulnCategories)
    },

    deleteVulnerabilityCategory: function(name) {
        return Vue.prototype.$axios.delete(`data/vulnerability-categories/${name}`)
    },

    getCustomFields: function() {
        return Vue.prototype.$axios.get(`data/custom-fields`)
    },

    createCustomField: function(customField) {
        return Vue.prototype.$axios.post(`data/custom-fields`, customField)
    },

    updateCustomFields: function(customFields) {
        return Vue.prototype.$axios.put(`data/custom-fields/`, customFields)
    },

    deleteCustomField: function(customFieldId) {
        return Vue.prototype.$axios.delete(`data/custom-fields/${customFieldId}`)
    },

    getSections: function() {
        return Vue.prototype.$axios.get(`data/sections`)
    },

    getSectionsByLanguage: function(locale) {
        return Vue.prototype.$axios.get(`data/sections/${locale}`)
    },

    createSection: function(section) {
        return Vue.prototype.$axios.post(`data/sections`, section)
    },

    deleteSection: function(field, locale) {
        return Vue.prototype.$axios.delete(`data/sections/${field}/${locale}`)
    },

    updateSections: function(sections) {
        return Vue.prototype.$axios.put(`data/sections`, sections)
    }
}