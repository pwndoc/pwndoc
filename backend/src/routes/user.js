module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var User = require('mongoose').model('User');
    var Role = require('mongoose').model('Role');
    var acl = require('../lib/auth').acl;
    var jwtRefreshSecret = require('../lib/auth').jwtRefreshSecret
    var jwt = require('jsonwebtoken')
    var _ = require('lodash')
    var passwordpolicy = require('../lib/passwordpolicy')
    var mongoose = require('mongoose')

    async function validateAssignableRoles(roles) {
        if (!Array.isArray(roles))
            throw({fn: 'BadParameters', message: 'roles must be an array'})
        const customRoles = await Role.getAll()
        const allowedRoles = new Set(['admin', 'user', ...customRoles.map(role => role.name)])
        const unknown = roles.filter(roleName => !allowedRoles.has(roleName))
        if (unknown.length > 0)
            throw({fn: 'BadParameters', message: `Unknown roles: ${unknown.join(', ')}`})
    }

    async function sanitizeAssignableRoles(roles) {
        const nextRoles = Array.isArray(roles) ? [...new Set(roles)] : ['user']
        await validateAssignableRoles(nextRoles)
        return nextRoles.length > 0 ? nextRoles : ['user']
    }
	
    // Check token validity
    app.get("/api/users/checktoken", acl.hasPermission('validtoken'), function(req, res) {
        Response.Ok(res, req.cookies['token']);
    });

    // Refresh token
    app.get("/api/users/refreshtoken", function(req, res) {
        var userAgent = req.headers['user-agent']
        var token = req.cookies['refreshToken']
        
        User.updateRefreshToken(token, userAgent)
        .then(msg => {
            res.cookie('token', `JWT ${msg.token}`, {sameSite: 'strict', secure: true, httpOnly: true})
            res.cookie('refreshToken', msg.refreshToken, {sameSite: 'strict', secure: true, httpOnly: true, path: '/api/users/refreshtoken'})
            Response.Ok(res, msg)
        })
        .catch(err => {
            if (err.fn === 'Unauthorized') {
                res.clearCookie('token')
                res.clearCookie('refreshToken')
            }
            Response.Internal(res, err)
        })
    });

    // Remove token cookie
    app.delete("/api/users/refreshtoken", function(req, res) {
        var token = req.cookies['refreshToken']
        try {
            var decoded = jwt.verify(token, jwtRefreshSecret)
        }
        catch (err) {
            res.clearCookie('token')
            res.clearCookie('refreshToken')
            if (err.name === 'TokenExpiredError')
                Response.Unauthorized(res, 'Expired refreshToken')
            else
                Response.Unauthorized(res, 'Invalid refreshToken')
            return
        }
        User.removeSession(decoded.userId, decoded.sessionId)
        .then(msg => {
            res.clearCookie('token')
            res.clearCookie('refreshToken')
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Authenticate user -> return JWT token
    app.post("/api/users/token", function(req, res) {
        if (!req.body.password || !req.body.username) {
            Response.BadParameters(res, 'Required parameters: username, password');
            return;
        }

        // Validate types
        if (typeof req.body.password !== "string" || 
            typeof req.body.username !== "string" ||
            (req.body.totpToken && typeof req.body.totpToken !== "string")) {
            Response.BadParameters(res, 'Parameters must be of type String');
            return;
        }

        var user = new User();
        //Required params
        user.username = req.body.username;
        user.password = req.body.password;

        //Optional params
        if (req.body.totpToken) user.totpToken = req.body.totpToken;

        user.getToken(req.headers['user-agent'])
        .then(msg => {
            res.cookie('token', `JWT ${msg.token}`, {sameSite: 'strict', secure: true, httpOnly: true})
            res.cookie('refreshToken', msg.refreshToken, {sameSite: 'strict', secure: true, httpOnly: true, path: '/api/users/refreshtoken'})
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Check if there are any existing users for creating first user
    app.get("/api/users/init", function(req, res) {
        User.getAll()
        .then(msg => Response.Ok(res, msg.length === 0))
        .catch(err => Response.Internal(res, err))
    });

    // Get all users
    app.get("/api/users", acl.hasPermission('users:read'), function(req, res) {
        User.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Get all reviewers
    app.get("/api/users/reviewers", acl.hasPermission('users:read'), function(req, res) {
        User.getAll()
        .then((users) => {
            var reviewers = [];
            users.forEach(user => {
                if (acl.isAllowed(user.roles, 'audits:review') || acl.isAllowed(user.roles, 'audits:review-all')) {
                    reviewers.push(user);
                }
            })
            Response.Ok(res, reviewers);
        })
        .catch(err => Response.Internal(res, err))
    });

    // Get user self
    app.get("/api/users/me", acl.hasPermission('validtoken'), function(req, res) {
        User.getByUsername(req.decodedToken.username)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    //get TOTP Qrcode URL
    app.get("/api/users/totp", acl.hasPermission('validtoken'), function(req, res) {
        User.getTotpQrcode(req.decodedToken.username)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    //setup TOTP
    app.post("/api/users/totp", acl.hasPermission('validtoken'), function(req, res) {
        if (!req.body.totpToken || !req.body.totpSecret) {
            Response.BadParameters(res, 'Missing some required parameters');
            return;
        }

        User.setupTotp(req.body.totpToken, req.body.totpSecret, req.decodedToken.username)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    //cancel TOTP
    app.delete("/api/users/totp", acl.hasPermission('validtoken'), function(req, res) {
        if (!req.body.totpToken) {
            Response.BadParameters(res, 'Missing some required parameters');
            return;
        }

        User.cancelTotp(req.body.totpToken, req.decodedToken.username)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Get user by username
    app.get("/api/users/:username", acl.hasPermission('users:read'), function(req, res) {
        User.getByUsername(req.params.username)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create user
    app.post("/api/users", acl.hasPermission('users:create'), async function(req, res) {
        if (!req.body.username || !req.body.password || !req.body.firstname || !req.body.lastname) {
            Response.BadParameters(res, 'Missing some required parameters');
            return;
        }
        if (passwordpolicy.strongPassword(req.body.password)!==true){
            Response.BadParameters(res, 'Password does not match the password policy');
            return;
        }

        var user = {};
        //Required params
        user.username = req.body.username;
        user.password = req.body.password;
        user.firstname = req.body.firstname;
        user.lastname = req.body.lastname;

        //Optionals params
        user.roles = Array.isArray(req.body.roles) ? req.body.roles : ['user'];
        if (req.body.email) user.email = req.body.email;
        if (req.body.phone) user.phone = req.body.phone;
        if (req.body.jobTitle) user.jobTitle = req.body.jobTitle;

        try {
            user.roles = await sanitizeAssignableRoles(user.roles)
        }
        catch (err) {
            Response.Internal(res, err)
            return
        }

        User.create(user)
        .then(msg => Response.Created(res, 'User created successfully'))
        .catch(err => Response.Internal(res, err));
    });

    // Create First User
    app.post("/api/users/init", function(req, res) {
        if (!req.body.username || !req.body.password || !req.body.firstname || !req.body.lastname) {
            Response.BadParameters(res, 'Missing some required parameters');
            return;
        }
        if (passwordpolicy.strongPassword(req.body.password)!==true){
            Response.BadParameters(res, 'Password does not match the password policy');
            return;
        }
        var user = {};
        //Required params
        user.username = req.body.username;
        user.password = req.body.password;
        user.firstname = req.body.firstname;
        user.lastname = req.body.lastname;
        user.roles = ['admin'];

        User.getAll()
        .then(users => {
            if (users.length === 0)
                User.create(user)
                .then(msg => {
                    var newUser = new User();
                    //Required params
                    newUser.username = req.body.username;
                    newUser.password = req.body.password;

                    newUser.getToken(req.headers['user-agent'])
                    .then(msg => {
                        res.cookie('token', `JWT ${msg.token}`, {sameSite: 'strict', secure: true, httpOnly: true})
                        res.cookie('refreshToken', msg.refreshToken, {sameSite: 'strict', secure: true, httpOnly: true, path: '/api/users/refreshtoken'})
                        Response.Created(res, msg)
                    })
                    .catch(err => Response.Internal(res, err))
                })
                .catch((err) => Response.Internal(res, err))
            else
                Response.Forbidden(res, 'Already Initialized');
        })        
        .catch(err => Response.Internal(res, err));
    });

    // Update my profile
    app.put("/api/users/me", acl.hasPermission('validtoken'), function(req, res) {
        if (!req.body.currentPassword ||
            (req.body.newPassword && !req.body.confirmPassword) ||
            (req.body.confirmPassword && !req.body.newPassword)) {
            Response.BadParameters(res, 'Missing some required parameters');
            return;
        }
        if (req.body.newPassword !== req.body.confirmPassword) {
            Response.BadParameters(res, 'New password validation failed');
            return;
        }
        if (req.body.newPassword && passwordpolicy.strongPassword(req.body.newPassword)!==true){
            Response.BadParameters(res, 'New Password does not match the password policy');
            return;
        }

        var user = {};
        // Required params
        user.password = req.body.currentPassword;

        // Optionals params
        if (req.body.username) user.username = req.body.username;
        if (req.body.newPassword) user.newPassword = req.body.newPassword;
        if (req.body.firstname) user.firstname = req.body.firstname;
        if (req.body.lastname) user.lastname = req.body.lastname;
        if (!_.isNil(req.body.email)) user.email = req.body.email;
        if (!_.isNil(req.body.phone)) user.phone = req.body.phone;
        if (!_.isNil(req.body.jobTitle)) user.jobTitle = req.body.jobTitle;

        User.updateProfile(req.decodedToken.username, user)
        .then(msg => {
            res.cookie('token', msg.token, {sameSite: 'strict', secure: true, httpOnly: true})
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err));
    });

    // Update any user (admin only)
    app.put("/api/users/bulk-roles", acl.hasPermission('users:update'), async function(req, res) {
        if (!Array.isArray(req.body.userIds) || req.body.userIds.some(id => !mongoose.isValidObjectId(id))) {
            Response.BadParameters(res, 'userIds must be an array of valid user ids')
            return
        }
        const add = Array.isArray(req.body.add) ? req.body.add : []
        const remove = Array.isArray(req.body.remove) ? req.body.remove : []
        const overlap = add.filter(roleName => remove.includes(roleName))
        if (overlap.length > 0) {
            Response.BadParameters(res, 'add and remove cannot contain the same role')
            return
        }

        try {
            await validateAssignableRoles(add)
            await validateAssignableRoles(remove)
            if (remove.length > 0)
                await User.updateMany({_id: {$in: req.body.userIds}}, {$pull: {roles: {$in: remove}}})
            if (add.length > 0)
                await User.updateMany({_id: {$in: req.body.userIds}}, {$addToSet: {roles: {$each: add}}})
            await User.updateMany({_id: {$in: req.body.userIds}, roles: {$size: 0}}, {$set: {roles: ['user']}})
            Response.Ok(res, 'Users updated successfully')
        }
        catch (err) {
            Response.Internal(res, err)
        }
    });

    app.put("/api/users/bulk-status", acl.hasPermission('users:update'), async function(req, res) {
        if (!Array.isArray(req.body.userIds) || typeof req.body.enabled !== 'boolean') {
            Response.BadParameters(res, 'Required parameters: userIds, enabled')
            return
        }

        User.updateMany({_id: {$in: req.body.userIds}}, {$set: {enabled: req.body.enabled}})
        .then(() => Response.Ok(res, 'Users updated successfully'))
        .catch(err => Response.Internal(res, err))
    });

    app.put("/api/users/:id", acl.hasPermission('users:update'), async function(req, res) {
        if (req.body.password && !passwordpolicy.strongPassword(req.body.password)){
            Response.BadParameters(res, 'New Password does not match the password policy');
            return;
        }
        var user = {};
    
        // Optionals params
        if (req.body.username) user.username = req.body.username;
        if (req.body.password) user.password = req.body.password;
        if (req.body.firstname) user.firstname = req.body.firstname;
        if (req.body.lastname) user.lastname = req.body.lastname;
        if (!_.isNil(req.body.email)) user.email = req.body.email;
        if (!_.isNil(req.body.phone)) user.phone = req.body.phone;
        if (!_.isNil(req.body.jobTitle)) user.jobTitle = req.body.jobTitle;
        if (typeof(req.body.totpEnabled) === 'boolean') user.totpEnabled = req.body.totpEnabled;
        if (typeof(req.body.enabled) === 'boolean') user.enabled = req.body.enabled;

        try {
            if (Array.isArray(req.body.roles))
                user.roles = await sanitizeAssignableRoles(req.body.roles)
        }
        catch (err) {
            Response.Internal(res, err)
            return
        }

        User.updateUser(req.params.id, user)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err));
    });
}
