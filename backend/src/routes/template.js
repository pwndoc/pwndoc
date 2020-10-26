module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var Template = require('mongoose').model('Template');
    var acl = require('../lib/auth').acl;
    var utils = require('../lib/utils');
    var fs = require('fs');

    // Get templates list
    app.get("/api/templates", acl.hasPermission('templates:read'), function(req, res) {
        Template.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create template
    app.post("/api/templates", acl.hasPermission('templates:create'), function(req, res) {
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

        var filename = req.body.filename;
        template.ext = filename.includes(".") ? filename.split(".").slice(-1)[0] : filename
        
        if (!utils.validFilename(template.ext)) {
            Response.BadParameters(res, 'Bad extension format');
            return;
        }

        Template.create(template)
        .then(data => {
            var fileBuffer = Buffer.from(req.body.file, 'base64');
            fs.writeFileSync(`${__basedir}/../report-templates/${template.name}.${template.ext}`, fileBuffer);
            Response.Created(res, 'Template created successfully');
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update template
    app.put("/api/templates/:templateId", acl.hasPermission('templates:update'), function(req, res) {
        if (req.body.name && !utils.validFilename(req.body.name)) {
            Response.BadParameters(res, 'Bad name format');
            return;
        }

        var template = {};
        // Optional parameters
        if (req.body.name) template.name = req.body.name;
        if (req.body.file){
          var filename = req.body.filename;
          var ext = filename.includes(".") ? filename.split(".").slice(-1)[0] : filename
          template.ext = ext;
        }

        Template.update(req.params.templateId, template)
        .then(data => {
            if (!req.body.name && req.body.file) {
                var filename = req.body.filename;
                var ext = filename.includes(".") ? filename.split(".").slice(-1)[0] : filename
                var fileBuffer = Buffer.from(req.body.file, 'base64');
                try {fs.unlinkSync(`${__basedir}/../report-templates/${data.name}.${data.ext}`)} catch {}
                fs.writeFileSync(`${__basedir}/../report-templates/${data.name}.${ext}`, fileBuffer);
            }
            else if (req.body.name && !req.body.file) {
                fs.renameSync(`${__basedir}/../report-templates/${data.name}.${data.ext}`, `${__basedir}/../report-templates/${req.body.name}.${data.ext}`);
            }
            else if (req.body.name && req.body.file) {
                var filename = req.body.filename;
                var ext = filename.includes(".") ? filename.split(".").slice(-1)[0] : filename
                var fileBuffer = Buffer.from(req.body.file, 'base64');
                try {fs.unlinkSync(`${__basedir}/../report-templates/${data.name}.${data.ext}`)} catch {}
                fs.writeFileSync(`${__basedir}/../report-templates/${req.body.name}.${ext}`, fileBuffer);
            }
            Response.Ok(res, 'Template updated successfully');
        })
        .catch(err => {
            if (err.code && err.code === "ENOENT")
                Response.NotFound(res, 'Template File was not Found');
            else
                Response.Internal(res, err);
        })
    });

    // Delete template
    app.delete("/api/templates/:templateId", acl.hasPermission('templates:delete'), function(req, res) {
        Template.delete(req.params.templateId)
        .then(data => {
            fs.unlinkSync(`${__basedir}/../report-templates/${data.name}.${data.ext}`);
            Response.Ok(res, 'Template deleted successfully');
        })
        .catch(err => {
            if (err.code && err.code === "ENOENT")
                Response.Ok(res, 'Template File not found but deleted successfully in database');
            else
                Response.Internal(res, err)
        
        })
    });

     // Download template file
     app.get("/api/templates/download/:templateId", acl.hasPermission('templates:read'), function(req, res) {
        Template.getOne(req.params.templateId)
        .then(data => {
            var file = `${__basedir}/../report-templates/${data.name}.${data.ext}`
            res.download(file, `${data.name}.${data.ext}`)
        })
        .catch(err => Response.Internal(res, err))
    })
}