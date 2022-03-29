module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var Company = require('mongoose').model('Company');
    var acl = require('../lib/auth').acl;

    // Get companies list
    app.get("/api/companies", acl.hasPermission('companies:read'), function(req, res) {
        Company.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create company
    app.post("/api/companies", acl.hasPermission('companies:create'), function(req, res) {
        if (!req.body.name) {
            Response.BadParameters(res, 'Required paramters: name');
            return;
        }

        var company = {};
        // Required parameters
        company.name = req.body.name;

        // Optional parameters
        if (req.body.shortName) company.shortName = req.body.shortName;
        if (req.body.logo) company.logo = req.body.logo;

        Company.create(company)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update company
    app.put("/api/companies/:id", acl.hasPermission('companies:update'), function(req, res) {
        var company = {};
        // Optional parameters
        if (req.body.name) company.name = req.body.name;
        if (req.body.shortName) company.shortName = req.body.shortName;
        if (req.body.logo) company.logo = req.body.logo;

        Company.update(req.params.id, company)
        .then(msg => Response.Ok(res, 'Company updated successfully'))
        .catch(err => Response.Internal(res, err))
    });

    // Delete company
    app.delete("/api/companies/:id", acl.hasPermission('companies:delete'), function(req, res) {
        Company.delete(req.params.id)
        .then(msg => Response.Ok(res, 'Company deleted successfully'))
        .catch(err => Response.Internal(res, err))
    });
}