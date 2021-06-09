var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Template = {
    _id: false,
    template: {type: Schema.Types.ObjectId, ref: 'Template'},
    locale: String
}

var AuditTypeSchema = new Schema({
    name:   {type: String, unique: true},
    templates: [Template],
    sections: [{type: String, ref: 'CustomSection'}],
    hidden: [{type: String, enum: ['network', 'findings']}]
}, {timestamps: true});

/*
*** Statics ***
*/

// Get all auditTypes
AuditTypeSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = AuditType.find();
        query.select('-_id name templates sections hidden')
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get auditType by name
AuditTypeSchema.statics.getByName = (name) => {
    return new Promise((resolve, reject) => {
        var query = AuditType.findOne({name: name});
        query.select('-_id name templates sections hidden')
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
    return new Promise((resolve, reject) => {
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

// Update Audit Types
AuditTypeSchema.statics.updateAll = (auditTypes) => {
    return new Promise((resolve, reject) => {
        AuditType.deleteMany()
        .then((row) => {
            AuditType.insertMany(auditTypes)
        })
        .then((row) => {
            resolve("Audit Types updated successfully")
        })
        .catch((err) => {
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
AuditType.syncIndexes();
module.exports = AuditType;