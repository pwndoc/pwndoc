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

LanguageSchema.statics.backup = (path) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function exportLanguagesPromise() {
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(`${path}/languages.json`)
                writeStream.write('[')

                let languages = Language.find().cursor()
                let isFirst = true

                languages.eachAsync(async (document) => {
                    if (!isFirst) {
                        writeStream.write(',')
                    } else {
                        isFirst = false
                    }
                    writeStream.write(JSON.stringify(document, null, 2))
                    return Promise.resolve()
                })
                .then(() => {
                    writeStream.write(']');
                    writeStream.end();
                })
                .catch((error) => {
                    reject(error);
                });

                writeStream.on('finish', () => {
                    resolve('ok');
                });
            
                writeStream.on('error', (error) => {
                    reject(error);
                });
            })
        }

        try {
            await exportLanguagesPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Languages'})
        }
            
    })
}

LanguageSchema.statics.restore = (path, mode = "upsert") => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function importLanguagesPromise () {
            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(`${path}/languages.json`)
                const JSONStream = require('JSONStream')

                let jsonStream = JSONStream.parse('*')
                readStream.pipe(jsonStream)

                readStream.on('error', (error) => {
                    reject(error)
                })

                jsonStream.on('data', async (document) => {
                    delete document._id
                    Language.findOneAndReplace({language: document.language, locale: document.locale}, document, { upsert: true, new: true })
                    .catch(err => {
                        console.log(err)
                        reject(err)
                    })
                })
                jsonStream.on('end', () => {
                    resolve()
                })
                jsonStream.on('error', (error) => {
                    reject(error)
                })
            })
        }

        try {
            if (mode === "revert") 
                await Language.deleteMany()
            await importLanguagesPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Languages'})
        }
    })
}

/*
*** Methods ***
*/

var Language = mongoose.model('Language', LanguageSchema);
module.exports = Language;