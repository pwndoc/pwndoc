module.exports = function(app) {

    var Response = require('../lib/httpResponse.js')
    var acl = require('../lib/auth').acl
    var Settings = require('mongoose').model('Settings');
    var fs = require('fs');

    app.get("/api/settings", acl.hasPermission('settings:read'), function(req, res) {
        Settings.getSettings()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/settings/public", acl.hasPermission('settings:read-public'), function(req, res) {
        Settings.getSettings()
        .then((msg) => {
            out = {};
            out.enableReviews = msg.enableReviews;
            out.mandatoryReview = msg.mandatoryReview;
            out.minReviewers = msg.minReviewers;
            Response.Ok(res, out);
        })
        .catch(err => Response.Internal(res, err));
    });

    app.put("/api/settings", acl.hasPermission('settings:update'), function(req, res) {
        var settings = {};
        if (req.body.enableReviews !== undefined) settings.enableReviews = req.body.enableReviews;
        if (req.body.mandatoryReview !== undefined) settings.mandatoryReview = req.body.mandatoryReview;
        if (req.body.minReviewers !== undefined && req.body.minReviewers > 0 && req.body.minReviewers < 100) settings.minReviewers = req.body.minReviewers;
        if (req.body.removeApprovalsUponUpdate !== undefined) settings.removeApprovalsUponUpdate = req.body.removeApprovalsUponUpdate;
        if (req.body.imageBorder !== undefined) settings.imageBorder = req.body.imageBorder;
        if (req.body.imageBorderColor !== undefined) settings.imageBorderColor = req.body.imageBorderColor;
        if (req.body.cvssColors !== undefined) {
            var colors = {};
            if(req.body.cvssColors.criticalColor !== undefined) colors.criticalColor = req.body.cvssColors.criticalColor;
            if(req.body.cvssColors.highColor !== undefined) colors.highColor = req.body.cvssColors.highColor;
            if(req.body.cvssColors.mediumColor !== undefined) colors.mediumColor = req.body.cvssColors.mediumColor;
            if(req.body.cvssColors.lowColor !== undefined) colors.lowColor = req.body.cvssColors.lowColor;
            if(req.body.cvssColors.noneColor !== undefined) colors.noneColor = req.body.cvssColors.noneColor;
            settings.cvssColors = colors;
        }
            
        

        Settings.updateOne({}, settings)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });


    app.put("/api/settings/revert", acl.hasPermission('settings:update'), function(req, res) {
        var settings = JSON.parse(fs.readFileSync(`${__basedir}/app-settings.json`));
        Settings.updateOne(settings)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/settings/export", acl.hasPermission("settings:read"), function(req, res) {
        Settings.getSettings()
        .then((settings) => {
            Response.SendFile(res, "app-settings.json", settings);
        })
        .catch((err) => {
            console.log(err);
            Response.Internal(res, err)
        })
    });
}