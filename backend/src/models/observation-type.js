var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ObservationTypeSchema = new Schema({
    name: String,
    locale: String,
    order: {type: Number, default: 99}
}, {timestamps: true});

// Compound unique index on name and locale
ObservationTypeSchema.index({name: 1, locale: 1}, {unique: true});

/*
*** Statics ***
*/

// Get all observation types
ObservationTypeSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = ObservationType.find().sort('order');
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get observation types by language
ObservationTypeSchema.statics.getByLanguage = (locale) => {
    return new Promise((resolve, reject) => {
        var query = ObservationType.find({locale: locale}).sort('order');
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create observation type
ObservationTypeSchema.statics.create = (type) => {
    return new Promise((resolve, reject) => {
        var item = new ObservationType(type);
        item.save()
        .then((row) => {
            resolve(row);
        })
        .catch((err) => {
            if (err.code === 11000) {
                reject({fn: 'BadParameters', message: 'Observation type already exists for this language'});
            }
            else {
                reject(err);
            }
        })
    });
}

// Update observation type
ObservationTypeSchema.statics.update = (typeId, type) => {
    return new Promise((resolve, reject) => {
        ObservationType.findByIdAndUpdate(typeId, type, {new: true})
        .then((row) => {
            if (!row) {
                reject({fn: 'NotFound', message: 'Observation type not found'});
            }
            else {
                resolve(row);
            }
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Delete observation type
ObservationTypeSchema.statics.delete = (typeId) => {
    return ObservationType.findByIdAndDelete(typeId);
}

// Update order of all types
ObservationTypeSchema.statics.updateOrder = (types) => {
    return new Promise(async (resolve, reject) => {
        try {
            for (let i = 0; i < types.length; i++) {
                await ObservationType.findByIdAndUpdate(types[i]._id, {order: i});
            }
            resolve();
        }
        catch(err) {
            reject(err);
        }
    });
}

var ObservationType = mongoose.model('ObservationType', ObservationTypeSchema);
module.exports = ObservationType;
