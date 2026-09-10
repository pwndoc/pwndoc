module.exports = function(app) {
    const Response = require('../lib/httpResponse');
    const acl = require('../lib/auth').acl;
    const ApiKey = require('mongoose').model('ApiKey');

    // Get API keys for current user (or all if admin requested ?all=true)
    app.get("/api/apikeys", acl.hasPermission('validtoken'), function(req, res) {
        const isAdmin = req.decodedToken.roles && req.decodedToken.roles.includes('admin');
        if (req.query.all === 'true' && (isAdmin || acl.isAllowedToken(req.decodedToken, 'users:read'))) {
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
    app.post("/api/apikeys", acl.hasPermission('validtoken'), function(req, res) {
        if (!req.body || !req.body.name || typeof req.body.name !== 'string' || !req.body.name.trim()) {
            Response.BadParameters(res, 'Name is required');
            return;
        }

        ApiKey.generateKey(req.decodedToken.id, {
            name: req.body.name,
            expiresAt: req.body.expiresAt,
            roles: req.body.roles,
            permissions: req.body.permissions
        })
        .then(result => Response.Created(res, result))
        .catch(err => Response.Internal(res, err));
    });

    // Revoke/Delete an API key
    app.delete("/api/apikeys/:id", acl.hasPermission('validtoken'), function(req, res) {
        const isAdmin = req.decodedToken.roles && req.decodedToken.roles.includes('admin');
        ApiKey.revoke(req.params.id, req.decodedToken.id, isAdmin)
        .then(result => Response.Ok(res, result.message))
        .catch(err => Response.Internal(res, err));
    });

    // Toggle enabled status
    app.put("/api/apikeys/:id/toggle", acl.hasPermission('validtoken'), function(req, res) {
        const isAdmin = req.decodedToken.roles && req.decodedToken.roles.includes('admin');
        ApiKey.toggle(req.params.id, req.decodedToken.id, isAdmin)
        .then(result => Response.Ok(res, result))
        .catch(err => Response.Internal(res, err));
    });
};
