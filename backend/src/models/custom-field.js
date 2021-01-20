var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CustomFieldSchema = new Schema({
    fieldType:          String,
    label:              {type: String, unique: true},
    position:           Number,
    displayVuln:        {type: Boolean, default: true},
    displayFinding:     {type: Boolean, default: true},
    displayCategory:    [String]
}, {timestamps: true})

/*
*** Statics ***
*/

// Get all Fields
CustomFieldSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = CustomField.find().sort('position')
        query.select('fieldType label displayVuln displayFinding displayCategory')
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create Field
CustomFieldSchema.statics.create = (field) => {
    return new Promise((resolve, reject) => {
        var query = new CustomField(field)
        query.save()
        .then((row) => {
                resolve(row);
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Custom Field already exists'});
            else
                reject(err);
        })
    })
}

// Update Fields
CustomFieldSchema.statics.updateAll = (fields) => {
    return new Promise((resolve, reject) => {
        var promises = fields.map(field => {
            return CustomField.findByIdAndUpdate(field._id, field).exec()
        })
        return Promise.all(promises)
        .then((row) => {
            resolve("Fields updated successfully")
        })
        .catch((err) => {
            reject(err);
        })
    })
}

// Delete Field
CustomFieldSchema.statics.delete = (fieldId) => {
    return new Promise((resolve, reject) => {
        var pullCount = 0
        var Vulnerability = mongoose.model('Vulnerability')
        var query = Vulnerability.find()
        query.exec()
        .then(rows => {
            var promises = []
            promises.push(CustomField.findByIdAndDelete(fieldId).exec())
            rows.map(row => {
                row.details.map(detail => {
                    if (detail.customFields.some(field => `${field.customField}` === fieldId))
                        pullCount++
                    
                    detail.customFields.pull({customField: fieldId})
                })
                promises.push(row.save())
            })
            return Promise.all(promises)
        })
        .then((row) => {
            if (row && row[0])
                resolve({msg: `Custom Field deleted successfully`, vulnCount: pullCount})
            else
                reject({fn: 'NotFound', message: {msg: 'Custom Field not found', vulnCount: pullCount}})
        })
        .catch((err) => {
            console.log(err)
            reject(err);
        })
    })
}

/*
*** Methods ***
*/

var CustomField = mongoose.model('CustomField', CustomFieldSchema);
module.exports = CustomField;

