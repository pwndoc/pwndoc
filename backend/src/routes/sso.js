module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var isSSO = require('../models/user.js').isSSO;
    var passport = require('passport');
    var User = require('mongoose').model('User');
    var jwt = require('jsonwebtoken')
    var jwtRefreshSecret = require('../lib/auth').jwtRefreshSecret
    var env = process.env.NODE_ENV || 'dev'

    if (isSSO) {
        // SSO route. If the user is logged with SSO, then generate a pwndoc JWT for the user
        app.get('/api/sso', passport.authenticate('openidconnect', { failureRedirect: '/api/sso/fail' }),
            function (req, res) {
                // If the user is authenticated with sso, do this
                var user = new User();
                var userAgent = req.headers['user-agent'];
                // Generate a token on Pwndoc with the user with the username as the SSO username
                user.getToken(req.session.passport.user, userAgent)
                    .then(msg => {
                        res.cookie('token', `JWT ${msg.token}`, { secure: true, httpOnly: true })
                        res.cookie('refreshToken', msg.refreshToken, { secure: true, httpOnly: true, path: '/api/users/refreshtoken' })
                        //Redirect the user to /audits page
                        res.redirect("/audits");
                    })
                    .catch(err => Response.Internal(res, err));
            });

        app.get("/api/sso/fail", function(req, res) {
            res.clearCookie('connect.sid');
            Response.Unauthorized(res, 'Unauthorized user');
        });

        app.post("/api/users/refreshtoken", function(req, res) {
            var token = req.cookies['refreshToken']
            try {
                var decoded = jwt.verify(token, jwtRefreshSecret)
            }
            catch (err) {
                res.clearCookie('token')
                res.clearCookie('refreshToken')
                res.clearCookie('connect.sid')
                if (err.name === 'TokenExpiredError')
                    Response.Unauthorized(res, 'Expired refreshToken')
                else
                    Response.Unauthorized(res, 'Invalid refreshToken')
                return
            }
            User.removeSession(decoded.userId, decoded.sessionId)
            .then(msg => {
                    req.logout(function(err) {
                        console.log(err)    
                    });
                    res.clearCookie('token');
                    res.clearCookie('refreshToken');
                    res.clearCookie('connect.sid')
                    Response.Ok(res, msg)
                  }) 
            .catch(err => Response.Internal(res, err))
        });
    }
}
