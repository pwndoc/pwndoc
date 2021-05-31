module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var Configs = require('mongoose').model('Configs');
    var acl = require('../lib/auth').acl;


    app.get("/api/configs", acl.hasPermission('configs:read'), function(req, res) {
        Configs.findOne()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    app.get("/api/configs/public", acl.hasPermission('configs:read-public'), function(req, res) {
        Configs.findOne()
        .then((msg) => {
            out = {};
            out.mandatoryReview = msg.mandatoryReview;
            out.minReviewers = msg.minReviewers;
            Response.Ok(res, out);
        })
        .catch(err => Response.Internal(res, err));
    });

    app.put("/api/configs", acl.hasPermission('configs:update'), function(req, res) {
        var configs = {};
        if (req.body.mandatoryReview !== undefined) configs.mandatoryReview = req.body.mandatoryReview;
        if (req.body.minReviewers !== undefined && req.body.minReviewers > 0 && req.body.minReviewers < 100) configs.minReviewers = req.body.minReviewers;
        if (req.body.reviewersNeedAssign !== undefined) configs.reviewersNeedAssign = req.body.reviewersNeedAssign;

        Configs.updateOne({}, configs)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });
};