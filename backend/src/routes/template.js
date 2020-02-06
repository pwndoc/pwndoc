module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var Template = require('mongoose').model('Template');
    var auth = require('../lib/auth');
    var utils = require('../lib/utils');
    var fs = require('fs');

    // Get templates list
    app.get("/api/templates", auth.hasRole('user'), function(req, res) {
        Template.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create template
    app.post("/api/templates", auth.hasRole('admin'), function(req, res) {
        if (!req.body.name || !req.body.file) {
            Response.BadParameters(res, 'Missing required parameters');
            return;
        }

        if (!utils.validFilename(req.body.name)) {
            Response.BadParameters(res, 'Bad name format');
            return;
        }

        var template = {};
        // Required parameters
        template.name = req.body.name;

        Template.create(template)
        .then(data => {
            var fileBuffer = Buffer.from(req.body.file, 'base64');
            fs.writeFileSync(`${__basedir}/../report-templates/${template.name}.docx`, fileBuffer);
            Response.Created(res, 'Template created successfully');
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update template
    app.put("/api/templates/:templateId", auth.hasRole('admin'), function(req, res) {
        if (req.body.name && !utils.validFilename(req.body.name)) {
            Response.BadParameters(res, 'Bad name format');
            return;
        }

        var template = {};
        // Optional parameters
        if (req.body.name) template.name = req.body.name;

        Template.update(req.params.templateId, template)
        .then(data => {
            if (!req.body.name && req.body.file) {
                var fileBuffer = Buffer.from(req.body.file, 'base64');
                fs.writeFileSync(`${__basedir}/../report-templates/${data.name}.docx`, fileBuffer);
            }
            else if (req.body.name && !req.body.file) {
                fs.renameSync(`${__basedir}/../report-templates/${data.name}.docx`, `${__basedir}/../report-templates/${req.body.name}.docx`);
            }
            else if (req.body.name && req.body.file) {
                var fileBuffer = Buffer.from(req.body.file, 'base64');
                fs.unlinkSync(`${__basedir}/../report-templates/${data.name}.docx`);
                fs.writeFileSync(`${__basedir}/../report-templates/${req.body.name}.docx`, fileBuffer);
            }
            Response.Created(res, 'Template updated successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

    // Delete template
    app.delete("/api/templates/:templateId", auth.hasRole('admin'), function(req, res) {
        Template.delete(req.params.templateId)
        .then(data => {
            fs.unlinkSync(`${__basedir}/../report-templates/${data.name}.docx`);
            Response.Created(res, 'Template deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });
}