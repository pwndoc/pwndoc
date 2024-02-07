var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CustomSectionSchema = new Schema({
    field:  {type: String, required: true, unique: true},
    name:   {type: String, required: true, unique: true},
    icon:   String,
    order:  Number
}, {timestamps: true});

/*
*** Statics ***
*/

// Get all Sections
CustomSectionSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = CustomSection.find().sort({order: 1});
        query.select('field name icon')
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
    return new Promise(async (resolve, reject) => {
        const lastDocument = await CustomSection.findOne({}, {}, { sort: { order: -1 } })
        const newOrder = (lastDocument && lastDocument.order) ? lastDocument.order + 1 : 1
        section.order = newOrder
        var query = new CustomSection(section)
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
            let order = 1
            sections.forEach(section => {
                section.order = order
                order += 1
            })
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

CustomSectionSchema.statics.backup = (path) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function exportCustomSectionsPromise() {
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(`${path}/customSections.json`)
                writeStream.write('[')

                let customSections = CustomSection.find().cursor()
                let isFirst = true

                customSections.eachAsync(async (document) => {
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
            await exportCustomSectionsPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'CustomSection'})
        }
            
    })
}

CustomSectionSchema.statics.restore = (path, mode = "upsert") => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function importCustomSectionsPromise () {
            let documents = []

            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(`${path}/customSections.json`)
                const JSONStream = require('JSONStream')

                let jsonStream = JSONStream.parse('*')
                readStream.pipe(jsonStream)

                readStream.on('error', (error) => {
                    reject(error)
                })

                jsonStream.on('data', async (document) => {
                    documents.push(document)
                    if (documents.length === 100) {
                        CustomSection.bulkWrite(documents.map(document => {
                            return {
                                replaceOne: {
                                    filter: {name: document.name},
                                    replacement: document,
                                    upsert: true
                                }
                            }
                        }))
                        .catch(err => {
                            reject(err)
                        })
                        documents = []
                    }
                })
                jsonStream.on('end', () => {
                    if (documents.length > 0) {
                        CustomSection.bulkWrite(documents.map(document => {
                            return {
                                replaceOne: {
                                    filter: {name: document.name},
                                    replacement: document,
                                    upsert: true
                                }
                            }
                        }))
                        .then(() => {
                            resolve()
                        })
                        .catch(err => {
                            reject(err)
                        })
                    }
                    else
                        resolve()
                })
                jsonStream.on('error', (error) => {
                    reject(error)
                })
            })
        }

        try {
            if (mode === "revert") 
                await CustomSection.deleteMany()
            await importCustomSectionsPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'CustomSection'})
        }
    })
}

/*
*** Methods ***
*/

var CustomSection = mongoose.model('CustomSection', CustomSectionSchema);
CustomSection.syncIndexes();
module.exports = CustomSection;

