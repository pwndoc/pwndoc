var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CustomSectionSchema = new Schema({
    field:  {type: String, required: true, unique: true},
    name:   {type: String, required: true, unique: true},
    icon:   String,
}, {timestamps: true});

/*
*** Statics ***
*/

// Get all Sections
CustomSectionSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = CustomSection.find();
        query.select('-_id field name icon')
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get all Sections by Language
CustomSectionSchema.statics.getAllByLanguage = (locale) => {
    return new Promise((resolve, reject) => {
        var query = CustomSection.find({locale: locale});
        query.select('-_id field name icon')
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create Section
CustomSectionSchema.statics.create = (section) => {
    return new Promise((resolve, reject) => {
        var query = new CustomSection(section);
        query.save()
        .then((row) => {
                resolve(row);
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Custom Section already exists'});
            else
                reject(err);
        })
    })
}

// Update Sections
CustomSectionSchema.statics.updateAll = (sections) => {
    return new Promise((resolve, reject) => {
        CustomSection.deleteMany()
        .then((row) => {
            CustomSection.insertMany(sections)
        })
        .then((row) => {
            resolve("Sections updated successfully")
        })
        .catch((err) => {
            reject(err);
        })
    })
}

// Delete Section
CustomSectionSchema.statics.delete = (field, locale) => {
    return new Promise((resolve, reject) => {
        CustomSection.deleteOne({field: field, locale: locale})
        .then((res) => {
            if (res.deletedCount === 1)
                resolve('Custom Section deleted');
            else
                reject({fn: 'NotFound', message: 'Custom Section not found'});
        })
        .catch((err) => {
            reject(err);
        })
    });
}

/*
*** Methods ***
*/

var CustomSection = mongoose.model('CustomSection', CustomSectionSchema);
CustomSection.syncIndexes();
module.exports = CustomSection;

