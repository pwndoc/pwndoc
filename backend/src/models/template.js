var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TemplateSchema = new Schema({
    name:      {type: String, required: true, unique: true},
    ext:      {type: String, required: true, unique: false}

}, {timestamps: true});

/*
*** Statics ***
*/

// Get all templates
TemplateSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = Template.find();
        query.select('name ext')
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get one template
TemplateSchema.statics.getOne = (templateId) => {
    return new Promise((resolve, reject) => {
        var query = Template.findById(templateId);
        query.select('name ext')
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create template
TemplateSchema.statics.create = (template) => {
    return new Promise((resolve, reject) => {
        var query = new Template(template);
        query.save()
        .then((row) => {
                resolve({_id: row._id, name: row.name, ext: row.ext});
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Template name already exists'});
            else
                reject(err);
        })
    })
}

// Update template
TemplateSchema.statics.update = (templateId, template) => {
    return new Promise((resolve, reject) => {
        var query = Template.findByIdAndUpdate(templateId, template);
        query.exec()
        .then((rows) => {
            if (rows)
                resolve(rows);
            else
                reject({fn: 'NotFound', message: 'Template not found'});
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Template name already exists'});
            else
                reject(err);
        })
    });
}

// Delete template
TemplateSchema.statics.delete = (templateId) => {
    return new Promise((resolve, reject) => {
        var query = Template.findByIdAndDelete(templateId);
        query.exec()
        .then((rows) => {
            if (rows)
                resolve(rows);
            else
                reject({fn: 'NotFound', message: 'Template not found'});
        })
        .catch((err) => {
            reject(err);
        })
    });
}

TemplateSchema.statics.backup = (path) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function exportTemplatesPromise() {
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(`${path}/templates.json`)
                writeStream.write('[')

                let templates = Template.find().cursor()
                let isFirst = true

                templates.eachAsync(async (document) => {
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
            await exportTemplatesPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Template'})
        }
            
    })
}

TemplateSchema.statics.restore = (path, mode = "upsert") => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function importTemplatesPromise() {
            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(`${path}/templates.json`)
                const JSONStream = require('JSONStream')

                let jsonStream = JSONStream.parse('*')
                readStream.pipe(jsonStream)

                readStream.on('error', (error) => {
                    reject(error)
                })

                jsonStream.on('data', async (document) => {
                    delete document._id
                    Template.findOneAndReplace({ name: document.name }, document, { upsert: true, new: true })
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
                await Template.deleteMany()
            await importTemplatesPromise()
            resolve()
        }
        catch (error) {
            reject({ error: error, model: 'Template' })
        }
    })
}

/*
*** Methods ***
*/

var Template = mongoose.model('Template', TemplateSchema);
module.exports = Template;