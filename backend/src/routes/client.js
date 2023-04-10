module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var Client = require('mongoose').model('Client');
    var acl = require('../lib/auth').acl;

    // Get clients list
    app.get("/api/clients", acl.hasPermission('clients:read'), function(req, res) {
        Client.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create client
    app.post("/api/clients", acl.hasPermission('clients:create'), function(req, res) {
        if (!req.body.email) {
            Response.BadParameters(res, 'Required parameters: email');
            return;
        }

        var client = {};
        // Required parameters
        client.email = req.body.email;

        // Optional parameters
        if (req.body.lastname) client.lastname = req.body.lastname;
        if (req.body.firstname) client.firstname = req.body.firstname;
        if (req.body.phone) client.phone = req.body.phone;
        if (req.body.cell) client.cell = req.body.cell;
        if (req.body.title) client.title = req.body.title;
        var company = null;
        if (req.body.company && req.body.company.name) company = req.body.company.name;

        Client.create(client, company)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err));
    });

    // Update client
    app.put("/api/clients/:id", acl.hasPermission('clients:update'), function(req, res) {
        var client = {};
        // Optional parameters
        if (req.body.email) client.email = req.body.email;
        client.lastname = req.body.lastname || null;
        client.firstname = req.body.firstname || null;
        client.phone = req.body.phone || null;
        client.cell = req.body.cell || null;
        client.title = req.body.title || null;
        var company = null;
        if (req.body.company && req.body.company.name) company = req.body.company.name;

        Client.update(req.params.id, client, company)
        .then(msg => Response.Ok(res, 'Client updated successfully'))
        .catch(err => Response.Internal(res, err));
    });

    // Delete client
    app.delete("/api/clients/:id", acl.hasPermission('clients:delete'), function(req, res) {
        Client.delete(req.params.id)
        .then(msg => Response.Ok(res, 'Client deleted successfully'))
        .catch(err => Response.Internal(res, err))
    });
}