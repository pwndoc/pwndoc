module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var User = require('mongoose').model('User');
    var acl = require('../lib/auth').acl;
    var utils = require('../lib/utils')

    // Check token validity
    app.get("/api/users/checktoken", acl.hasPermission('validtoken'), function(req, res) {
        Response.Ok(res, req.cookies['token']);
    });

    // Remove token cookie
    app.get("/api/users/destroytoken", acl.hasPermission('validtoken'), function(req, res) {
        res.clearCookie('token')
        Response.Ok(res, 'Removed token');
    });

    // Authenticate user -> return JWT token
    app.post("/api/users/token", function(req, res) {
        if (!req.body.password || !req.body.username) {
            Response.BadParameters(res, 'Required parameters: username, password');
            return;
        }
        var user = new User();
        //Required params
        user.username = req.body.username;
        user.password = req.body.password;

        user.getToken()
        .then(msg => {
            res.cookie('token', msg.token, {secure: true, httpOnly: true})
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

    // Get user self
    app.get("/api/users/me", acl.hasPermission('validtoken'), function(req, res) {
        User.getByUsername(req.decodedToken.username)
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
    app.post("/api/users", acl.hasPermission('users:create'), function(req, res) {
        if (!req.body.username || !req.body.password || !req.body.firstname || !req.body.lastname) {
            Response.BadParameters(res, 'Missing some required parameters');
            return;
        }

        var user = {};
        //Required params
        user.username = req.body.username;
        user.password = req.body.password;
        user.firstname = req.body.firstname;
        user.lastname = req.body.lastname;

        //Optionals params
        user.role = req.body.role || 'user';

        User.create(user)
        .then(msg => Response.Created(res, 'User created successfully'))
        .catch(err => Response.Internal(res, err))
    });

    // Create First User
    app.post("/api/users/init", function(req, res) {
        if (!req.body.username || !req.body.password || !req.body.firstname || !req.body.lastname) {
            Response.BadParameters(res, 'Missing some required parameters');
            return;
        }

        var user = {};
        //Required params
        user.username = req.body.username;
        user.password = req.body.password;
        user.firstname = req.body.firstname;
        user.lastname = req.body.lastname;
        user.role = 'admin';

        User.getAll()
        .then(users => {
            if (users.length === 0)
                User.create(user)
                .then(msg => {
                    var newUser = new User();
                    //Required params
                    newUser.username = req.body.username;
                    newUser.password = req.body.password;

                    newUser.getToken()
                    .then(msg => {
                        res.cookie('token', msg.token, {secure: true, httpOnly: true})
                        Response.Created(res, msg)
                    })
                    .catch(err => Response.Internal(res, err))
                })
                .catch((err) => Response.Internal(res, err))
            else
                Response.Forbidden(res, 'Already Initialized');
        })        
        .catch(err => Response.Internal(res, err))
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

        var user = {};
        // Required params
        user.password = req.body.currentPassword;

        // Optionals params
        if (req.body.username) user.username = req.body.username;
        if (req.body.newPassword) user.newPassword = req.body.newPassword;
        if (req.body.firstname) user.firstname = req.body.firstname;
        if (req.body.lastname) user.lastname = req.body.lastname;

        User.updateProfile(req.decodedToken.username, user)
        .then(msg => {
            res.cookie('token', msg.token, {secure: true, httpOnly: true})
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update any user (admin only)
    app.put("/api/users/:id", acl.hasPermission('users:update'), function(req, res) {
        var user = {};
    
        // Optionals params
        if (req.body.username) user.username = req.body.username;
        if (req.body.password) user.password = req.body.password;
        if (req.body.firstname) user.firstname = req.body.firstname;
        if (req.body.lastname) user.lastname = req.body.lastname;
        if (req.body.role) user.role = req.body.role;

        User.updateUser(req.params.id, user)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Delete any user (admin only)
    app.delete("/api/users/:id", acl.hasPermission('users:delete'), function(req, res) {
        User.deleteOne({_id: req.params.id})
        .then(msg => {
            if (msg.n === 0)
                throw ({fn: 'NotFound', message: 'User not found'});
            else
                Response.Ok(res, 'User deleted successfully');
        })
        .catch(err => Response.Internal(res, err))
    });

}