module.exports = function(app) {
    var Response = require('../lib/httpResponse.js');
    var acl = require('../lib/auth').acl;
    var Settings = require('mongoose').model('Settings');
    var Audit = require('mongoose').model('Audit');
    
    app.get("/api/settings", acl.hasPermission('settings:read'), function(req, res) {
        Settings.getAll()
        .then(settings => Response.Ok(res, settings))
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/settings/public", acl.hasPermission('settings:read-public'), function(req, res) {
        Settings.getPublic()
        .then(settings => Response.Ok(res, settings))
        .catch(err => Response.Internal(res, err));
    });

    app.put("/api/settings", acl.hasPermission('settings:update'), function(req, res) {
        Settings.update(req.body)
        .then(settings => {
            Audit.collection.getIndexes().then(indexes => {
                if (Object.keys(indexes).length > 0 && indexes['createdAt_1'] !== undefined) {
                    Audit.collection.dropIndex({ "createdAt": 1 });
                }
                
                if (settings.report.private.defaultDataRetentionDays > 0) {
                    Audit.collection.createIndex({ "createdAt": 1 }, { expireAfterSeconds: settings.report.private.defaultDataRetentionDays * 86400 });
                }
            })
        })
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    app.put("/api/settings/revert", acl.hasPermission('settings:update'), function(req, res) {
        Settings.restoreDefaults()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/settings/export", acl.hasPermission("settings:read"), function(req, res) {
        Settings.getAll()
        .then(settings => Response.SendFile(res, "app-settings.json", settings))
        .catch(err => Response.Internal(res, err))
    });
}
