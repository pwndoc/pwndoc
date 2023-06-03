import { api } from 'boot/axios'

export default {
    getRoles: function() {
        return api.get(`data/roles`)
    },

    getLanguages: function() {
        return api.get(`data/languages`)
    },

    createLanguage: function(language) {
        return api.post(`data/languages`, language)
    },

    deleteLanguage: function(locale) {
        return api.delete(`data/languages/${locale}`)
    },

    updateLanguages: function(languages) {
        return api.put(`data/languages`, languages)
    },

    getAuditTypes: function() {
        return api.get(`data/audit-types`)
    },

    createAuditType: function(auditType) {
        return api.post(`data/audit-types`, auditType)
    },

    deleteAuditType: function(name) {
        return api.delete(`data/audit-types/${name}`)
    },

    updateAuditTypes: function(auditTypes) {
        return api.put(`data/audit-types`, auditTypes)
    },

    getVulnerabilityTypes: function() {
        return api.get(`data/vulnerability-types`)
    },

    createVulnerabilityType: function(vulnerabilityType) {
        return api.post(`data/vulnerability-types`, vulnerabilityType)
    },

    deleteVulnerabilityType: function(name) {
        return api.delete(`data/vulnerability-types/${name}`)
    },

    updateVulnTypes: function(vulnTypes) {
        return api.put(`data/vulnerability-types`, vulnTypes)
    },

    getVulnerabilityCategories: function() {
        return api.get(`data/vulnerability-categories`)
    },

    createVulnerabilityCategory: function(vulnerabilityCategory) {
        return api.post(`data/vulnerability-categories`, vulnerabilityCategory)
    },

    updateVulnerabilityCategories: function(vulnCategories) {
        return api.put(`data/vulnerability-categories/`, vulnCategories)
    },

    deleteVulnerabilityCategory: function(name) {
        return api.delete(`data/vulnerability-categories/${name}`)
    },

    getCustomFields: function() {
        return api.get(`data/custom-fields`)
    },

    createCustomField: function(customField) {
        return api.post(`data/custom-fields`, customField)
    },

    updateCustomFields: function(customFields) {
        return api.put(`data/custom-fields/`, customFields)
    },

    deleteCustomField: function(customFieldId) {
        return api.delete(`data/custom-fields/${customFieldId}`)
    },

    getSections: function() {
        return api.get(`data/sections`)
    },

    getSectionsByLanguage: function(locale) {
        return api.get(`data/sections/${locale}`)
    },

    createSection: function(section) {
        return api.post(`data/sections`, section)
    },

    deleteSection: function(field, locale) {
        return api.delete(`data/sections/${field}/${locale}`)
    },

    updateSections: function(sections) {
        return api.put(`data/sections`, sections)
    }
}