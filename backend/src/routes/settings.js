module.exports = function(app) {

    var Response = require('../lib/httpResponse.js')
    var acl = require('../lib/auth').acl
    var fs = require('fs')

    var defaultSettings = {
        imageBorder: false,
        imageBorderColor: "#000000"
    }

    // Get settings
    app.get("/api/settings", acl.hasPermission('settings:read'), function(req, res) {
        try {
            var settings = JSON.parse(fs.readFileSync(`${__basedir}/lib/app-settings.json`))            
            Object.keys(defaultSettings).forEach(key => {
                if (!(key in settings))
                    settings[key] = defaultSettings[key]
            })
            Response.Ok(res, settings)
        }
        catch(err) {
            Response.Ok(res, defaultSettings)
        }
    })

    app.put("/api/settings", acl.hasPermission('settings:update'), function(req, res) {
        var settings = {}
        Object.keys(defaultSettings).forEach(key => {
            if (key in req.body)
                settings[key] = req.body[key]
            else
                settings[key] = defaultSettings[key]
        })
        var settingsString = JSON.stringify(settings, null, 4)
        try {
            fs.writeFileSync(`${__basedir}/lib/app-settings.json`, settingsString)
            Response.Ok(res, settings)
        }
        catch(err) {
            Response.Internal(res, err)
        }
    })
}