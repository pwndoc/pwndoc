module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var User = require('mongoose').model('User');
    var auth = require('../lib/auth');

    // Check token validity
    app.get("/api/users/checktoken", auth.hasRole('user'), function(req, res) {
        Response.Ok(res, 'Valid token');
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
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Check if there are any existing users for creating first user
    app.get("/api/users/init", function(req, res) {
        User.getAll()
        .then(msg => Response.Ok(res, msg.length === 0))
        .catch(err => Response.Internal(res, err))
    });

    // Get all users
    app.get("/api/users", auth.hasRole('user'), function(req, res) {
        User.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Get user self
    app.get("/api/users/me", auth.hasRole('user'), function(req, res) {
        User.getByUsername(req.decodedToken.username)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Get user by username
    app.get("/api/users/:username", auth.hasRole('admin'), function(req, res) {
        User.getByUsername(req.params.username)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create user
    app.post("/api/users", auth.hasRole('admin'), function(req, res) {
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
                    .then(msg => Response.Ok(res, msg))
                    .catch(err => Response.Internal(res, err))
                })
                .catch((err) => Response.Internal(res, err))
            else
                Response.Forbidden(res, 'Already Initialized');
        })        
        .catch(err => Response.Internal(res, err))
    });

    // Update my profile
    app.put("/api/users/me", auth.hasRole('user'), function(req, res) {
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
        if (req.body.firstname) user.firstname = req.body.firstname;
        if (req.body.lastname) user.lastname = req.body.lastname;
        if (req.body.newPassword) user.newPassword = req.body.newPassword;

        User.updateProfile(req.decodedToken.username, user)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update any user (admin only)
    app.put("/api/users/:username", auth.hasRole('admin'), function(req, res) {
        if (!req.body.username || !req.body.firstname || !req.body.lastname ||
            !req.body.role) {
            Response.BadParameters(res, 'Missing some required parameters');
            return;
        }

        var user = {};
        // Required params
        user.username = req.body.username;
        user.firstname = req.body.firstname;
        user.lastname = req.body.lastname;
        user.role = req.body.role;

         // Optionals params
         if (req.body.password) user.password = req.body.password;

        User.updateUser(req.params.username, user)
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Delete any user (admin only)
    app.delete("/api/users/:username", auth.hasRole('admin'), function(req, res) {
        User.deleteOne({username: req.params.username})
        .then(msg => {
            if (msg.n === 0)
                throw ({fn: 'NotFound', message: 'User not found'});
            else
                Response.Ok(res, 'User deleted successfully');
        })
        .catch(err => Response.Internal(res, err))
    });

}