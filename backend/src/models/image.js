var mongoose = require('mongoose')
var Schema = mongoose.Schema

var ImageSchema = new Schema({
    auditId:    {type: Schema.Types.ObjectId, ref: 'Audit'},
    value:      {type: String, required: true, unique: true},
    name:       String

}, {timestamps: true})

var Audit = require('mongoose').model('Audit');

/*
*** Statics ***
*/

// Get one image
ImageSchema.statics.getOne = (isAdmin, userId, imageId) => {
    return new Promise((resolve, reject) => {
        var query = Image.findById(imageId);
        
        // Check if we have access to the report in which the image is located
        if (!isAdmin) {
            query.populate({
                path: 'auditId',
                select: '_id',
                match: { $or: [ {creator: userId}, {collaborators: userId}, {reviewers: userId} ] }
            });
        }
        else {
            query.populate({
                path: 'auditId',
                select: '_id'
            });
        }

        query.select('auditId name value');
            query.exec()
            .then((row) => {
                if (row && row.auditId && row.auditId._id) {
                    row.auditId = row.auditId._id;
                    resolve(row);
                }
                else {
                    throw({fn: 'NotFound', message: 'Image not found'});
                }
            })
            .catch((err) => {
                reject(err)
            });
    })
}

// Create image
ImageSchema.statics.create = (isAdmin, userId, image) => {
    return new Promise((resolve, reject) => {
        Audit.getAudit(isAdmin, image.auditId, userId)
            .then((audit) => {
                console.log(audit);
                
                var query = Image.findOne({value: image.value});
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
                    });
            })
            .catch((err) => {
                console.log(err)    
                reject(err)
            });
    })
}

// Delete image
ImageSchema.statics.delete = (isAdmin, userId, imageId) => {
    return new Promise((resolve, reject) => {
        var query = Image.findByIdAndDelete(imageId);

        if (!isAdmin) {
            query.populate('auditId');
            query.or([{creator: userId}, {collaborators: userId}, {reviewers: userId}])
        }

        query.exec()
            .then((row) => {
                if (row && row.auditId) {
                    resolve(row);
                }
                else {
                    throw({fn: 'NotFound', message: 'Image not found'});
                }
            })
            .catch((err) => {
                reject(err)
            });
    })
}

/*
*** Methods ***
*/

var Image = mongoose.model('Image', ImageSchema);
Image.syncIndexes();
module.exports = Image;