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

CompanySchema.statics.backup = (path) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function exportCompaniesPromise() {
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(`${path}/companies.json`)
                writeStream.write('[')

                let companies = Company.find().cursor()
                let isFirst = true

                companies.eachAsync(async (document) => {
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
            await exportCompaniesPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Companies'})
        }
            
    })
}

CompanySchema.statics.restore = (path, mode = "upsert") => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function importCompaniesPromise () {
            let documents = []

            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(`${path}/companies.json`)
                const JSONStream = require('JSONStream')

                let jsonStream = JSONStream.parse('*')
                readStream.pipe(jsonStream)

                readStream.on('error', (error) => {
                    reject(error)
                })

                jsonStream.on('data', async (document) => {
                    documents.push(document)
                    if (documents.length === 100) {
                        Company.bulkWrite(documents.map(document => {
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
                        Company.bulkWrite(documents.map(document => {
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
                await Company.deleteMany()
            await importCompaniesPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Companies'})
        }
    })
}

/*
*** Methods ***
*/

var Company = mongoose.model('Company', CompanySchema);
module.exports = Company;