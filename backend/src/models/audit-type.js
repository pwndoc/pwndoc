var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AuditTypeSchema = new Schema({
    name:   String,
    locale: String
}, {timestamps: true});

AuditTypeSchema.index({"name": 1, "locale": 1}, {name: "unique_name_locale", unique: true})

/*
*** Statics ***
*/

// Get all auditTypes
AuditTypeSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = AuditType.find();
        query.select('-_id name locale')
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create auditType
AuditTypeSchema.statics.create = (auditType) => {
    return new Promise(async(resolve, reject) => {
        var query = new AuditType(auditType);
        query.save()
        .then((row) => {
                resolve(row);
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Audit Type already exists'});
            else
                reject(err);
        })
    })
}

// Delete auditType
AuditTypeSchema.statics.delete = (name) => {
    return new Promise((resolve, reject) => {
        AuditType.deleteOne({name: name})
        .then((res) => {
            if (res.deletedCount === 1)
                resolve('Audit Type deleted');
            else
                reject({fn: 'NotFound', message: 'Audit Type not found'});
        })
        .catch((err) => {
            reject(err);
        })
    });
}

/*
*** Methods ***
*/

var AuditType = mongoose.model('AuditType', AuditTypeSchema);
module.exports = AuditType;