module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var acl = require('../lib/auth').acl;
    var utils = require('../lib/utils')
    var Language = require('mongoose').model('Language');
    var AuditType = require('mongoose').model('AuditType');
    var VulnerabilityType = require('mongoose').model('VulnerabilityType');
    var VulnerabilityCategory = require('mongoose').model('VulnerabilityCategory');
    var CustomSection = require('mongoose').model('CustomSection');

/* ===== LANGUAGES ===== */

    // Get languages list
    app.get("/api/data/languages", acl.hasPermission('languages:read'), function(req, res) {
        Language.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create language
    app.post("/api/data/languages", acl.hasPermission('languages:create'), function(req, res) {
        if (!req.body.locale || !req.body.language) {
            Response.BadParameters(res, 'Missing required parameters: locale, language');
            return;
        }
        if (!utils.validFilename(req.body.language) || !utils.validFilename(req.body.locale)) {
            Response.BadParameters(res, 'language and locale value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i')
            return
        }
        
        var language = {};
        language.locale = req.body.locale;
        language.language = req.body.language;

        Language.create(language)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete Language
    app.delete("/api/data/languages/:locale(*)", acl.hasPermission('languages:delete'), function(req, res) {
        Language.delete(req.params.locale)
        .then(msg => {
            Response.Ok(res, 'Language deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update Languages
    app.put("/api/data/languages", acl.hasPermission('languages:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var language = req.body[i]
            if (!language.locale || !language.language) {
                Response.BadParameters(res, 'Missing required parameters: locale, language')
                return
            }
            if (!utils.validFilename(language.language) || !utils.validFilename(language.locale)) {
                Response.BadParameters(res, 'language and locale value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i')
                return
            }
        }

        var languages = []
        req.body.forEach(e => {
            languages.push({language: e.language, locale: e.locale})
        })

        Language.updateAll(languages)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

/* ===== AUDIT TYPES ===== */

    // Get audit types list
    app.get("/api/data/audit-types", acl.hasPermission('audit-types:read'), function(req, res) {
        AuditType.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create audit type
    app.post("/api/data/audit-types", acl.hasPermission('audit-types:create'), function(req, res) {
        if (!req.body.name || !req.body.locale) {
            Response.BadParameters(res, 'Missing required parameters: name, locale');
            return;
        }
        if (!utils.validFilename(req.body.name) || !utils.validFilename(req.body.locale)) {
            Response.BadParameters(res, 'name and locale value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i')
            return
        }

        var auditType = {};
        auditType.name = req.body.name;
        auditType.locale = req.body.locale;
        AuditType.create(auditType)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete audit type
    app.delete("/api/data/audit-types/:name(*)", acl.hasPermission('audit-types:delete'), function(req, res) {
        AuditType.delete(req.params.name)
        .then(msg => {
            Response.Ok(res, 'Audit type deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update Audit Types
    app.put("/api/data/audit-types", acl.hasPermission('audit-types:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var auditType = req.body[i]
            if (!auditType.name || !auditType.locale) {
                Response.BadParameters(res, 'Missing required parameters: name, locale')
                return
            }
            if (!utils.validFilename(auditType.name) || !utils.validFilename(auditType.locale)) {
                Response.BadParameters(res, 'name and locale value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i')
                return
            }
        }

        var auditTypes = []
        req.body.forEach(e => {
            auditTypes.push({name: e.name, locale: e.locale})
        })

        AuditType.updateAll(auditTypes)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

/* ===== VULNERABILITY TYPES ===== */

     // Get vulnerability types list
     app.get("/api/data/vulnerability-types", acl.hasPermission('vulnerability-types:read'), function(req, res) {
        VulnerabilityType.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create vulnerability type
    app.post("/api/data/vulnerability-types", acl.hasPermission('vulnerability-types:create'), function(req, res) {
        if (!req.body.name || !req.body.locale) {
            Response.BadParameters(res, 'Missing required parameters: name, locale');
            return;
        }
        if (!utils.validFilename(req.body.name) || !utils.validFilename(req.body.locale)) {
            Response.BadParameters(res, 'name and locale value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i')
            return
        }

        var vulnType = {};
        vulnType.name = req.body.name;
        vulnType.locale = req.body.locale;
        VulnerabilityType.create(vulnType)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete vulnerability type
    app.delete("/api/data/vulnerability-types/:name(*)", acl.hasPermission('vulnerability-types:delete'), function(req, res) {
        VulnerabilityType.delete(req.params.name)
        .then(msg => {
            Response.Ok(res, 'Vulnerability type deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update Vulnerability Types
    app.put("/api/data/vulnerability-types", acl.hasPermission('vulnerability-types:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var vulnType = req.body[i]
            if (!vulnType.name || !vulnType.locale) {
                Response.BadParameters(res, 'Missing required parameters: name, locale')
                return
            }
            if (!utils.validFilename(vulnType.name) || !utils.validFilename(vulnType.locale)) {
                Response.BadParameters(res, 'name and locale value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i')
                return
            }
        }

        var vulnTypes = []
        req.body.forEach(e => {
            vulnTypes.push({name: e.name, locale: e.locale})
        })

        VulnerabilityType.updateAll(vulnTypes)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

/* ===== VULNERABILITY CATEGORY ===== */

     // Get vulnerability category list
     app.get("/api/data/vulnerability-categories", acl.hasPermission('vulnerability-categories:read'), function(req, res) {
        VulnerabilityCategory.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create vulnerability category
    app.post("/api/data/vulnerability-categories", acl.hasPermission('vulnerability-categories:create'), function(req, res) {
        if (!req.body.name) {
            Response.BadParameters(res, 'Missing required parameters: name');
            return;
        }
        if (!utils.validFilename(req.body.name)) {
            Response.BadParameters(res, 'name value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i')
            return
        }

        var vulnCat = {};
        vulnCat.name = req.body.name;
        vulnCat.fields = req.body.fields || [];
        VulnerabilityCategory.create(vulnCat)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update Vulnerability Category
    app.put("/api/data/vulnerability-categories", acl.hasPermission('vulnerability-categories:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var vulnCat = req.body[i]
            if (!vulnCat.name) {
                Response.BadParameters(res, 'Missing required parameters: name')
                return
            }
            if (!utils.validFilename(vulnCat.name)) {
                Response.BadParameters(res, 'name value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i')
                return
            }

            for (var j=0; j<vulnCat.fields.length; j++) {
                var field = vulnCat.fields[j]
                if (!field.fieldType || !field.label) {
                    Response.BadParameters(res, 'Missing required parameters: fields.fieldType, fields.label')
                    return
                }
                if (!utils.validFilename(field.fieldType) || !utils.validFilename(field.label) ) {
                    Response.BadParameters(res, 'fieldType and label value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i')
                    return
                }
            }
        }

        var vulnCategories = []
        req.body.forEach(e => {
            vulnCategories.push({name: e.name, fields: e.fields})
        })

        VulnerabilityCategory.updateAll(vulnCategories)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete vulnerability category
    app.delete("/api/data/vulnerability-categories/:name(*)", acl.hasPermission('vulnerability-categories:delete'), function(req, res) {
        VulnerabilityCategory.delete(req.params.name)
        .then(msg => {
            Response.Ok(res, 'Vulnerability category deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

/* ===== SECTIONS ===== */

    // Get sections list
    app.get("/api/data/sections", acl.hasPermission('sections:read'), function(req, res) {
        CustomSection.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

     // Get sections by language
     app.get("/api/data/sections/:locale", acl.hasPermission('sections:read'), function(req, res) {
        CustomSection.getAllByLanguage(req.params.locale)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create section
    app.post("/api/data/sections", acl.hasPermission('sections:create'), function(req, res) {
        if (!req.body.field || !req.body.name || !req.body.locale) {
            Response.BadParameters(res, 'Missing required parameters: field, name, locale');
            return;
        }
        if (!utils.validFilename(req.body.field) || !utils.validFilename(req.body.name)) {
            Response.BadParameters(res, 'name and field value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i ')
            return
        }
        
        var section = {};
        section.field = req.body.field;
        section.name = req.body.name;
        section.locale = req.body.locale;
        // Optional parameters
        if (req.body.text) section.text = req.body.text

        CustomSection.create(section)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete section
    app.delete("/api/data/sections/:field/:locale(*)", acl.hasPermission('sections:delete'), function(req, res) {
        CustomSection.delete(req.params.field, req.params.locale)
        .then(msg => {
            Response.Ok(res, 'Section deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

     // Update sections
     app.put("/api/data/sections", acl.hasPermission('sections:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var section = req.body[i]
            console.log(section)
            if (!section.name || !section.field || !section.locale) {
                Response.BadParameters(res, 'Missing required parameters: name, field')
                return
            }
            if (!utils.validFilename(section.name) || !utils.validFilename(section.field) || !utils.validFilename(section.locale)) {
                Response.BadParameters(res, 'name and field value must match /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i')
                return
            }
        }

        var sections = []
        req.body.forEach(e => {
            sections.push({locale: e.locale, name: e.name, field: e.field, text: e.text || ""})
        })

        CustomSection.updateAll(sections)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
}