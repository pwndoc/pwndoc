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
        var query = Client.findOneAndRemove({_id: clientId});
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

/*
*** Methods ***
*/

var Client = mongoose.model('Client', ClientSchema);
module.exports = Client;