module.exports = function(app) {

    var Response = require('../lib/httpResponse.js')
    var Image = require('mongoose').model('Image')
    var acl = require('../lib/auth').acl

    // Get image
    app.get("/api/images/:imageId", acl.hasPermission('images:read'), function(req, res) {
        Image.getOne(req.params.imageId)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    })

    // Create image
    app.post("/api/images/", acl.hasPermission('images:create'), function(req, res) {
        if (!req.body.value) {
            Response.BadParameters(res, 'Missing required parameters: value')
            return
        }

        var image = {}
        // Required parameters
        image.value = req.body.value

        // Optional parameters
        if (req.body.name) image.name = req.body.name
        if (req.body.auditId) image.auditId = req.body.auditId

        Image.create(image)
        .then(data => Response.Created(res, data))
        .catch(err => Response.Internal(res, err))
    })

    // Delete image
    app.delete("/api/images/:imageId", acl.hasPermission('images:delete'), function(req, res) {
        Image.delete(req.params.imageId)
        .then(data => {
            Response.Ok(res, 'Image deleted successfully')
        })
        .catch(err => {
            Response.Internal(res, err)
        })
    })

    // Download image file
    app.get("/api/images/download/:imageId", acl.hasPermission('images:read'), function(req, res) {
        Image.getOne(req.params.imageId)
        .then(data => {
            var imgBase64 = data.value.split(",")[1]
            var img = Buffer.from(imgBase64, 'base64')
            Response.SendImage(res, img)
        })
        .catch(err =>{
            Response.Internal(res, err)
        })
    })
}