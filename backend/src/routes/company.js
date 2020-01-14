module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var Company = require('mongoose').model('Company');
    var auth = require('../lib/auth');

    // Get companies list
    app.get("/api/companies", auth.hasRole('user'), function(req, res) {
        Company.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create company
    app.post("/api/companies", auth.hasRole('user'), function(req, res) {
        if (!req.body.name) {
            Response.BadParameters(res, 'Required paramters: name');
            return;
        }

        var company = {};
        // Required parameters
        company.name = req.body.name;

        // Optional parameters
        if (req.body.logo) company.logo = req.body.logo;

        Company.create(company)
        .then(msg => Response.Created(res, 'Company created successfully'))
        .catch(err => Response.Internal(res, err))
    });

    // Update company
    app.put("/api/companies/:name", auth.hasRole('user'), function(req, res) {
        var company = {};
        // Optional parameters
        if (req.body.name) company.name = req.body.name;
        if (req.body.logo) company.logo = req.body.logo;

        Company.update(req.params.name, company)
        .then(msg => Response.Created(res, 'Company updated successfully'))
        .catch(err => Response.Internal(res, err))
    });

    // Delete company
    app.delete("/api/companies/:name", auth.hasRole('user'), function(req, res) {
        Company.delete(req.params.name)
        .then(msg => Response.Created(res, 'Company deleted successfully'))
        .catch(err => Response.Internal(res, err))
    });
}