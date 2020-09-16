var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var LanguageSchema = new Schema({
    language:   {type: String, unique: true},
    locale:     {type: String, unique: true}   

}, {timestamps: true});

/*
*** Statics ***
*/

// Get all languages
LanguageSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = Language.find();
        query.select('-_id language locale')
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create language
LanguageSchema.statics.create = (language) => {
    return new Promise((resolve, reject) => {
        var query = new Language(language);
        query.save()
        .then((row) => {
                resolve(row);
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Language already exists'});
            else
                reject(err);
        })
    })
}

// Update languages
LanguageSchema.statics.updateAll = (languages) => {
    return new Promise((resolve, reject) => {
        Language.deleteMany()
        .then((row) => {
            Language.insertMany(languages)
        })
        .then((row) => {
            resolve("Languages updated successfully")
        })
        .catch((err) => {
            reject(err);
        })
    })
}

// Delete language
LanguageSchema.statics.delete = (locale) => {
    return new Promise((resolve, reject) => {
        Language.deleteOne({locale: locale})
        .then((res) => {
            if (res.deletedCount === 1)
                resolve('Language deleted');
            else
                reject({fn: 'NotFound', message: 'Language not found'});
        })
        .catch((err) => {
            reject(err);
        })
    });
}

/*
*** Methods ***
*/

var Language = mongoose.model('Language', LanguageSchema);
module.exports = Language;