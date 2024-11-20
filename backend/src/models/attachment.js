var mongoose = require('mongoose')
const fs = require('fs');
// Read the base64 string from the file
let base64String = fs.readFileSync('/run/secrets/attachmentIV', 'utf8');

// Convert the base64 string to a binary buffer
let iv = Buffer.from(base64String, 'base64');

// Read the base64 string from the file
let base64KeyString = fs.readFileSync('/run/secrets/attachmentKey', 'utf8');

// Convert the base64 string to a binary buffer
let key = Buffer.from(base64KeyString, 'base64');

var crypto = require('crypto');
var bucket;

mongoose.connection.on('connected', function () {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'myBucket' // replace 'myBucket' with your bucket name
    });
});

var AttachmentSchema = new mongoose.Schema({
});
/*


*** Statics ***
*/

// Get one attachment with its id value and name
AttachmentSchema.statics.getOne = (attachmentId) => {
    return new Promise((resolve, reject) => {
        try {
            const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(attachmentId));
            let base64Strings = [];

            downloadStream.on('data', (chunk) => {
                base64Strings.push(chunk);
            });

            downloadStream.on('end', () => {
                const decryptedAttachment = decrypt(base64Strings.join(''), key, iv);
                resolve({
                    name: downloadStream.s.file.filename,
                    value: decryptedAttachment,
                });
            });

            downloadStream.on('error', (err) => {
                console.log('Error while reading attachment', err);
                return reject(err);
            });
            
        } catch (err) {
            console.log('Error while reading attachment', err);
            return reject(err);
        }
    })
};

// Get attachment metadata
AttachmentSchema.statics.getMetadata = (attachmentIds) => {
    return new Promise(async (resolve, reject) => {
        try {
            for (let id of attachmentIds) {
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return reject('Invalid attachment id');
                }
            }
            const documents = await bucket.find({ _id: { $in: attachmentIds } }).toArray();
            resolve(documents);
        } catch (err) {
            console.log('Error while fetching metadata of attachment', err);
            return reject(err);
        }
    })
};

// Create attachment
AttachmentSchema.statics.create = (attachment) => {
    return new Promise((resolve, reject) => {
        try {
            const encryptedAttachment = encrypt(attachment.value, key, iv);
            const uploadStream = bucket.openUploadStream(attachment.name);
            uploadStream.end(encryptedAttachment);
            uploadStream.on('finish', function () {
                resolve(uploadStream.id);
            });
            uploadStream.on('error', function (err) {
                console.log('Error while creating a new attachment', err);
                return reject(err);
            });
        } catch (err) {
            console.log('Error while creating a new attachment', err);
            return reject(err);
        }
    })
};

// Delete attachment
AttachmentSchema.statics.delete = (attachmentId) => {
    return new Promise((resolve, reject) => {
     try{
            bucket.delete(new mongoose.Types.ObjectId(attachmentId))
            resolve('Attachment deleted');
     }
        catch (err) {
            console.log('Error while deleting an attachment', err);
            return reject(err);
        }
    })
}

function encrypt(text, key, iv) {
    let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('base64');
}

function decrypt(encryptedBase64, key, iv) {
    let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(Buffer.from(encryptedBase64, 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
/*
*** Methods ***
*/

var Attachment = mongoose.model('Attachment', AttachmentSchema)
Attachment.syncIndexes()
module.exports = Attachment