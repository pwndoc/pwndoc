module.exports = function(app) {
    var Response = require('../lib/httpResponse.js');
    var Role = require('mongoose').model('Role');
    var acl = require('../lib/auth').acl;
    var auth = require('../lib/auth');
    var permissionsCatalog = require('../lib/permissions-catalog');

    const SYSTEM_ROLES = ['admin', 'user']
    const NAME_PATTERN = /^[a-zA-Z0-9_-]+$/
    const VALID_PERMISSIONS = new Set(permissionsCatalog.flatten())

    function systemRows() {
        return [
            {name: 'admin', displayName: 'Admin', allows: '*', virtual: true},
            {name: 'user', displayName: 'User', allows: auth.CORE_PERMISSIONS, virtual: true}
        ]
    }

    function validateName(res, name) {
        if (!name || typeof name !== 'string' || !NAME_PATTERN.test(name)) {
            Response.BadParameters(res, 'Role name must match /^[a-zA-Z0-9_-]+$/')
            return false
        }
        return true
    }

    function validateMutableRole(res, name) {
        if (!validateName(res, name))
            return false
        if (SYSTEM_ROLES.includes(name)) {
            Response.Forbidden(res, 'System roles cannot be modified')
            return false
        }
        return true
    }

    function validateDisplayName(res, displayName) {
        if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
            Response.BadParameters(res, 'Role display name is required')
            return false
        }
        if (systemRows().some(role => role.displayName.toLowerCase() === displayName.trim().toLowerCase())) {
            Response.BadParameters(res, 'Role display name already exists')
            return false
        }
        return true
    }

    function validateAllows(res, allows) {
        if (!Array.isArray(allows)) {
            Response.BadParameters(res, 'allows must be an array')
            return false
        }
        const invalidPermission = allows.find(permission => permission === '*' || !VALID_PERMISSIONS.has(permission))
        if (invalidPermission) {
            Response.BadParameters(res, `Invalid permission: ${invalidPermission}`)
            return false
        }
        return true
    }

    app.get("/api/data/roles", acl.hasPermission('roles:read'), function(req, res) {
        Role.getAll()
        .then(roles => Response.Ok(res, [...systemRows(), ...roles]))
        .catch(err => Response.Internal(res, err))
    })

    app.get("/api/data/roles/permissions", acl.hasPermission('roles:read'), function(req, res) {
        Response.Ok(res, permissionsCatalog.catalog)
    })

    app.get("/api/data/roles/:name/users-count", acl.hasPermission('roles:read'), function(req, res) {
        Role.countUsers(req.params.name)
        .then(count => Response.Ok(res, {count: count}))
        .catch(err => Response.Internal(res, err))
    })

    app.post("/api/data/roles", acl.hasPermission('roles:create'), function(req, res) {
        const allows = req.body.allows || []
        if (!validateMutableRole(res, req.body.name) || !validateDisplayName(res, req.body.displayName) || !validateAllows(res, allows))
            return

        Role.create({
            name: req.body.name,
            displayName: req.body.displayName,
            description: req.body.description,
            allows: allows
        })
        .then(async role => {
            await acl.reload()
            Response.Created(res, role)
        })
        .catch(err => Response.Internal(res, err))
    })

    app.put("/api/data/roles/:name", acl.hasPermission('roles:update'), function(req, res) {
        const allows = req.body.allows || []
        const newName = req.body.name || req.params.name
        if (!validateMutableRole(res, req.params.name) || !validateMutableRole(res, newName) || !validateDisplayName(res, req.body.displayName) || !validateAllows(res, allows))
            return

        Role.update(req.params.name, {
            name: newName,
            displayName: req.body.displayName,
            description: req.body.description,
            allows: allows
        })
        .then(async msg => {
            await acl.reload()
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    })

    app.delete("/api/data/roles/:name", acl.hasPermission('roles:delete'), function(req, res) {
        if (!validateMutableRole(res, req.params.name))
            return

        Role.delete(req.params.name)
        .then(async msg => {
            await acl.reload()
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    })
}
