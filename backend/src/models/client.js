var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ClientSchema = new Schema({
    email:      {type: String, required: true, unique: true},
    company:    {type: Schema.Types.ObjectId, ref: 'Company'},
    lastname:   String,
    firstname:  String,
    phone:      String,
    cell:       String,
    title:      String

}, {timestamps: true});

/*
*** Statics ***
*/

// Get all clients
ClientSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = Client.find().populate('company', '-_id name');
        query.select('email lastname firstname phone cell title');
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create client
ClientSchema.statics.create = (client, company) => {
    return new Promise(async(resolve, reject) => {
        if (company) {
            var Company = mongoose.model("Company");
            var query = Company.findOneAndUpdate({name: company}, {}, {upsert: true, new: true});
            var companyRow = await query.exec()
            if (companyRow) client.company = companyRow._id;
        }
        var query = new Client(client);
        query.save(company)
        .then((row) => {
                resolve({
                    _id: row._id,
                    email: row.email,
                    firstname: row.firstname,
                    lastname: row.lastname,
                    title: row.title,
                    phone: row.phone,
                    cell: row.cell,
                    company: row.company
                });
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Client email already exists'});
            else
                reject(err);
        })
    })
}

// Update client
ClientSchema.statics.update = (clientId, client, company) => {
    return new Promise(async(resolve, reject) => {
        if (company) {
            var Company = mongoose.model("Company");
            var query = Company.findOneAndUpdate({name: company}, {}, {upsert: true, new: true});
            var companyRow = await query.exec()
            if (companyRow) client.company = companyRow.id;
        }
        var query = Client.findOneAndUpdate({_id: clientId}, client);
        query.exec()
        .then((rows) => {
            if (rows)
                resolve(rows);
            else
                reject({fn: 'NotFound', message: 'Client Id not found'});
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Client email already exists'});
            else
                reject(err);
        })
    });
}

// Delete client
ClientSchema.statics.delete = (clientId) => {
    return new Promise((resolve, reject) => {
        var query = Client.findOneAndDelete({_id: clientId});
        query.exec()
        .then((rows) => {
            if (rows)
                resolve(rows);
            else
                reject({fn: 'NotFound', message: 'Client Id not found'});
        })
        .catch((err) => {
            reject(err);
        })
    });
}

ClientSchema.statics.backup = (path) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function exportClientsPromise() {
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(`${path}/clients.json`)
                writeStream.write('[')

                let clients = Client.find().cursor()
                let isFirst = true

                clients.eachAsync(async (document) => {
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
            await exportClientsPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Clients'})
        }
            
    })
}

ClientSchema.statics.restore = (path, mode = "upsert") => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function importClientsPromise () {
            let documents = []

            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(`${path}/clients.json`)
                const JSONStream = require('JSONStream')

                let jsonStream = JSONStream.parse('*')
                readStream.pipe(jsonStream)

                readStream.on('error', (error) => {
                    reject(error)
                })

                jsonStream.on('data', async (document) => {
                    documents.push(document)
                    if (documents.length === 100) {
                        Client.bulkWrite(documents.map(document => {
                            return {
                                replaceOne: {
                                    filter: {email: document.email},
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
                        Client.bulkWrite(documents.map(document => {
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
                await Client.deleteMany()
            await importClientsPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Clients'})
        }
    })
}

/*
*** Methods ***
*/

var Client = mongoose.model('Client', ClientSchema);
module.exports = Client;