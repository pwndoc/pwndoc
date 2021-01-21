module.exports = function(app, io) {

    var Response = require('../lib/httpResponse');
    var Audit = require('mongoose').model('Audit');
    var acl = require('../lib/auth').acl;
    var reportGenerator = require('../lib/report-generator');
    var _ = require('lodash');

    /* ### AUDITS LIST ### */

    // Get audits list of user (all for admin) with regex filter on findings
    app.get("/api/audits", acl.hasPermission('audits:read'), function(req, res) {
        var filters = {};
        if (req.query.findingTitle) filters['findings.title'] = new RegExp(req.query.findingTitle, 'i')
            Audit.getAudits(acl.isAdmin(req.decodedToken.role, 'audits:read'), req.decodedToken.id, filters)
            .then(msg => Response.Ok(res, msg))
            .catch(err => Response.Internal(res, err))
    });

    // Create audit with name, template, language and username provided
    app.post("/api/audits", acl.hasPermission('audits:create'), function(req, res) {
        if (!req.body.name || !req.body.language || !req.body.template) {
            Response.BadParameters(res, 'Missing some required parameters');
            return;
        }

        var audit = {};
        // Required params
        audit.name = req.body.name;
        audit.language = req.body.language;
        audit.template = req.body.template;

        Audit.create(audit, req.decodedToken.id)
        .then(inserted => Response.Created(res, {message: 'Audit created successfully', audit: inserted}))
        .catch(err => Response.Internal(res, err))
    });

    // Delete audit if creator or admin
    app.delete("/api/audits/:auditId", acl.hasPermission('audits:delete'), function(req, res) {
        Audit.delete(acl.isAdmin(req.decodedToken.role, 'audits:delete'), req.params.auditId, req.decodedToken.id)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    })

    /* ### AUDITS EDIT ### */

    // Get Audit with ID
    app.get("/api/audits/:auditId", acl.hasPermission('audits:update'), function(req, res) {
        Audit.getAudit(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Get audit general information
    app.get("/api/audits/:auditId/general", acl.hasPermission('audits:update'), function(req, res) {
        Audit.getGeneral(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update audit general information
    app.put("/api/audits/:auditId/general", acl.hasPermission('audits:update'), function(req, res) {
        var update = {};
        // Optional parameters
        if (req.body.name) update.name = req.body.name;
        if (req.body.auditType) update.auditType = req.body.auditType;
        if (req.body.location) update.location = req.body.location;
        if (req.body.date) update.date = req.body.date;
        if (req.body.date_start) update.date_start = req.body.date_start;
        if (req.body.date_end) update.date_end = req.body.date_end;
        if (req.body.client && req.body.client._id) {
            update.client = {};
            update.client._id = req.body.client._id;
        }
        if (req.body.company && req.body.company._id) {
            update.company = {};
            update.company._id = req.body.company._id;
        }
        if (req.body.collaborators) update.collaborators = req.body.collaborators;
        if (req.body.language) update.language = req.body.language;
        if (req.body.scope && typeof(req.body.scope === "array")) {
            update.scope = req.body.scope.map(item => {return {name: item}});
        }
        if (req.body.template) update.template = req.body.template;        

        Audit.updateGeneral(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, update)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Get audit network information
    app.get("/api/audits/:auditId/network", acl.hasPermission('audits:update'), function(req, res) {
        Audit.getNetwork(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update audit network information
    app.put("/api/audits/:auditId/network", acl.hasPermission('audits:update'), function(req, res) {
        var update = {};
        // Optional parameters
        if (req.body.scope) update.scope = req.body.scope;

        Audit.updateNetwork(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, update)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Add finding to audit
    app.post("/api/audits/:auditId/findings", acl.hasPermission('audits:update'), function(req, res) {
        if (!req.body.title) {
            Response.BadParameters(res, 'Missing some required parameters: title');
            return;
        }

        var finding = {};
        // Required parameters
        finding.title = req.body.title;
        
        // Optional parameters
        if (req.body.vulnType) finding.vulnType = req.body.vulnType;
        if (req.body.description) finding.description = req.body.description;
        if (req.body.observation) finding.observation = req.body.observation;
        if (req.body.remediation) finding.remediation = req.body.remediation;
        if (req.body.remediationComplexity) finding.remediationComplexity = req.body.remediationComplexity;
        if (req.body.priority) finding.priority = req.body.priority;
        if (req.body.references) finding.references = req.body.references;
        if (req.body.cvssv3) finding.cvssv3 = req.body.cvssv3;
        if (req.body.cvssScore) finding.cvssScore = req.body.cvssScore;
        if (req.body.cvssSeverity) finding.cvssSeverity = req.body.cvssSeverity;
        if (req.body.poc) finding.poc = req.body.poc;
        if (req.body.scope) finding.scope = req.body.scope;
        if (req.body.status !== undefined) finding.status = req.body.status;
        if (req.body.category) finding.category = req.body.category
        if (req.body.customFields) finding.customFields = req.body.customFields

        Audit.createFinding(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, finding)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Get findings list title
    app.get("/api/audits/:auditId/findings", acl.hasPermission('audits:update'), function(req, res) {
        Audit.getFindings(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Get finding of audit
    app.get("/api/audits/:auditId/findings/:findingId", acl.hasPermission('audits:update'), function(req, res) {
        Audit.getFinding(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, req.params.findingId)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update finding of audit
    app.put("/api/audits/:auditId/findings/:findingId", acl.hasPermission('audits:update'), function(req, res) {
        var finding = {};
        // Optional parameters
        if (req.body.title) finding.title = req.body.title;
        if (req.body.vulnType) finding.vulnType = req.body.vulnType;
        if (!_.isNil(req.body.description)) finding.description = req.body.description;
        if (!_.isNil(req.body.observation)) finding.observation = req.body.observation;
        if (!_.isNil(req.body.remediation)) finding.remediation = req.body.remediation;
        if (req.body.remediationComplexity) finding.remediationComplexity = req.body.remediationComplexity;
        if (req.body.priority) finding.priority = req.body.priority;
        if (req.body.references) finding.references = req.body.references;
        if (req.body.cvssv3) finding.cvssv3 = req.body.cvssv3;
        if (req.body.cvssScore) finding.cvssScore = req.body.cvssScore;
        if (req.body.cvssSeverity) finding.cvssSeverity = req.body.cvssSeverity;
        if (!_.isNil(req.body.poc)) finding.poc = req.body.poc;
        if (!_.isNil(req.body.scope)) finding.scope = req.body.scope;
        if (req.body.status !== undefined) finding.status = req.body.status;
        if (req.body.category) finding.category = req.body.category
        if (req.body.customFields) finding.customFields = req.body.customFields

        Audit.updateFinding(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, req.params.findingId, finding)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');            
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Delete finding of audit
    app.delete("/api/audits/:auditId/findings/:findingId", acl.hasPermission('audits:update'), function(req, res) {
        Audit.deleteFinding(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, req.params.findingId)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');            
            Response.Ok(res, msg);
        })
        .catch(err => Response.Internal(res, err))
    });

     // Get audit Summary
     app.get("/api/audits/:auditId/summary", acl.hasPermission('audits:update'), function(req, res) {
        Audit.getSummary(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update audit Summary
    app.put("/api/audits/:auditId/summary", acl.hasPermission('audits:update'), function(req, res) {
        if (typeof req.body.summary === 'undefined') {
            Response.BadParameters(res, 'Missing some required parameters: summary');
            return;
        }
        var update = {};
        // Mandatory parameters
        update.summary = req.body.summary;    

        Audit.updateSummary(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, update)
        .then(msg => {
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Add section to audit
    app.post("/api/audits/:auditId/sections", acl.hasPermission('audits:update'), function(req, res) {
        if (!req.body.field || !req.body.name) {
            Response.BadParameters(res, 'Missing some required parameters: field, name');
            return;
        }

        var section = {};
        // Required parameters
        section.name = req.body.name;
        section.field = req.body.field;
        // Optional parameters
        if (req.body.text) section.text = req.body.text

        Audit.createSection(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, section)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Get section of audit
    app.get("/api/audits/:auditId/sections/:sectionId", acl.hasPermission('audits:update'), function(req, res) {
        Audit.getSection(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, req.params.sectionId)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update section of audit
    app.put("/api/audits/:auditId/sections/:sectionId", acl.hasPermission('audits:update'), function(req, res) {
        if (typeof req.body.text === 'undefined') {
            Response.BadParameters(res, 'Missing some required parameters: text');
            return;
        }
        var section = {};
        // Mandatory parameters
        section.text = req.body.text;

        Audit.updateSection(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, req.params.sectionId, section)
        .then(msg => {
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Delete section of audit
    app.delete("/api/audits/:auditId/sections/:sectionId", acl.hasPermission('audits:update'), function(req, res) {
        Audit.deleteSection(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id, req.params.sectionId)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');            
            Response.Ok(res, msg);
        })
        .catch(err => Response.Internal(res, err))
    });

    // Generate Report for specific audit
    app.get("/api/audits/:auditId/generate", acl.hasPermission('audits:update'), function(req, res){
        Audit.getAudit(acl.isAdmin(req.decodedToken.role, 'audits:update'), req.params.auditId, req.decodedToken.id)
        .then( audit => {
            var reportDoc = reportGenerator.generateDoc(audit);
            Response.SendFile(res, `${audit.name}.${audit.template.ext || 'docx'}`, reportDoc);
        })
        .catch(err => Response.Internal(res, err));
    });
}