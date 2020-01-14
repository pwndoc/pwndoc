// Secret for JWT tokens creation (make it dynamic for production)
var jwtSecret = "ASy4FVjsXNLQl09LbieroWsjO5UXjvX5";
exports.jwtSecret = jwtSecret;

// Check user role to give access regarding the route
function hasRole(role) {
    var Response = require('./httpResponse');
    var jwt = require('jsonwebtoken');

    return function (req, res, next) {
        if (!req.header('Authorization')) {
            Response.Unauthorized(res, 'No Authorization header');
            return;
        }

        var header = req.header('Authorization').split(' ');
        if (header.length !== 2 || header[0] !== 'JWT') {
            Response.Unauthorized(res, 'Bad Authorization type');
            return;
        }

        var token = header[1];
        var roles = {user: 0, admin: 1};
        jwt.verify(token, jwtSecret, function(err, decoded) {
            if (decoded && (roles[decoded.role] >= roles[role])) {
                req.decodedToken = decoded;
                return next();
            }
            else if (err) {
                if (err.name === 'TokenExpiredError')
                    Response.Unauthorized(res, 'Expired token');
                else (err )
                    Response.Unauthorized(res, 'Invalid token');
                return;
            }
            else {
                Response.Forbidden(res, 'Insufiscient privileges');
                return;
            }
        });
    };
};
exports.hasRole = hasRole;