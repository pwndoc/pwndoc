const mongoose = require('mongoose');
const { pipeline } = require('node:stream/promises');
const { Transform, Readable } = require('node:stream');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const schema = new mongoose.Schema({
    auditId: { type: mongoose.Schema.Types.ObjectId, ref: 'Audit', required: true, index: true },
    blobId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    sha256: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedByName: { type: String, required: true },
    state: { type: String, enum: ['uploading', 'ready', 'deleting'], required: true },
    scanStatus: { type: String, enum: ['not-scanned', 'clean'], default: 'not-scanned' }
}, { timestamps: true });
schema.index({ auditId: 1, state: 1, createdAt: -1 });

function positiveInteger(name, fallback) {
    const value = process.env[name];
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1)
        throw new Error(`${name} must be a positive integer`);
    return Number(value);
}

function limits() {
    return {
        maxFileBytes: positiveInteger('AUDIT_FILES_MAX_FILE_BYTES', 100 * 1024 * 1024),
        maxAuditBytes: positiveInteger('AUDIT_FILES_MAX_AUDIT_BYTES', 1024 * 1024 * 1024),
        maxAuditFiles: positiveInteger('AUDIT_FILES_MAX_COUNT', 100)
    };
}

function safeName(value) {
    if (typeof value !== 'string') throw { fn: 'BadParameters', message: 'Invalid filename' };
    const name = value.replace(/\\/g, '/').split('/').pop().normalize('NFC')
        .replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, '').trim();
    if (!name || name === '.' || name === '..' || Buffer.byteLength(name) > 255)
        throw { fn: 'BadParameters', message: 'Filename must contain between 1 and 255 bytes' };
    return name;
}

function bucket() {
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'auditFileBlobs' });
}

// Also removes chunks from interrupted uploads, which have no GridFS files entry.
async function deleteBlob(id) {
    await mongoose.connection.db.collection('auditFileBlobs.chunks').deleteMany({ files_id: id });
    await mongoose.connection.db.collection('auditFileBlobs.files').deleteOne({ _id: id });
}

function publicFile(file) {
    return {
        _id: file._id, name: file.name, size: file.size, sha256: file.sha256,
        uploadedBy: file.uploadedBy, uploadedByName: file.uploadedByName,
        createdAt: file.createdAt, scanStatus: file.scanStatus
    };
}

async function usage(auditId) {
    const [result] = await AuditFile.aggregate([
        { $match: { auditId: new mongoose.Types.ObjectId(auditId) } },
        { $group: { _id: null, bytes: { $sum: '$size' }, count: { $sum: 1 } } }
    ]).option({ maxTimeMS: 10000 });
    return { bytes: result?.bytes || 0, count: result?.count || 0 };
}

// Serialize quota reservations on the owning audit. Pending transfers count toward
// both quotas; a crashed process cannot leave a permanent lock or an uncounted file.
async function reserve(auditId, file) {
    const Audit = mongoose.model('Audit');
    const token = randomUUID();
    const lock = await Audit.findOneAndUpdate({
        _id: auditId,
        $or: [{ fileUploadLock: { $exists: false } }, { 'fileUploadLock.expiresAt': { $lt: new Date() } }]
    }, { $set: { fileUploadLock: { token, expiresAt: new Date(Date.now() + 120000) } } },
    { new: true, maxTimeMS: 10000, timestamps: false });
    if (!lock) throw { fn: 'Forbidden', message: 'Audit unavailable or another upload is starting. Please retry.' };
    try {
        const current = await usage(auditId);
        const config = limits();
        if (current.count >= config.maxAuditFiles || current.bytes + file.size > config.maxAuditBytes)
            throw { fn: 'BadParameters', message: 'Audit file quota exceeded' };
        const reserved = await AuditFile.create({ ...file, auditId, state: 'uploading' });
        if (!await Audit.exists({ _id: auditId, 'fileUploadLock.token': token,
            'fileUploadLock.expiresAt': { $gt: new Date() } })) {
            await remove(reserved);
            throw { fn: 'Forbidden', message: 'Upload reservation expired. Please retry.' };
        }
        return reserved;
    } finally {
        await Audit.updateOne({ _id: auditId, 'fileUploadLock.token': token },
            { $unset: { fileUploadLock: 1 } }, { timestamps: false });
    }
}

function digestStream(expectedSize, expectedHash) {
    const hash = createHash('sha256');
    let bytes = 0;
    const stream = new Transform({
        transform(chunk, encoding, callback) {
            bytes += chunk.length;
            if (bytes > expectedSize) return callback(new Error('File size does not match declared size'));
            hash.update(chunk);
            callback(null, chunk);
        },
        flush(callback) {
            stream.sha256 = hash.digest('hex');
            if (bytes !== expectedSize || (expectedHash && stream.sha256 !== expectedHash))
                return callback(new Error('File integrity check failed'));
            callback();
        }
    });
    return stream;
}

