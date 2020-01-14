var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

var auth = require('../lib/auth.js');
var auditSchema = require('./audit.js').schema;

var UserSchema = new Schema({
    username:       {type: String, unique: true, required: true},
    password:       {type: String, required: true},
    firstname:      {type: String, required: true},
    lastname:       {type: String, required: true},
    role:           {type: String, enum: ['admin', 'user'], default: 'user'},
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
        query.select('-_id username firstname lastname role');
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

                payload.username = row.username;
                payload.role = row.role;
                payload.firstname = row.firstname;
                payload.lastname = row.lastname;

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
UserSchema.statics.updateUser = function (username, user) {
    return new Promise((resolve, reject) => {
        var query = this.findOne({username: username});
        query.exec()
        .then(function(row) {
            if (!row)
                throw({fn: 'NotFound', message: 'User not found'});
            else {
                if (user.username) row.username = user.username;
                if (user.firstname) row.firstname = user.firstname;
                if (user.lastname) row.lastname = user.lastname;
                if (user.role) row.role = user.role;
                if (user.password) row.password = bcrypt.hashSync(user.password, 10);

                return row.save();
            }
        })
        .then(function() {
            resolve('User updated successfully');
        })
        .catch(function(err) {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Username already exists'});
            else
                reject(err);
        })
    })
}

/*
*** Methods ***
*/

// Authenticate user with username and password, return JWT token
UserSchema.methods.getToken = function () {
    return new Promise((resolve, reject) => {
        var user = this;
        var query = User.findOne({username: user.username});
        query.exec()
        .then(function(row) {
            if (row && bcrypt.compareSync(user.password, row.password)) {
                var payload = {};
                payload.username = row.username;
                payload.role = row.role;
                payload.firstname = row.firstname;
                payload.lastname = row.lastname;

                var token = jwt.sign(payload, auth.jwtSecret, {expiresIn: '24h'});
                resolve({token: `JWT ${token}`});
            }
            else
                throw({fn: 'Unauthorized', message: 'Invalid credentials'});
        })
        .catch(function(err) {
            reject(err);
        })
    })
}

var User = mongoose.model('User', UserSchema);
module.exports = User;