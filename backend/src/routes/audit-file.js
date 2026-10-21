const mongoose = require('mongoose');
const { pipeline } = require('node:stream/promises');
const Response = require('../lib/httpResponse');
const { acl } = require('../lib/auth');
const File = require('../models/audit-file');
const scan = require('../lib/audit-file-scanner');

module.exports = function(app) {
    const Audit = mongoose.model('Audit');
    const Settings = mongoose.model('Settings');

    async function access(req, write = false) {
        if (!mongoose.isObjectIdOrHexString(req.params.auditId))
            throw { fn: 'BadParameters', message: 'Invalid audit ID' };
        const query = { _id: req.params.auditId };
        if (!acl.isAllowedToken(req.decodedToken, write ? 'audits:update-all' : 'audits:read-all')) {
            query.$or = [{ creator: req.decodedToken.id }, { collaborators: req.decodedToken.id }];
            if (!write) query.$or.push({ reviewers: req.decodedToken.id });
        }
        const audit = await Audit.findOne(query).select('state').lean();
        if (!audit) throw { fn: 'NotFound', message: 'Audit not found or insufficient privileges' };
        if (write) {
            const settings = await Settings.getAll();
            if (settings.reviews.enabled && audit.state !== 'EDIT')
                throw { fn: 'Forbidden', message: 'The audit is not in the EDIT state and therefore cannot be edited.' };
        }
        return audit;
    }

    function fileId(req) {
        if (!mongoose.isObjectIdOrHexString(req.params.fileId))
            throw { fn: 'BadParameters', message: 'Invalid file ID' };
        return { _id: req.params.fileId, auditId: req.params.auditId };
    }

    function event(action, req, file) {
        console.info(JSON.stringify({ event: `audit.file.${action}`, auditId: req.params.auditId,
            fileId: String(file._id), actorId: req.decodedToken.id }));
    }

    app.get('/api/audits/:auditId/files', acl.hasPermission('audits:read'), async (req, res) => {
        try {
            await access(req);
            const files = await File.find({ auditId: req.params.auditId, state: 'ready' }).sort({ createdAt: -1 }).lean();
            Response.Ok(res, { files: files.map(File.publicFile), usage: await File.usage(req.params.auditId),
                limits: File.limits(), scanningEnabled: Boolean(process.env.AUDIT_FILES_CLAMAV_HOST) });
        } catch (error) { Response.Internal(res, error); }
    });

    // One raw binary per request. The browser supplies Content-Length for File/Blob
    // bodies, allowing an exact quota reservation before any content is stored.
    app.post('/api/audits/:auditId/files', acl.hasPermission('audits:update'), async (req, res) => {
        let file;
        try {
            await access(req, true);
            if (req.get('Content-Type') !== 'application/octet-stream')
                return res.status(415).json({ status: 'error', datas: 'Use application/octet-stream' });
            const length = req.get('Content-Length');
            if (!length || !/^\d+$/.test(length))
                return res.status(411).json({ status: 'error', datas: 'Content-Length is required' });
            const size = Number(length);
            if (!Number.isSafeInteger(size) || size > File.limits().maxFileBytes)
                return res.status(413).json({ status: 'error', datas: 'File size limit exceeded' });
            let name;
            try { name = File.safeName(decodeURIComponent(req.get('X-File-Name') || '')); }
            catch { throw { fn: 'BadParameters', message: 'Invalid X-File-Name header' }; }
            const id = new mongoose.Types.ObjectId();
            file = await File.reserve(req.params.auditId, { _id: id, blobId: id, name, size,
                uploadedBy: req.decodedToken.id, uploadedByName: req.decodedToken.username });
            req.setTimeout(15 * 60 * 1000, () => req.destroy(new Error('Upload timeout')));
            const digest = File.digestStream(size);
            await pipeline(req, digest, File.bucket().openUploadStreamWithId(id, name));
            req.setTimeout(0);
            const scanStatus = await scan(() => File.bucket().openDownloadStream(id));
            // An audit may have been deleted, locked or reassigned during transfer.
            await access(req, true);
            const ready = await File.findOneAndUpdate({ _id: id, state: 'uploading' },
                { $set: { state: 'ready', sha256: digest.sha256, scanStatus } }, { new: true });
            if (!ready) throw { fn: 'NotFound', message: 'Upload no longer belongs to an active audit' };
            event('uploaded', req, ready);
            Response.Created(res, File.publicFile(ready));
        } catch (error) {
            if (file) {
                try { await File.remove(file); }
                catch (cleanupError) { console.error('Audit file cleanup failed:', cleanupError.message); }
            }
            if (!res.destroyed) Response.Internal(res, error);
        }
    });

    app.get('/api/audits/:auditId/files/:fileId/download', acl.hasPermission('audits:read'), async (req, res) => {
        try {
            await access(req);
            const file = await File.findOne({ ...fileId(req), state: 'ready' }).lean();
            if (!file) throw { fn: 'NotFound', message: 'File not found' };
            // Verify the GridFS entry before sending headers to permit a useful 404.
            if (!await File.bucket().find({ _id: file.blobId }).hasNext())
                throw { fn: 'NotFound', message: 'File content not found' };
            res.attachment(file.name);
            res.set({ 'Content-Type': 'application/octet-stream', 'Content-Length': String(file.size),
                'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' });
            if (req.method === 'HEAD') return res.end();
            await pipeline(File.bucket().openDownloadStream(file.blobId), res);
            event('downloaded', req, file);
        } catch (error) {
            if (!res.headersSent && !res.destroyed) Response.Internal(res, error);
            else res.destroy();
        }
    });

    app.delete('/api/audits/:auditId/files/:fileId', acl.hasPermission('audits:update'), async (req, res) => {
        try {
            await access(req, true);
            const file = await File.findOneAndUpdate({ ...fileId(req), state: { $in: ['ready', 'deleting'] } },
                { $set: { state: 'deleting' } }, { new: true });
            if (!file) throw { fn: 'NotFound', message: 'File not found' };
            await File.remove(file);
            event('deleted', req, file);
            Response.Ok(res, 'File deleted successfully');
        } catch (error) { Response.Internal(res, error); }
    });
};
