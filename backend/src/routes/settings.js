module.exports = function(app) {
    var Response = require('../lib/httpResponse.js');
    var acl = require('../lib/auth').acl;
    var Settings = require('mongoose').model('Settings');
    var { invalidateLanguageToolConfigCache } = require('../lib/languagetool-config');
    var { testLanguageToolConnection } = require('../lib/languagetool-test');

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

    app.put("/api/settings", acl.hasPermission('settings:update'), async function(req, res) {
        const spellcheckEnabled = req.body?.report?.public?.enableSpellCheck;
        const ltUrl = req.body?.report?.private?.languageToolUrl;

        if (spellcheckEnabled) {
            // Only validate and save LT fields when spellcheck is being enabled
            if (ltUrl) {
                const result = await testLanguageToolConnection(ltUrl);
                if (result.error) return Response.BadParameters(res, result.error);
                if (!result.isLanguageTool) return Response.BadParameters(res, 'languageToolUrl is not a valid LanguageTool endpoint');
            }
        } else if (req.body?.report?.private) {
            // Spellcheck disabled: restore existing LT values from DB so they are not overwritten
            const existing = await Settings.getAll();
            const existingPrivate = existing?.report?.private;
            if (existingPrivate) {
                req.body.report.private.languageToolUrl = existingPrivate.languageToolUrl ?? '';
                req.body.report.private.languageToolApiKey = existingPrivate.languageToolApiKey ?? '';
                req.body.report.private.languageToolUsername = existingPrivate.languageToolUsername ?? '';
            }
        }

        Settings.update(req.body)
        .then(msg => {
            invalidateLanguageToolConfigCache();
            Response.Ok(res, msg);
        })
        .catch(err => Response.Internal(res, err));
    });

    app.put("/api/settings/revert", acl.hasPermission('settings:update'), function(req, res) {
        Settings.restoreDefaults()
        .then(msg => {
            invalidateLanguageToolConfigCache();
            Response.Ok(res, msg);
        })
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/settings/export", acl.hasPermission("settings:read"), function(req, res) {
        Settings.getAll()
        .then(settings => Response.SendFile(res, "app-settings.json", settings))
        .catch(err => Response.Internal(res, err))
    });
}
