module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var auth = require('../lib/auth');
    var Language = require('mongoose').model('Language');
    var AuditType = require('mongoose').model('AuditType');
    var VulnerabilityType = require('mongoose').model('VulnerabilityType');
    var CustomSection = require('mongoose').model('CustomSection');

/* ===== LANGUAGES ===== */

    // Get languages list
    app.get("/api/data/languages", auth.hasRole('user'), function(req, res) {
        Language.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create language
    app.post("/api/data/languages", auth.hasRole('admin'), function(req, res) {
        if (!req.body.locale || !req.body.language) {
            Response.BadParameters(res, 'Missing required parameters: locale, language');
            return;
        }
        
        var language = {};
        language.locale = req.body.locale;
        language.language = req.body.language;

        Language.create(language)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete Language
    app.delete("/api/data/languages/:locale", auth.hasRole('admin'), function(req, res) {
        Language.delete(req.params.locale)
        .then(msg => {
            Response.Created(res, 'Language deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

/* ===== AUDIT TYPES ===== */

    // Get audit types list
    app.get("/api/data/audit-types", auth.hasRole('user'), function(req, res) {
        AuditType.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create audit type
    app.post("/api/data/audit-types", auth.hasRole('admin'), function(req, res) {
        if (!req.body.name || !req.body.locale) {
            Response.BadParameters(res, 'Missing required parameters: name, locale');
            return;
        }

        var auditType = {};
        auditType.name = req.body.name;
        auditType.locale = req.body.locale;
        AuditType.create(auditType)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete audit type
    app.delete("/api/data/audit-types/:name", auth.hasRole('admin'), function(req, res) {
        AuditType.delete(req.params.name)
        .then(msg => {
            Response.Created(res, 'Audit type deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

/* ===== VULNERABILITY TYPES ===== */

     // Get vulnerability types list
     app.get("/api/data/vulnerability-types", auth.hasRole('user'), function(req, res) {
        VulnerabilityType.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create vulnerability type
    app.post("/api/data/vulnerability-types", auth.hasRole('admin'), function(req, res) {
        if (!req.body.name || !req.body.locale) {
            Response.BadParameters(res, 'Missing required parameters: name, locale');
            return;
        }

        var vulnType = {};
        vulnType.name = req.body.name;
        vulnType.locale = req.body.locale;
        VulnerabilityType.create(vulnType)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete vulnerability type
    app.delete("/api/data/vulnerability-types/:name", auth.hasRole('admin'), function(req, res) {
        VulnerabilityType.delete(req.params.name)
        .then(msg => {
            Response.Created(res, 'Vulnerability type deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

/* ===== SECTIONS ===== */

    // Get sections list
    app.get("/api/data/sections", auth.hasRole('user'), function(req, res) {
        CustomSection.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

     // Get sections by language
     app.get("/api/data/sections/:locale", auth.hasRole('user'), function(req, res) {
        CustomSection.getAllByLanguage(req.params.locale)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create section
    app.post("/api/data/sections", auth.hasRole('admin'), function(req, res) {
        if (!req.body.field || !req.body.name || !req.body.locale) {
            Response.BadParameters(res, 'Missing required parameters: field, name, locale');
            return;
        }
        
        var section = {};
        section.field = req.body.field;
        section.name = req.body.name;
        section.locale = req.body.locale;

        CustomSection.create(section)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete section
    app.delete("/api/data/sections/:field", auth.hasRole('admin'), function(req, res) {
        CustomSection.delete(req.params.field)
        .then(msg => {
            Response.Created(res, 'Section deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });
}