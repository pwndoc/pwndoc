module.exports = function(app) {
    const Response = require('../lib/httpResponse');
    const acl = require('../lib/auth').acl;
    const ApiKey = require('mongoose').model('ApiKey');

    // Listing other owners' keys requires the explicit read-all permission.
    app.get("/api/apikeys", acl.hasPermission('apikeys:read'), function(req, res) {
        if (req.query.all === 'true' && !acl.isAllowedToken(req.decodedToken, 'apikeys:read-all'))
            return Response.Forbidden(res, 'Insufficient privileges');
        if (req.query.all === 'true') {
            ApiKey.getAll()
            .then(keys => Response.Ok(res, keys))
            .catch(err => Response.Internal(res, err));
        } else {
            ApiKey.getByUser(req.decodedToken.id)
            .then(keys => Response.Ok(res, keys))
            .catch(err => Response.Internal(res, err));
        }
    });

    // Create a new API key
    app.post("/api/apikeys", acl.hasPermission('apikeys:create'), function(req, res) {
        if (req.decodedToken.apiKey)
            return Response.Forbidden(res, 'API keys cannot create API keys');
        if (req.body && req.body.permissions !== undefined)
            return Response.BadParameters(res, 'API keys support roles only');
        if (!req.body || !req.body.name || typeof req.body.name !== 'string' || !req.body.name.trim()) {
            Response.BadParameters(res, 'Name is required');
            return;
        }

        ApiKey.generateKey(req.decodedToken.id, {
            name: req.body.name,
            expiresAt: req.body.expiresAt,
            roles: req.body.roles
        })
        .then(result => Response.Created(res, result))
        .catch(err => Response.Internal(res, err));
    });

    // Revoke/Delete an API key
    app.delete("/api/apikeys/:id", acl.hasPermission('apikeys:delete'), function(req, res) {
        ApiKey.revoke(req.params.id, req.decodedToken.id, acl.isAllowedToken(req.decodedToken, 'apikeys:delete-all'))
        .then(result => Response.Ok(res, result.message))
        .catch(err => Response.Internal(res, err));
    });

    // Toggle enabled status
    app.put("/api/apikeys/:id/toggle", acl.hasPermission('apikeys:update'), function(req, res) {
        ApiKey.toggle(req.params.id, req.decodedToken.id, acl.isAllowedToken(req.decodedToken, 'apikeys:update-all'))
        .then(result => Response.Ok(res, result))
        .catch(err => Response.Internal(res, err));
    });
};
