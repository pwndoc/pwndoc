var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TemplateSchema = new Schema({
    name:      {type: String, required: true, unique: true}

}, {timestamps: true});

/*
*** Statics ***
*/

// Get all templates
TemplateSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = Template.find();
        query.select('name')
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
        query.select('name')
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
                resolve(row);
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

/*
*** Methods ***
*/

var Template = mongoose.model('Template', TemplateSchema);
module.exports = Template;