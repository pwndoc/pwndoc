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
            Response.BadParameters(res, 'language and locale value must match /^[a-z0-9 \[\]()\._-]+$/i')
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
            Response.BadParameters(res, 'name and locale value must match /^[a-z0-9 \[\]()\._-]+$/i')
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
            Response.BadParameters(res, 'name and locale value must match /^[a-z0-9 \[\]()\._-]+$/i')
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
            Response.BadParameters(res, 'name value must match /^[a-z0-9 \[\]()\._-]+$/i')
            return
        }

        var vulnCat = {};
        vulnCat.name = req.body.name;
        vulnCat.fields = req.body.fields || [];
        VulnerabilityCategory.create(vulnCat)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update vulnerability category
    app.put("/api/data/vulnerability-categories/:name(*)", acl.hasPermission('vulnerability-categories:update'), function(req, res) {
        if (!req.body.fields) {
            Response.BadParameters(res, 'Missing required parameters: fields');
            return;
        }

        var vulnCat = {};
        vulnCat.fields = req.body.fields;
        if (req.params.name) vulnCat.name = req.params.name;
        VulnerabilityCategory.update(req.params.name, vulnCat)
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
            Response.BadParameters(res, 'name and field value must match /^[a-z0-9 \[\]()\._-]+$/i ')
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
}