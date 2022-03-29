module.exports = function(app, io) {

    var Response = require('../lib/httpResponse');
    var Audit = require('mongoose').model('Audit');
    var acl = require('../lib/auth').acl;
    var reportGenerator = require('../lib/report-generator');
    var _ = require('lodash');
    var utils = require('../lib/utils');
    var Settings = require('mongoose').model('Settings');

    /* ### AUDITS LIST ### */

    // Get audits list of user (all for admin) with regex filter on findings
    app.get("/api/audits", acl.hasPermission('audits:read'), function(req, res) {
        var getUsersRoom = function(room) {
            return utils.getSockets(io, room).map(s => s.username)
        }
        var filters = {};
        if (req.query.findingTitle) 
            filters['findings.title'] = new RegExp(utils.escapeRegex(req.query.findingTitle), 'i')
            
        Audit.getAudits(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.decodedToken.id, filters)
        .then(msg => {
                var result = []
                msg.forEach(audit => {
                    var a = {}
                    a._id = audit._id
                    a.name = audit.name
                    a.language = audit.language
                    a.creator = audit.creator
                    a.collaborators = audit.collaborators
                    a.company = audit.company
                    a.createdAt = audit.createdAt
                    a.reviewers = audit.reviewers
                    a.approvals = audit.approvals
                    a.state = audit.state
                    if (acl.isAllowed(req.decodedToken.role, 'audits:users-connected')){
                        a.connected = getUsersRoom(audit._id.toString())
                    }
                    result.push(a)
                })
            Response.Ok(res, result)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Create audit with name, auditType, language provided
    app.post("/api/audits", acl.hasPermission('audits:create'), function(req, res) {
        if (!req.body.name || !req.body.language || !req.body.auditType) {
            Response.BadParameters(res, 'Missing some required parameters: name, language, auditType');
            return;
        }

        var audit = {};
        // Required params
        audit.name = req.body.name;
        audit.language = req.body.language;
        audit.auditType = req.body.auditType;

        Audit.create(audit, req.decodedToken.id)
        .then(inserted => Response.Created(res, {message: 'Audit created successfully', audit: inserted}))
        .catch(err => Response.Internal(res, err))
    });

    // Delete audit if creator or admin
    app.delete("/api/audits/:auditId", acl.hasPermission('audits:delete'), function(req, res) {
        Audit.delete(acl.isAllowed(req.decodedToken.role, 'audits:delete-all'), req.params.auditId, req.decodedToken.id)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    })

    /* ### AUDITS EDIT ### */

    // Get Audit with ID
    app.get("/api/audits/:auditId", acl.hasPermission('audits:read'), function(req, res) {
        Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Get audit general information
    app.get("/api/audits/:auditId/general", acl.hasPermission('audits:read'), function(req, res) {
        Audit.getGeneral(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update audit general information
    app.put("/api/audits/:auditId/general", acl.hasPermission('audits:update'), async function(req, res) {
        var update = {};
        
        var settings = await Settings.getAll();
        var audit = await Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id);
        if (settings.reviews.enabled && audit.state !== "EDIT") {
            Response.Forbidden(res, "The audit is not in the EDIT state and therefore cannot be edited.");
            return;
        }

        if (req.body.reviewers) {
            if (req.body.reviewers.some(element => !element._id)) {
                Response.BadParameters(res, "One or more reviewer is missing an _id");
                return;
            }

            // Is the new reviewer the creator of the audit? 
            if (req.body.reviewers.some(element => element._id === audit.creator._id)) {
                Response.BadParameters(res, "A user cannot simultaneously be a reviewer and a collaborator/creator");
                return;
            }

            // Is the new reviewer one of the new collaborators that will override current collaborators? 
            if (req.body.collaborators) {
                req.body.reviewers.forEach((reviewer) => {
                    if (req.body.collaborators.some(element => !element._id || element._id === reviewer._id)) {
                        Response.BadParameters(res, "A user cannot simultaneously be a reviewer and a collaborator/creator");
                        return;
                    }
                });
            }

            // If no new collaborators are being set, is the new reviewer one of the current collaborators? 
            else if (audit.collaborators) {
                req.body.reviewers.forEach((reviewer) => {
                    if (audit.collaborators.some(element => element._id === reviewer._id)) {
                        Response.BadParameters(res, "A user cannot simultaneously be a reviewer and a collaborator/creator");
                        return;
                    }
                });
            }
        }

        if (req.body.collaborators) {
            if (req.body.collaborators.some(element => !element._id)) {
                Response.BadParameters(res, "One or more collaborator is missing an _id");
                return;
            }
            
            // Are the new collaborators part of the current reviewers?
            req.body.collaborators.forEach((collaborator) => {
                if (audit.reviewers.some(element => element._id === collaborator._id)) {
                    Response.BadParameters(res, "A user cannot simultaneously be a reviewer and a collaborator/creator");
                    return;
                }
            });

            // If the new collaborator already gave a review, remove said review, accept collaborator
            if (audit.approvals) {
                newApprovals = audit.approvals.filter((approval) => !req.body.collaborators.some((collaborator) => approval.toString() === collaborator._id));
                update.approvals = newApprovals;
            }
        }

        // Optional parameters
        if (req.body.name) update.name = req.body.name;
        if (req.body.location) update.location = req.body.location;
        if (req.body.date) update.date = req.body.date;
        if (req.body.date_start) update.date_start = req.body.date_start;
        if (req.body.date_end) update.date_end = req.body.date_end;
        if (req.body.client !== undefined) update.client = req.body.client
        if (req.body.company !== undefined) {
            update.company = {};
            if (!req.body.company)
                update.company = null
            else if (req.body.company._id)
                update.company._id = req.body.company._id;
            else
                update.company.name = req.body.company
        }
        if (req.body.collaborators) update.collaborators = req.body.collaborators;
        if (req.body.reviewers) update.reviewers = req.body.reviewers;
        if (req.body.language) update.language = req.body.language;
        if (req.body.scope && typeof(req.body.scope === "array")) {
            update.scope = req.body.scope.map(item => {return {name: item}});
        }
        if (req.body.template) update.template = req.body.template;
        if (req.body.customFields) update.customFields = req.body.customFields;
        if (settings.reviews.enabled && settings.reviews.private.removeApprovalsUponUpdate) update.approvals = [];

        Audit.updateGeneral(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, update)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Get audit network information
    app.get("/api/audits/:auditId/network", acl.hasPermission('audits:read'), function(req, res) {
        Audit.getNetwork(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update audit network information
    app.put("/api/audits/:auditId/network", acl.hasPermission('audits:update'), async function(req, res) {
        var settings = await Settings.getAll();

        var audit = await Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id);
        if (settings.reviews.enabled && audit.state !== "EDIT") {
            Response.Forbidden(res, "The audit is not in the EDIT state and therefore cannot be edited.");
            return;
        }

        var update = {};
        // Optional parameters
        if (req.body.scope) update.scope = req.body.scope;
        if (settings.reviews.enabled && settings.reviews.private.removeApprovalsUponUpdate) update.approvals = [];

        Audit.updateNetwork(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, update)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Add finding to audit
    app.post("/api/audits/:auditId/findings", acl.hasPermission('audits:update'), async function(req, res) {
        var settings = await Settings.getAll();
        var audit = await Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id);
        if (settings.reviews.enabled && audit.state !== "EDIT") {
            Response.Forbidden(res, "The audit is not in the EDIT state and therefore cannot be edited.");
            return;
        }
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
        if (req.body.poc) finding.poc = req.body.poc;
        if (req.body.scope) finding.scope = req.body.scope;
        if (req.body.status !== undefined) finding.status = req.body.status;
        if (req.body.category) finding.category = req.body.category
        if (req.body.customFields) finding.customFields = req.body.customFields

        if (settings.reviews.enabled && settings.reviews.private.removeApprovalsUponUpdate) {
            Audit.updateGeneral(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, { approvals: [] });
        }

        Audit.createFinding(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, finding)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Get finding of audit
    app.get("/api/audits/:auditId/findings/:findingId", acl.hasPermission('audits:read'), function(req, res) {
        Audit.getFinding(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id, req.params.findingId)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update finding of audit
    app.put("/api/audits/:auditId/findings/:findingId", acl.hasPermission('audits:update'), async function(req, res) {
        var settings = await Settings.getAll();
        var audit = await Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id);
        if (settings.reviews.enabled && audit.state !== "EDIT") {
            Response.Forbidden(res, "The audit is not in the EDIT state and therefore cannot be edited.");
            return;
        }
        
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
        if (!_.isNil(req.body.poc)) finding.poc = req.body.poc;
        if (!_.isNil(req.body.scope)) finding.scope = req.body.scope;
        if (req.body.status !== undefined) finding.status = req.body.status;
        if (req.body.category) finding.category = req.body.category
        if (req.body.customFields) finding.customFields = req.body.customFields

        if (settings.reviews.enabled && settings.reviews.private.removeApprovalsUponUpdate) {
            Audit.updateGeneral(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, { approvals: [] });
        }

        Audit.updateFinding(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, req.params.findingId, finding)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');            
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Delete finding of audit
    app.delete("/api/audits/:auditId/findings/:findingId", acl.hasPermission('audits:update'), async function(req, res) {
        var settings = await Settings.getAll();
        var audit = await Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id);
        if (settings.reviews.enabled && audit.state !== "EDIT") {
            Response.Forbidden(res, "The audit is not in the EDIT state and therefore cannot be edited.");
            return;
        }
        Audit.deleteFinding(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, req.params.findingId)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');            
            Response.Ok(res, msg);
        })
        .catch(err => Response.Internal(res, err))
    });

    // Get section of audit
    app.get("/api/audits/:auditId/sections/:sectionId", acl.hasPermission('audits:read'), function(req, res) {
        Audit.getSection(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id, req.params.sectionId)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update section of audit
    app.put("/api/audits/:auditId/sections/:sectionId", acl.hasPermission('audits:update'), async function(req, res) {
        var settings = await Settings.getAll();
        var audit = await Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id);
        if (settings.reviews.enabled && audit.state !== "EDIT") {
            Response.Forbidden(res, "The audit is not in the EDIT state and therefore cannot be edited.");
            return;
        }
        if (typeof req.body.customFields === 'undefined') {
            Response.BadParameters(res, 'Missing some required parameters: customFields');
            return;
        }
        var section = {};
        // Mandatory parameters
        section.customFields = req.body.customFields;

        // For retrocompatibility with old section.text usage
        if (req.body.text) section.text = req.body.text; 

        if (settings.reviews.enabled && settings.reviews.private.removeApprovalsUponUpdate) {
            Audit.updateGeneral(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, { approvals: [] });
        }

        Audit.updateSection(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, req.params.sectionId, section)
        .then(msg => {
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Generate Report for specific audit
    app.get("/api/audits/:auditId/generate", acl.hasPermission('audits:read'), function(req, res){
        Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id)
        .then(async audit => {
            var settings = await Settings.getAll();

            if (settings.reviews.enabled && settings.reviews.public.mandatoryReview && audit.state !== 'APPROVED') {
                Response.Forbidden(res, "Audit was not approved therefore cannot be exported.");
                return;
            }

            if (!audit.template)
                throw ({fn: 'BadParameters', message: 'Template not defined'})

            var reportDoc = await reportGenerator.generateDoc(audit);
            Response.SendFile(res, `${audit.name.replace(/[\\\/:*?"<>|]/g, "")}.${audit.template.ext || 'docx'}`, reportDoc);
        })
        .catch(err => {
            if (err.code === "ENOENT")
                Response.BadParameters(res, 'Template File not found')
            else
                Response.Internal(res, err)
        });
    });

    // Update sort options of an audit
    app.put("/api/audits/:auditId/sortfindings", acl.hasPermission('audits:update'), async function(req, res) {
        var settings = await Settings.getAll();
        var audit = await Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id);
        if (settings.reviews.enabled && audit.state !== "EDIT") {
            Response.Forbidden(res, "The audit is not in the EDIT state and therefore cannot be edited.");
            return;
        }
        var update = {};
        // Optional parameters
        if (req.body.sortFindings) update.sortFindings = req.body.sortFindings;
        if (settings.reviews.enabled && settings.reviews.private.removeApprovalsUponUpdate) update.approvals = [];
        
        Audit.updateSortFindings(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, update)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update finding position (oldIndex -> newIndex)
    app.put("/api/audits/:auditId/movefinding", acl.hasPermission('audits:update'), async function(req, res) {
        var settings = await Settings.getAll();
        var audit = await Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id);
        if (settings.reviews.enabled && audit.state !== "EDIT") {
            Response.Forbidden(res, "The audit is not in the EDIT state and therefore cannot be edited.");
            return;
        }
        if (typeof req.body.oldIndex === 'undefined' || typeof req.body.newIndex === 'undefined') {
            Response.BadParameters(res, 'Missing some required parameters: oldIndex, newIndex');
            return;
        }
        
        var move = {};
        // Required parameters
        move.oldIndex = req.body.oldIndex;
        move.newIndex = req.body.newIndex;

        if (settings.reviews.enabled && settings.reviews.private.removeApprovalsUponUpdate) {
            Audit.updateGeneral(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, { approvals: [] });
        }
        
        Audit.moveFindingPosition(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, move)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Give or remove a reviewer's approval to an audit
    app.put("/api/audits/:auditId/toggleApproval", acl.hasPermission('audits:review'), async function(req, res) {
        const settings = await Settings.getAll();

        if (!settings.reviews.enabled) {
            Response.Forbidden(res, "Audit reviews are not enabled.");
            return;
        }

        Audit.findById(req.params.auditId)
        .then(audit => {
            if (audit.state !== "REVIEW" && audit.state !== "APPROVED") {
                Response.Forbidden(res, "The audit is not approvable in the current state.");
                return;
            }

            var hasApprovedBefore = false;
            var newApprovalsArray = [];
            if (audit.approvals) {
                audit.approvals.forEach((approval) => {
                    if (approval._id.toString() === req.decodedToken.id) {
                        hasApprovedBefore = true;
                    } else {
                        newApprovalsArray.push(approval);
                    }
                });
            }

            if (!hasApprovedBefore) {
                newApprovalsArray.push({
                    _id: req.decodedToken.id,
                    role: req.decodedToken.role,
                    username: req.decodedToken.username,
                    firstname: req.decodedToken.firstname,
                    lastname: req.decodedToken.lastname
                });
            }

            var update = { approvals : newApprovalsArray};
            Audit.updateApprovals(acl.isAllowed(req.decodedToken.role, 'audits:review-all'), req.params.auditId, req.decodedToken.id, update)
            .then(() => {
                io.to(req.params.auditId).emit('updateAudit');
                Response.Ok(res, "Approval updated successfully.")
            })
            .catch((err) => {
                Response.Internal(res, err);
            })
        })
        .catch((err) => {
            Response.Internal(res, err);
        })
    });

    // Sets the audit state to EDIT or REVIEW
    app.put("/api/audits/:auditId/updateReadyForReview", acl.hasPermission('audits:update'), async function(req, res) {
        const settings = await Settings.getAll();

        if (!settings.reviews.enabled) {
            Response.Forbidden(res, "Audit reviews are not enabled.");
            return;
        }

        var update = {};
        var audit = await Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id);

        if (audit.state !== "EDIT" && audit.state !== "REVIEW") {
            Response.Forbidden(res, "The audit is not in the proper state for this action.");
            return;
        }

        if (req.body.state != undefined && (req.body.state === "EDIT" || req.body.state === "REVIEW")) update.state = req.body.state;

        if (update.state === "EDIT") {
            var newApprovalsArray = [];
            if (audit.approvals) {
                audit.approvals.forEach((approval) => {
                    if (approval._id.toString() !== req.decodedToken.id) {
                        newApprovalsArray.push(approval);
                    }
                });
                update.approvals = newApprovalsArray;
            }
        }

        Audit.updateGeneral(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id, update)
        .then(msg => {
            io.to(req.params.auditId).emit('updateAudit');
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });
}
