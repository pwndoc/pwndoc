module.exports = function(app) {

    var Response = require('../lib/httpResponse.js')
    var Attachment = require('mongoose').model('Attachment')
    var acl = require('../lib/auth.js').acl

    // Get Attachment
    app.get("/api/audits/:auditId/attachments/:attachmentId", acl.hasPermission('audits:update-all'), function(req, res) {
        if(!req.params.auditId || !req.params.attachmentId) {
            Response.BadParameters(res, 'Missing some required parameters: auditId');
            return;
        }
        Attachment.getOne(req.params.attachmentId)
        .then(data => {
            Response.Ok(res, data)
        })
        .catch(err => {
            Response.Internal(res, err)
        })
    })

    // Delete attachment
    app.delete("/api/audits/:auditId/attachments/:attachmentId", acl.hasPermission('audits:update-all'), function(req, res) {
        if(!req.params.auditId || !req.params.attachmentId) {
            Response.BadParameters(res, 'Missing some required parameters: auditId');
            return;
        }
        Attachment.delete(req.params.attachmentId)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    })
}