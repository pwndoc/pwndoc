import Vue from 'vue'

export default {
    getLanguages: function() {
        return Vue.prototype.$axios.get(`data/languages`)
    },

    createLanguage: function(language) {
        return Vue.prototype.$axios.post(`data/languages`, language)
    },

    deleteLanguage: function(locale) {
        return Vue.prototype.$axios.delete(`data/languages/${locale}`)
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

    getVulnerabilityTypes: function() {
        return Vue.prototype.$axios.get(`data/vulnerability-types`)
    },

    createVulnerabilityType: function(vulnerabilityType) {
        return Vue.prototype.$axios.post(`data/vulnerability-types`, vulnerabilityType)
    },

    deleteVulnerabilityType: function(name) {
        return Vue.prototype.$axios.delete(`data/vulnerability-types/${name}`)
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

    deleteSection: function(field) {
        return Vue.prototype.$axios.delete(`data/sections/${field}`)
    },
}