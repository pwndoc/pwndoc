var mongoose = require('mongoose')
var Schema = mongoose.Schema

var ImageSchema = new Schema({
    auditId:    {type: Schema.Types.ObjectId, ref: 'Audit'},
    value:      {type: String, required: true, unique: true},
    name:       String

}, {timestamps: true})

/*
*** Statics ***
*/

// Get one image
ImageSchema.statics.getOne = (imageId) => {
    return new Promise((resolve, reject) => {
        var query = Image.findById(imageId)
        
        query.select('auditId value name')
        query.exec()
        .then((row) => {
            if (row)
                resolve(row)
            else 
                throw({fn: 'NotFound', message: 'Image not found'});
        })
        .catch((err) => {
            reject(err)
        })
    })
}

// Create image
ImageSchema.statics.create = (image) => {
    return new Promise((resolve, reject) => {
        var query = Image.findOne({value: image.value})
        query.exec()
        .then(row => {
            if (row)
                return row
            query = new Image(image)
            return query.save()
        })
        .then((row) => {
            resolve({_id: row._id})
        })
        .catch((err) => {
            console.log(err)
            reject(err)
        })
    })
}

// Delete image
ImageSchema.statics.delete = (imageId) => {
    return new Promise((resolve, reject) => {
        var query = Image.findByIdAndDelete(imageId)
        query.exec()
        .then((rows) => {
            if (rows)
                resolve(rows)
            else
                reject({fn: 'NotFound', message: 'Image not found'})
        })
        .catch((err) => {
            reject(err)
        })
    })
}

/*
*** Methods ***
*/

var Image = mongoose.model('Image', ImageSchema)
Image.syncIndexes()
module.exports = Image