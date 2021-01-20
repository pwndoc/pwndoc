// Secret for JWT tokens creation (make it dynamic for production)
var jwtSecret = "ASy4FVjsXNLQl09LbieroWsjO5UXjvX5";
exports.jwtSecret = jwtSecret;

class ACL {
    constructor(roles) {
        if(typeof roles !== 'object') {
            throw new TypeError('Expected an object as input')
        }
        this.roles = roles
    }

    isAdmin(role, permission) {
        return (this.roles[role].admin && 
            (this.roles[role].admin === "*" || this.roles[role].admin.indexOf(permission) !== -1))
    }

    isAllowed(role, permission) {
        // Check if role exists
        if(!this.roles[role]) {
            return false
        }

        let $role = this.roles[role]
        // Check if role is allowed with permission
        if ($role.allows && ($role.allows === "*" || $role.allows.indexOf(permission) !== -1)) {
            return true
        }

        // Check if there is inheritance
        if(!$role.inherits || $role.inherits.length < 1) {
            return false
        }

        // Recursive check childs until true or false
        return $role.inherits.some(role => this.isAllowed(role, permission))
    }

    hasPermission (permission) {
        var Response = require('./httpResponse')
        var jwt = require('jsonwebtoken')

        return (req, res, next) => {
            if (!req.header('Authorization')) {
                Response.Unauthorized(res, 'No Authorization header')
                return;
            }
    
            var header = req.header('Authorization').split(' ')
            if (header.length !== 2 || header[0] !== 'JWT') {
                Response.Unauthorized(res, 'Bad Authorization type')
                return
            }
    
            var token = header[1]
            jwt.verify(token, jwtSecret, (err, decoded) => {
                if (err) {
                    if (err.name === 'TokenExpiredError')
                        Response.Unauthorized(res, 'Expired token')
                    else
                        Response.Unauthorized(res, 'Invalid token')
                    return
                }

                if (this.isAllowed(decoded.role, permission)) {
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
}

/*  allows: can access route | use * for all
    admin: can access all data, not only its own (admin access) | use * for all
    inherits: inherits other users "allows"
*/
var roles = {
    user: {
        allows: [
            // Audits
            'audits:create',
            'audits:read',
            'audits:update',
            'audits:delete',
            // Clients
            'clients:create',
            'clients:read',
            'clients:update',
            'clients:delete',
            // Companies
            'companies:create',
            'companies:read',
            'companies:update',
            'companies:delete',
            // Languages
            'languages:read',
            // Audit Types
            'audit-types:read',
            // Vulnerability Types
            'vulnerability-types:read',
            // Vulnerability Categories
            'vulnerability-categories:read',
            // Sections Data
            'sections:read',
            // Templates
            'templates:read',
            // Users
            'users:read',
            // Vulnerabilities
            'vulnerabilities:read',
            // Custom Fields
            'custom-fields:read'
        ]
    },
    report: {
        allows: [
            
        ],
        admin: [
            // Audits List
            'audits:read',
            'audits:update',
            'audits:delete',
        ],
        inherits: ['user']
    },
    admin: {
        allows: "*",
        admin: "*"
    }
}

exports.acl = new ACL(roles)