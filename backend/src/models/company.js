var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CompanySchema = new Schema({
    name: {type: String, required: true, unique: true},
    shortName: String,
    logo: String

}, {timestamps: true});

/*
*** Statics ***
*/

// Get all companies
CompanySchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = Company.find();
        query.select('name shortName logo');
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
                resolve({_id: row._id, name: row.name});
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
CompanySchema.statics.update = (companyId, company) => {
    return new Promise((resolve, reject) => {
        var query = Company.findOneAndUpdate({_id: companyId}, company);
        query.exec()
        .then((rows) => {
            if (rows)
                resolve(rows);
            else
                reject({fn: 'NotFound', message: 'Company Id not found'});
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
CompanySchema.statics.delete = (companyId) => {
    return new Promise((resolve, reject) => {
        var query = Company.findOneAndRemove({_id: companyId});
        query.exec()
        .then((rows) => {
            if (rows)
                resolve(rows);
            else
                reject({fn: 'NotFound', message: 'Company Id not found'});
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