module.exports = function(app, io) {

    var Response = require('../lib/httpResponse');
    var Observation = require('mongoose').model('Observation');
    var Audit = require('mongoose').model('Audit');
    var acl = require('../lib/auth').acl;

    /* ### OBSERVATIONS ### */

    // Get all observations for an audit
    app.get("/api/audits/:auditId/observations", acl.hasPermission('audits:read'), function(req, res) {
        Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id)
        .then(audit => {
            if (!audit) {
                Response.NotFound(res, 'Audit not found');
                return;
            }

            Observation.getByAudit(req.params.auditId)
            .then(observations => {
                Response.Ok(res, observations);
            })
            .catch(err => Response.Internal(res, err));
        })
        .catch(err => Response.Internal(res, err));
    });

    // Get single observation
    app.get("/api/audits/:auditId/observations/:observationId", acl.hasPermission('audits:read'), function(req, res) {
        Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:read-all'), req.params.auditId, req.decodedToken.id)
        .then(audit => {
            if (!audit) {
                Response.NotFound(res, 'Audit not found');
                return;
            }

            Observation.getById(req.params.observationId)
            .then(observation => {
                if (!observation || observation.auditId.toString() !== req.params.auditId) {
                    Response.NotFound(res, 'Observation not found');
                    return;
                }
                Response.Ok(res, observation);
            })
            .catch(err => Response.Internal(res, err));
        })
        .catch(err => Response.Internal(res, err));
    });

    // Create observation
    app.post("/api/audits/:auditId/observations", acl.hasPermission('audits:update'), function(req, res) {
        Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id)
        .then(audit => {
            if (!audit) {
                Response.NotFound(res, 'Audit not found');
                return;
            }

            // Check if user can edit this audit
            var isAllowed = acl.isAllowed(req.decodedToken.role, 'audits:update-all');
            var isCollaborator = (audit.collaborators || []).some(c => c._id.toString() === req.decodedToken.id);
            var isCreator = audit.creator._id.toString() === req.decodedToken.id;

            if (!isAllowed && !isCollaborator && !isCreator) {
                Response.Forbidden(res, 'Insufficient permissions');
                return;
            }

            Observation.create(req.params.auditId, req.decodedToken.id, req.body)
            .then(observation => {
                // Emit socket event for real-time update
                io.to(req.params.auditId).emit('updateAudit');

                Response.Created(res, observation);
            })
            .catch(err => Response.Internal(res, err));
        })
        .catch(err => Response.Internal(res, err));
    });

    // Update observation
    app.put("/api/audits/:auditId/observations/:observationId", acl.hasPermission('audits:update'), function(req, res) {
        Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id)
        .then(audit => {
            if (!audit) {
                Response.NotFound(res, 'Audit not found');
                return;
            }

            // Check if user can edit this audit
            var isAllowed = acl.isAllowed(req.decodedToken.role, 'audits:update-all');
            var isCollaborator = (audit.collaborators || []).some(c => c._id.toString() === req.decodedToken.id);
            var isCreator = audit.creator._id.toString() === req.decodedToken.id;

            if (!isAllowed && !isCollaborator && !isCreator) {
                Response.Forbidden(res, 'Insufficient permissions');
                return;
            }

            Observation.updateObservation(req.params.observationId, req.decodedToken.id, req.body)
            .then(observation => {
                // Emit socket event for real-time update
                io.to(req.params.auditId).emit('updateAudit');

                Response.Ok(res, observation);
            })
            .catch(err => {
                if (err.fn === 'NotFound') {
                    Response.NotFound(res, err.message);
                } else {
                    Response.Internal(res, err);
                }
            });
        })
        .catch(err => Response.Internal(res, err));
    });

    // Delete observation
    app.delete("/api/audits/:auditId/observations/:observationId", acl.hasPermission('audits:update'), function(req, res) {
        Audit.getAudit(acl.isAllowed(req.decodedToken.role, 'audits:update-all'), req.params.auditId, req.decodedToken.id)
        .then(audit => {
            if (!audit) {
                Response.NotFound(res, 'Audit not found');
                return;
            }

            // Check if user can edit this audit
            var isAllowed = acl.isAllowed(req.decodedToken.role, 'audits:update-all');
            var isCollaborator = (audit.collaborators || []).some(c => c._id.toString() === req.decodedToken.id);
            var isCreator = audit.creator._id.toString() === req.decodedToken.id;

            if (!isAllowed && !isCollaborator && !isCreator) {
                Response.Forbidden(res, 'Insufficient permissions');
                return;
            }

            Observation.deleteObservation(req.params.observationId)
            .then(() => {
                // Emit socket event for real-time update
                io.to(req.params.auditId).emit('updateAudit');

                Response.Ok(res, 'Observation deleted successfully');
            })
            .catch(err => Response.Internal(res, err));
        })
        .catch(err => Response.Internal(res, err));
    });
}
