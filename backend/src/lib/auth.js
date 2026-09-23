// Dynamic generation of JWT Secret if not exist (different for each environnment)
var fs = require('fs')
var env = process.env.NODE_ENV || 'dev'
var config = require('../config/config.json')
var permissionsCatalog = require('./permissions-catalog')

if (!config[env].jwtSecret) {
    config[env].jwtSecret = require('crypto').randomBytes(32).toString('hex')
    var configString = JSON.stringify(config, null, 4)
    fs.writeFileSync(`${__basedir}/config/config.json`, configString)
}
if (!config[env].jwtRefreshSecret) {
    config[env].jwtRefreshSecret = require('crypto').randomBytes(32).toString('hex')
    var configString = JSON.stringify(config, null, 4)
    fs.writeFileSync(`${__basedir}/config/config.json`, configString)
}

var jwtSecret = config[env].jwtSecret
exports.jwtSecret = jwtSecret

var jwtRefreshSecret = config[env].jwtRefreshSecret
exports.jwtRefreshSecret = jwtRefreshSecret

/*  ROLES LOGIC

    role_name: {
        allows: [],
        inherits: []
    }
    allows: allowed permissions to access | use * for all
    inherits: inherits other users "allows"
*/

const CORE_PERMISSIONS = permissionsCatalog.core()
exports.CORE_PERMISSIONS = CORE_PERMISSIONS
const SYSTEM_ROLES = ['admin', 'user']

class ACL {
    constructor(roles) {
        if(typeof roles !== 'object') {
            throw new TypeError('Expected an object as input')
        }
        this.roles = roles
    }

    async reload() {
        const Role = require('mongoose').model('Role')
        const dbRoles = await Role.getAll()
        const roles = {
            admin: {allows: '*'},
            user: {allows: CORE_PERMISSIONS}
        }
        dbRoles.forEach(role => {
            if (SYSTEM_ROLES.includes(role.name))
                return
            roles[role.name] = {allows: role.allows || []}
        })
        this.roles = roles
    }

    normalizeRoleNames(roleNames) {
        if (typeof roleNames === 'string')
            roleNames = [roleNames]
        if (!Array.isArray(roleNames))
            roleNames = []
        const known = roleNames.filter(roleName => this.roles[roleName])
        if (known.length === 0)
            return ['user']
        return known
    }

    roleAllows(roleName, permission) {
        const role = this.roles[roleName]
        if (!role || !role.allows)
            return false
        return role.allows === '*' || role.allows.indexOf(permission) !== -1 || role.allows.indexOf(`${permission}-all`) !== -1
    }

    isAllowedPermissions(permissions, permission) {
        if (permissions === '*')
            return true
        if (!Array.isArray(permissions))
            return false
        return permissions.includes(permission) || permissions.includes(`${permission}-all`)
    }

    isAllowed(roleNames, permission) {
        return this.normalizeRoleNames(roleNames).some(roleName => this.roleAllows(roleName, permission))
    }

    isAllowedToken(decoded, permission) {
        return this.isAllowedPermissions(decoded.permissions, permission) ||
            this.isAllowed(decoded.roles, permission)
    }

    hasPermission (permission) {
        var Response = require('./httpResponse')
        var jwt = require('jsonwebtoken')
        var mongoose = require('mongoose')

        return async (req, res, next) => {
            // Check for API Key first (X-API-Key header or Authorization: ApiKey <key> or Bearer pwn_...)
            let apiKeyRaw = req.headers['x-api-key']
            if (!apiKeyRaw && req.headers['authorization']) {
                const parts = req.headers['authorization'].split(' ')
                if (parts.length === 2) {
                    if (parts[0] === 'ApiKey' || (parts[0] === 'Bearer' && parts[1].startsWith('pwn_'))) {
                        apiKeyRaw = parts[1]
                    }
                }
            }

            let authenticated
            if (apiKeyRaw !== undefined) {
                try {
                    const ApiKey = mongoose.model('ApiKey')
                    const result = await ApiKey.validateKey(apiKeyRaw)
                    if (!result || result.error) {
                        Response.Unauthorized(res, result ? result.error : 'Invalid API Key')
                        return
                    }

                    const { apiKey, user } = result
                    const userRoles = Array.isArray(user.roles) ? user.roles : []
                    const effectiveRoles = (apiKey.roles || []).filter(role =>
                        userRoles.includes(role) && Object.hasOwn(this.roles, role))
                    if (effectiveRoles.length === 0)
                        return Response.Unauthorized(res, 'API Key has no active roles')
                    const effectivePermissions = this.getRoles(effectiveRoles)

                    const decoded = {
                        id: user._id.toString(),
                        username: user.username,
                        firstname: user.firstname,
                        lastname: user.lastname,
                        roles: effectiveRoles,
                        permissions: effectivePermissions,
                        apiKey: {
                            _id: apiKey._id,
                            name: apiKey.name
                        }
                    }

                    authenticated = decoded
                } catch (err) {
                    Response.Internal(res, err)
                    return
                }
            } else {
                if (!req.cookies['token']) {
                    Response.Unauthorized(res, 'No token provided')
                    return
                }
                const cookie = req.cookies['token'].split(' ')
                if (cookie.length !== 2 || cookie[0] !== 'JWT') {
                    Response.Unauthorized(res, 'Bad token type')
                    return
                }
                try {
                    const decoded = jwt.verify(cookie[1], jwtSecret)
                    // Reject legacy tokens whose roles contain permissions rather than role names.
                    if (decoded.permissions === undefined)
                        return Response.Unauthorized(res, 'Invalid token')
                    authenticated = decoded
                } catch (err) {
                    return Response.Unauthorized(res, err.name === 'TokenExpiredError' ? 'Expired token' : 'Invalid token')
                }
            }
            // Both authentication methods must pass the same authorization gate.
            if (!authenticated)
                return Response.Unauthorized(res, 'Invalid credentials')
            if (permission !== 'validtoken' && !this.isAllowedToken(authenticated, permission))
                return Response.Forbidden(res, 'Insufficient privileges')
            req.decodedToken = authenticated
            return next()
        }
    }

    getRoles(roleNames) {
        const normalizedRoleNames = this.normalizeRoleNames(roleNames)
        if (normalizedRoleNames.includes('admin'))
            return '*'

        let result = []
        normalizedRoleNames.forEach(roleName => {
            const role = this.roles[roleName]
            if (role && Array.isArray(role.allows))
                result = [...new Set([...result, ...role.allows])]
        })
        
        return result
    }
}

exports.acl = new ACL({
    admin: {allows: '*'},
    user: {allows: CORE_PERMISSIONS}
})
