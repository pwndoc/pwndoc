var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CompanySchema = new Schema({
    name: {type: String, required: true, unique: true},
    logo: String

}, {timestamps: true});

/*
*** Statics ***
*/

// Get all companies
CompanySchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = Company.find();
        query.select('name logo');
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create company
CompanySchema.statics.create = (company) => {
    return new Promise((resolve, reject) => {
        var query = new Company(company);
        query.save(company)
        .then((row) => {
                resolve(row);
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Company name already exists'});
            else
                reject(err);
        })
    })
}

// Update company
CompanySchema.statics.update = (name, company) => {
    return new Promise((resolve, reject) => {
        var query = Company.findOneAndUpdate({name: name}, company);
        query.exec()
        .then((rows) => {
            if (rows)
                resolve(rows);
            else
                reject({fn: 'BadParameters', message: 'Company name not found'});
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Company name already exists'});
            else
                reject(err);
        })
    });
}

// Delete company
CompanySchema.statics.delete = (name) => {
    return new Promise((resolve, reject) => {
        var query = Company.findOneAndRemove({name: name});
        query.exec()
        .then((rows) => {
            if (rows)
                resolve(rows);
            else
                reject({fn: 'BadParameters', message: 'Company name not found'});
        })
        .catch((err) => {
            reject(err);
        })
    });
}

/*
*** Methods ***
*/

var Company = mongoose.model('Company', CompanySchema);
module.exports = Company;