async function remove(file) {
    await deleteBlob(file.blobId);
    await AuditFile.deleteOne({ _id: file._id });
}

async function removeForAudit(auditId) {
    for await (const file of AuditFile.find({ auditId }).cursor()) await remove(file);
}

async function cleanupIncomplete() {
    // Transfers have a 15 minute timeout. Retain a large margin for live workers.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for await (const file of AuditFile.find({ state: { $in: ['uploading', 'deleting'] }, updatedAt: { $lt: cutoff } }).cursor())
        await remove(file);
    // Recover from a process crash between deleting an audit and its attachments.
    const orphans = AuditFile.aggregate([
        { $lookup: { from: mongoose.model('Audit').collection.name, localField: 'auditId', foreignField: '_id', as: 'owner' } },
        { $match: { 'owner.0': { $exists: false } } },
        { $project: { owner: 0 } }
    ]).cursor();
    for await (const file of orphans) await remove(file);
}

async function backup(directory, auditIds = []) {
    const target = path.join(directory, 'audit-files');
    await fs.promises.mkdir(target, { recursive: true });
    const manifest = await fs.promises.open(path.join(directory, 'audits-files.json'), 'w');
    try {
        await manifest.write('[');
        let first = true;
        const filter = { state: 'ready' };
        if (auditIds.length) filter.auditId = { $in: auditIds };
        for await (const file of AuditFile.find(filter).lean().cursor()) {
            const digest = digestStream(file.size, file.sha256);
            await pipeline(bucket().openDownloadStream(file.blobId), digest,
                fs.createWriteStream(path.join(target, String(file._id))));
            await manifest.write(`${first ? '' : ','}${JSON.stringify({ ...publicFile(file), auditId: file.auditId })}`);
            first = false;
        }
        await manifest.write(']');
    } finally {
        await manifest.close();
    }
}

async function restore(directory) {
    const manifestPath = path.join(directory, 'audits-files.json');
    if (!fs.existsSync(manifestPath)) return; // Archives created before file management.
    const parser = require('JSONStream').parse('*');
    // JSONStream is a legacy stream; wrap it to gain async iteration with backpressure.
    const documents = new Readable({ objectMode: true }).wrap(parser);
    const input = fs.createReadStream(manifestPath);
    input.on('error', error => parser.destroy(error));
    input.pipe(parser);
    try {
        for await (const entry of documents) {
            if (!mongoose.isObjectIdOrHexString(entry._id) || !mongoose.isObjectIdOrHexString(entry.auditId) ||
                !mongoose.isObjectIdOrHexString(entry.uploadedBy) || !Number.isSafeInteger(entry.size) || entry.size < 0 ||
                !/^[a-f0-9]{64}$/.test(entry.sha256) || !['not-scanned', 'clean'].includes(entry.scanStatus) ||
                !Number.isFinite(Date.parse(entry.createdAt)) || typeof entry.uploadedByName !== 'string')
                throw new Error('Invalid audit file manifest');
            if (!await mongoose.model('Audit').exists({ _id: entry.auditId }))
                throw new Error('Attachment references a missing audit');
            const name = safeName(entry.name);
            const old = await AuditFile.findById(entry._id);
            const upload = bucket().openUploadStream(name);
            try {
                await pipeline(fs.createReadStream(path.join(directory, 'audit-files', entry._id)),
                    digestStream(entry.size, entry.sha256), upload);
                await AuditFile.replaceOne({ _id: entry._id }, {
                    _id: entry._id, auditId: entry.auditId, blobId: upload.id, name,
                    size: entry.size, sha256: entry.sha256, uploadedBy: entry.uploadedBy,
                    uploadedByName: entry.uploadedByName, createdAt: new Date(entry.createdAt),
                    state: 'ready', scanStatus: entry.scanStatus
                }, { upsert: true, timestamps: false });
            } catch (error) {
                await deleteBlob(upload.id);
                throw error;
            }
            if (old) await deleteBlob(old.blobId);
        }
    } finally {
        input.destroy();
        parser.destroy();
        documents.destroy();
    }
}

const AuditFile = mongoose.model('AuditFile', schema);
Object.assign(AuditFile, { limits, safeName, bucket, deleteBlob, publicFile, usage, reserve,
    digestStream, remove, removeForAudit, cleanupIncomplete, backup, restore });
module.exports = AuditFile;
