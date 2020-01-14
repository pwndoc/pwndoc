module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var Template = require('mongoose').model('Template');
    var auth = require('../lib/auth');

    // Get templates list
    app.get("/api/templates", auth.hasRole('user'), function(req, res) {
        Template.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create template
    app.post("/api/templates", auth.hasRole('admin'), function(req, res) {
        if (!req.body.name || !req.body.file || !req.body.filename) {
            Response.BadParameters(res, 'Missing required parameters');
            return;
        }

        var template = {};
        // Required parameters
        template.name = req.body.name;
        template.filename = req.body.filename;

        Template.create(template)
        .then(msg => {
            var fileBuffer = new Buffer(req.body.file, 'base64');
            require("fs").writeFile(__basedir+'/../report-templates/'+template.filename, fileBuffer, function(err){
                if (err){
                    Response.Internal(res, err);
                }
                else{
                    Response.Created(res, 'Template created successfully');
                }
            });
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update template
    app.put("/api/templates/:templateId", auth.hasRole('admin'), function(req, res) {
        if ((!req.body.filename && req.body.file) || (req.body.filename && !req.body.file)) {
            Response.BadParameters(res, 'Must supply file and filename together');
            return;
        }
        var template = {};
        // Optional parameters
        if (req.body.name) template.name = req.body.name;
        if (req.body.filename) template.filename = req.body.filename;

        Template.update(req.params.templateId, template)
        .then(msg => {
            if (template.filename) {
                var fileBuffer = new Buffer(req.body.file, 'base64');
                require("fs").writeFile(__basedir+'/../report-templates/'+template.filename, fileBuffer, function(err){
                    if (err){
                        Response.Internal(res, err);
                    }
                    else{
                        Response.Created(res, 'Template updated successfully');
                    }
                });
            }
            else
                Response.Created(res, 'Template updated successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

    // Delete template
    app.delete("/api/templates/:templateId", auth.hasRole('admin'), function(req, res) {
        Template.delete(req.params.templateId)
        .then(msg => {
            require("fs").unlinkSync(__basedir+'/../report-templates/'+msg.filename);
            Response.Created(res, 'Template deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });
}