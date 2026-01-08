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
    hidden: [{type: String, enum: ['network', 'findings']}],
    stage: {type: String, enum: ['default', 'retest', 'multi'], default: 'default'},
    order: Number
}, {timestamps: true});

/*
*** Statics ***
*/

// Get all auditTypes
AuditTypeSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = AuditType.find().sort({order: 1});
        query.select('name templates sections hidden stage')
        query.lean()
        query.exec()
        .then((rows) => {
            // Convert null template subdocuments to empty objects for Mongoose 9.x compatibility
            rows = rows.map(row => {
                if (row.templates) {
                    row.templates = row.templates.map(template => template === null ? {} : template);
                }
                return row;
            });
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
        query.select('name templates sections hidden stage')
        query.lean()
        query.exec()
        .then((rows) => {
            // Convert null template subdocuments to empty objects for Mongoose 9.x compatibility
            if (rows && rows.templates) {
                rows.templates = rows.templates.map(template => template === null ? {} : template);
            }
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create auditType
AuditTypeSchema.statics.create = (auditType) => {
    return new Promise(async (resolve, reject) => {
        const lastDocument = await AuditType.findOne({}, {}, { sort: { order: -1 } });
        const newOrder = (lastDocument && lastDocument.order) ? lastDocument.order + 1 : 1;
        auditType.order = newOrder;
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
            let order = 1
            auditTypes.forEach(type => {
                type.order = order
                order += 1
            })
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

AuditTypeSchema.statics.backup = (path) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function exportAuditTypesPromise() {
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(`${path}/auditTypes.json`)
                writeStream.write('[')

                let auditTypes = AuditType.find().cursor()
                let isFirst = true

                auditTypes.eachAsync(async (document) => {
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
            await exportAuditTypesPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'AuditType'})
        }
            
    })
}

AuditTypeSchema.statics.restore = (path, mode = "upsert") => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function importAuditTypesPromise () {
            let documents = []

            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(`${path}/auditTypes.json`)
                const JSONStream = require('JSONStream')

                let jsonStream = JSONStream.parse('*')
                readStream.pipe(jsonStream)

                readStream.on('error', (error) => {
                    reject(error)
                })

                jsonStream.on('data', async (document) => {
                    documents.push(document)
                    if (documents.length === 100) {
                        AuditType.bulkWrite(documents.map(document => {
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
                        AuditType.bulkWrite(documents.map(document => {
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
                await AuditType.deleteMany()
            await importAuditTypesPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'AuditType'})
        }
    })
}

/*
*** Methods ***
*/

var AuditType = mongoose.model('AuditType', AuditTypeSchema);
AuditType.syncIndexes();
module.exports = AuditType;