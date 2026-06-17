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

const CORE_PERMISSIONS = permissionsCatalog.core()
exports.CORE_PERMISSIONS = CORE_PERMISSIONS

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

    isAllowed(roleNames, permission) {
        return this.normalizeRoleNames(roleNames).some(roleName => this.roleAllows(roleName, permission))
    }

    hasPermission (permission) {
        var Response = require('./httpResponse')
        var jwt = require('jsonwebtoken')

        return (req, res, next) => {
            if (!req.cookies['token']) {
                Response.Unauthorized(res, 'No token provided')
                return;
            }
    
            var cookie = req.cookies['token'].split(' ')
            if (cookie.length !== 2 || cookie[0] !== 'JWT') {
                Response.Unauthorized(res, 'Bad token type')
                return
            }
    
            var token = cookie[1]
            jwt.verify(token, jwtSecret, (err, decoded) => {
                if (err) {
                    if (err.name === 'TokenExpiredError')
                        Response.Unauthorized(res, 'Expired token')
                    else
                        Response.Unauthorized(res, 'Invalid token')
                    return
                }
                
                if ( permission === "validtoken" || this.isAllowed(decoded.roles, permission)) {
                    req.decodedToken = decoded
                    return next()
                }
                else {
                    Response.Forbidden(res, 'Insufficient privileges')
                    return
                }
            })
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
