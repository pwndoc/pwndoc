var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

var auth = require('../lib/auth.js');
const { generateUUID } = require('../lib/utils.js');

var UserSchema = new Schema({
    username:       {type: String, unique: true, required: true},
    password:       {type: String, required: true},
    firstname:      {type: String, required: true},
    lastname:       {type: String, required: true},
    role:           {type: String, default: 'user'},
    refreshTokens:  [{_id: false, sessionId: String, userAgent: String, token: String}]
}, {timestamps: true});

/*
*** Statics ***
*/

// Create user
UserSchema.statics.create = function (user) {
    return new Promise((resolve, reject) => {
        var hash = bcrypt.hashSync(user.password, 10);
        user.password = hash;
        new User(user).save()
        .then(function() {
            resolve();
        })
        .catch(function(err) {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Username already exists'});
            else
                reject(err);
        })
    })
}

// Get all users
UserSchema.statics.getAll = function () {
    return new Promise((resolve, reject) => {
        var query = this.find();
        query.select('username firstname lastname role');
        query.exec()
        .then(function(rows) {
            resolve(rows);
        })
        .catch(function(err) {
            reject(err);
        })
    });
}

// Get one user by its username
UserSchema.statics.getByUsername = function (username) {
    return new Promise((resolve, reject) => {
        var query = this.findOne({username: username})
        query.select('username firstname lastname role');
        query.exec()
        .then(function(row) {
            if (row)
                resolve(row);
            else
                throw({fn: 'NotFound', message: 'User not found'});
        })
        .catch(function(err) {
            reject(err);
        })
    });
}

// Update user with password verification (for updating my profile)
UserSchema.statics.updateProfile = function (username, user) {
    return new Promise((resolve, reject) => {
        var query = this.findOne({username: username});
        var payload = {};
        query.exec()
        .then(function(row) {
            if (!row)
                throw({fn: 'NotFound', message: 'User not found'});
            else if (bcrypt.compareSync(user.password, row.password)) {
                if (user.username) row.username = user.username;
                if (user.firstname) row.firstname = user.firstname;
                if (user.lastname) row.lastname = user.lastname;
                if (user.newPassword) row.password = bcrypt.hashSync(user.newPassword, 10);

                payload.id = row._id;
                payload.username = row.username;
                payload.role = row.role;
                payload.firstname = row.firstname;
                payload.lastname = row.lastname;
                payload.roles = auth.acl.getRoles(payload.role)

                return row.save();
            }
            else
                throw({fn: 'Unauthorized', message: 'Current password is invalid'});
        })
        .then(function() {
            var token = jwt.sign(payload, auth.jwtSecret, {expiresIn: '24h'});
            resolve({token: `JWT ${token}`});
        })
        .catch(function(err) {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Username already exists'});
            else
                reject(err);
        })
    })

}

// Update user (for admin usage)
UserSchema.statics.updateUser = function (userId, user) {
    return new Promise((resolve, reject) => {
        if (user.password) user.password = bcrypt.hashSync(user.password, 10);
        var query = this.findOneAndUpdate({_id: userId}, user);
        query.exec()
        .then(function(row) {
            if (row)
                resolve('User updated successfully')
            else
                reject({fn: 'NotFound', message: 'User not found'});
        })
        .catch(function(err) {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Username already exists'});
            else
                reject(err);
        })
    })
}

// Update refreshtoken
UserSchema.statics.updateRefreshToken = function (refreshToken, userAgent) {
    return new Promise((resolve, reject) => {
        var token = ""
        var newRefreshToken = ""
        try {
            var decoded = jwt.verify(refreshToken, auth.jwtRefreshSecret)
            var username = decoded.username
            var sessionId = decoded.sessionId
            var expiration = decoded.exp
        }
        catch (err) {
            if (err.name === 'TokenExpiredError')
                throw({fn: 'Unauthorized', message: 'Expired refreshToken'})
            else
                throw({fn: 'Unauthorized', message: 'Invalid refreshToken'})
        }
        var query = this.findOne({username: username})
        query.exec()
        .then(row => {
            if (row) {
                // Check session exist and sessionId not null (if null then it is a login)
                if (sessionId !== null) {
                    var sessionExist = row.refreshTokens.findIndex(e => e.sessionId === sessionId && e.token === refreshToken)
                    if (sessionExist === -1) // Not found
                        throw({fn: 'Unauthorized', message: 'Session not found'})
                }

                // Generate new token
                var payload = {}
                payload.id = row._id
                payload.username = row.username
                payload.role = row.role
                payload.firstname = row.firstname
                payload.lastname = row.lastname
                payload.roles = auth.acl.getRoles(payload.role)

                token = jwt.sign(payload, auth.jwtSecret, {expiresIn: '15 minutes'})

                // Remove expired sessions
                row.refreshTokens = row.refreshTokens.filter(e => {
                    try {
                        var decoded = jwt.verify(e.token, auth.jwtRefreshSecret)
                    }
                    catch (err) {
                        var decoded = null
                    }
                    return decoded !== null
                })
                // Update or add new refresh token
                var foundIndex = row.refreshTokens.findIndex(e => e.sessionId === sessionId)
                if (foundIndex === -1) { // Not found
                    sessionId = generateUUID()
                    newRefreshToken = jwt.sign({sessionId: sessionId, username: username}, auth.jwtRefreshSecret, {expiresIn: '7 days'})
                    row.refreshTokens.push({sessionId: sessionId, userAgent: userAgent, token:newRefreshToken})
                 }
                else {
                    newRefreshToken = jwt.sign({sessionId: sessionId, username: username, exp: expiration}, auth.jwtRefreshSecret)
                    row.refreshTokens[foundIndex].token = newRefreshToken
                }
                return row.save()
            }
            else
                reject({fn: 'NotFound', message: 'User not found'})
        })
        .then(() => {
            resolve({token: token, refreshToken: newRefreshToken})
        })
        .catch(err => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Username already exists'})
            else
                reject(err)
        })
    })
}

// Remove session
UserSchema.statics.removeSession = function (username, sessionId) {
    return new Promise((resolve, reject) => {
        var query = this.findOne({username: username})
        query.exec()
        .then(row => {
            if (row) {
                row.refreshTokens = row.refreshTokens.filter(e => e.sessionId !== sessionId)
                return row.save()
            }
            else
                reject({fn: 'NotFound', message: 'User not found'})
        })
        .then(() => {
            resolve('Session removed successfully')
        })
        .catch(err => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Username already exists'})
            else
                reject(err)
        })
    })
}


/*
*** Methods ***
*/

// Authenticate user with username and password, return JWT token
UserSchema.methods.getToken = function (userAgent) {
    return new Promise((resolve, reject) => {
        var user = this;
        var token = ""
        var query = User.findOne({username: user.username});
        query.exec()
        .then(function(row) {
            if (row && bcrypt.compareSync(user.password, row.password)) {
                var refreshToken = jwt.sign({sessionId: null, username: row.username}, auth.jwtRefreshSecret)
                return User.updateRefreshToken(refreshToken, userAgent)
            }
            else
                throw({fn: 'Unauthorized', message: 'Invalid credentials'});
        })
        .then(row => {
            resolve({token: row.token, refreshToken: row.refreshToken})
        })
        .catch(function(err) {
            reject(err);
        })
    })
}

var User = mongoose.model('User', UserSchema);
module.exports = User;