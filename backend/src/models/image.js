var mongoose = require('mongoose')
var Audit = require('mongoose').model('Audit');

var Schema = mongoose.Schema

var ImageSchema = new Schema({
    auditId:    {type: Schema.Types.ObjectId, ref: 'Audit'},
    value:      {type: String, required: true},
    name:       String

}, {timestamps: true})

ImageSchema.index({"auditId": 1, "value": 1}, {
    name: "unique_audit_value",
    unique: true
})
/*
*** Statics ***
*/

// Get one image
ImageSchema.statics.getOne = (isAdmin, userId, imageId) => {
    return new Promise((resolve, reject) => {
        var query = Image.findById(imageId);
        query.populate('auditId', '_id creator collaborators reviewers')
        query.select('auditId name value');
        query.exec()
        .then((row) => {
            if (!row)
                throw({fn: 'NotFound', message: 'Image not found'});
            else if (
                isAdmin || row.auditId === null ||
                row.auditId.creator === userId ||
                row.auditId.collaborators.includes(userId) ||
                row.auditId.reviewers.includes(userId)
            ) {
                if (row.auditId) row.auditId = row.auditId._id;
                resolve(row);
            }
            else {
                throw({fn: 'Forbidden', message: 'Insufficient privileges'});
            }
        })
        .catch((err) => {
            reject(err)
        });
    })
}

// Create image
ImageSchema.statics.create = (isAdmin, userId, image) => {
    return new Promise(async (resolve, reject) => {
        let audit = null
        if (image.auditId)
           audit = await Audit.getAudit(isAdmin, image.auditId, userId)
        if (!image.auditId || audit) {
            let query = Image.findOne({value: image.value, auditId: image.auditId});
            query.exec()
                .then(row => {
                    console.log(row)
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
            }
        else
            throw({fn: 'Forbidden', message: 'Insufficient privileges'})
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