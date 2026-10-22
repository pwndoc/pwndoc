// Standalone integration suite: use only a disposable MongoDB database.
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const net = require('node:net');

const uri = process.env.AUDIT_FILE_TEST_URI;
if (!uri || !/\/pwndoc-files-test(?:\?|$)/.test(uri))
    throw new Error('Set AUDIT_FILE_TEST_URI to a disposable database named pwndoc-files-test');
global.__basedir = path.resolve(__dirname, '../src');
mongoose.connect(uri);
require('../src/models/user');
require('../src/models/role');
require('../src/models/audit');
require('../src/models/audit-type');
require('../src/models/custom-field');
require('../src/models/custom-section');
require('../src/models/image');
require('../src/models/settings');
const File = require('../src/models/audit-file');
const Audit = mongoose.model('Audit');
const Settings = mongoose.model('Settings');
const { acl, jwtSecret } = require('../src/lib/auth');
const app = express();
app.use(require('cookie-parser')());
app.use(express.json());
require('../src/routes/audit-file')(app);
for (const model of ['ai-prompt', 'language', 'client', 'company', 'template', 'vulnerability',
    'vulnerability-category', 'vulnerability-type', 'vulnerability-update']) require(`../src/models/${model}`);
const backupRoot = require('node:fs').mkdtempSync(path.join(os.tmpdir(), 'pwndoc-file-backup-api-'));
global.__basedir = path.join(backupRoot, 'src');
require('node:fs').mkdirSync(global.__basedir);
require('../src/routes/backup')(app);
global.__basedir = path.resolve(__dirname, '../src');
const ids = Object.fromEntries(['author', 'collaborator', 'reviewer', 'outsider', 'reader', 'writer'].map(name => [name, new mongoose.Types.ObjectId()]));
const tokens = {};
let audit;
let other;

function as(call, name = 'author') { return call.set('Cookie', `token=JWT ${tokens[name]}`); }
function upload(bytes = Buffer.from('example'), name = 'evidence.bin', actor = 'author', auditId = audit._id) {
    return as(request(app).post(`/api/audits/${auditId}/files`), actor)
        .set('Content-Type', 'application/octet-stream').set('X-File-Name', encodeURIComponent(name)).send(bytes);
}
function download(file, actor = 'author', auditId = audit._id) {
    return as(request(app).get(`/api/audits/${auditId}/files/${file._id}/download`), actor);
}
function remove(file, actor = 'author', auditId = audit._id) {
    return as(request(app).delete(`/api/audits/${auditId}/files/${file._id}`), actor);
}
async function settings(enabled) {
    await Settings.updateOne({}, { $set: { 'reviews.enabled': enabled } });
}

beforeAll(async () => {
    await mongoose.connection.asPromise();
    // The settings model initializes itself on import; wait for that operation
    // instead of racing it with a second initialization.
    await Settings.init();
    for (let attempt = 0; !await Settings.exists({}); attempt++) {
        if (attempt > 100) throw new Error('Settings initialization timed out');
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    acl.roles.fileReader = { allows: ['audits:read', 'audits:read-all'] };
    acl.roles.fileWriter = { allows: ['audits:read', 'audits:update', 'audits:read-all', 'audits:update-all'] };
    for (const name of Object.keys(ids)) {
        const roles = name === 'reader' ? ['fileReader'] : name === 'writer' ? ['fileWriter'] : ['user'];
        tokens[name] = jwt.sign({ id: String(ids[name]), username: name, roles, permissions: acl.getRoles(roles) }, jwtSecret);
    }
});

beforeEach(async () => {
    delete process.env.AUDIT_FILES_CLAMAV_HOST;
    delete process.env.AUDIT_FILES_CLAMAV_PORT;
    delete process.env.AUDIT_FILES_MAX_COUNT;
    delete process.env.AUDIT_FILES_MAX_FILE_BYTES;
    delete process.env.AUDIT_FILES_MAX_AUDIT_BYTES;
    for (const name of ['audits', 'auditfiles', 'auditFileBlobs.files', 'auditFileBlobs.chunks'])
        await mongoose.connection.db.collection(name).deleteMany({});
    await settings(false);
    audit = await new Audit({ name: 'Files audit', language: 'en', creator: ids.author,
        collaborators: [ids.collaborator], reviewers: [ids.reviewer] }).save();
    other = await new Audit({ name: 'Other audit', language: 'en', creator: ids.outsider }).save();
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await fs.rm(backupRoot, { recursive: true, force: true });
});

describe('Audit file storage and authorization', () => {
    test('requires authentication and rejects invalid audit IDs', async () => {
        expect((await request(app).get(`/api/audits/${audit._id}/files`)).status).toBe(401);
        expect((await as(request(app).get('/api/audits/not-an-id/files'))).status).toBe(422);
    });

    test.each(['report.pdf', 'spreadsheet.xlsx', 'archive.zip', 'scan.xml', 'script.html', 'payload.exe', 'no-extension', 'preuve-é漢字.dat'])(
        'preserves arbitrary binary content for %s', async name => {
            const bytes = Buffer.from([0, 255, 13, 10, 0, 128, 42]);
            const response = await upload(bytes, name);
            expect(response.status).toBe(201);
            const file = response.body.datas;
            expect(file).toMatchObject({ name, size: bytes.length, scanStatus: 'not-scanned', uploadedByName: 'author' });
            expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
            expect(file.blobId).toBeUndefined();
            const result = await download(file);
            expect(result.status).toBe(200);
            expect(result.body).toEqual(bytes);
            expect(result.headers['content-type']).toBe('application/octet-stream');
            expect(result.headers['content-disposition']).toMatch(/^attachment;/);
            expect(result.headers['x-content-type-options']).toBe('nosniff');
            expect(result.headers['cache-control']).toBe('private, no-store');
            const head = await as(request(app).head(`/api/audits/${audit._id}/files/${file._id}/download`));
            expect(head.status).toBe(200);
            expect(Number(head.headers['content-length'])).toBe(bytes.length);
            expect(head.text).toBeUndefined();
        });

    test('supports empty files, duplicate filenames and safe Unicode names', async () => {
        expect((await upload(Buffer.alloc(0), 'empty.txt')).status).toBe(201);
        expect((await upload(Buffer.from('first'), 'same.txt')).status).toBe(201);
        expect((await upload(Buffer.from('second'), 'same.txt')).status).toBe(201);
        expect(await File.countDocuments()).toBe(3);
    });

    test('strips path components and control characters from names', async () => {
        const response = await upload(Buffer.from('test'), '..\\..\\dir/name\r\n.html');
        expect(response.status).toBe(201);
        expect(response.body.datas.name).toBe('name.html');
        for (const name of ['', '.', '..', 'a'.repeat(256)]) expect((await upload(Buffer.alloc(0), name)).status).toBe(422);
    });

    test('requires raw binary requests and a valid encoded filename', async () => {
        expect((await as(request(app).post(`/api/audits/${audit._id}/files`)).send({ data: 'test' })).status).toBe(415);
        expect((await as(request(app).post(`/api/audits/${audit._id}/files`))
            .set('Content-Type', 'application/octet-stream').set('X-File-Name', '%not-encoded').send('test')).status).toBe(422);
    });

    test('permits audit readers to download and editors to upload or delete', async () => {
        const file = (await upload()).body.datas;
        for (const actor of ['author', 'collaborator', 'reviewer', 'reader', 'writer']) {
            expect((await download(file, actor)).status).toBe(200);
            expect((await as(request(app).get(`/api/audits/${audit._id}/files`), actor)).status).toBe(200);
        }
        for (const actor of ['reviewer', 'reader', 'outsider']) {
            expect((await upload(Buffer.from('no'), 'blocked', actor)).status).toBeGreaterThanOrEqual(400);
            expect((await remove(file, actor)).status).toBeGreaterThanOrEqual(400);
        }
        for (const actor of ['collaborator', 'writer']) {
            const created = await upload(Buffer.from('yes'), 'allowed', actor);
            expect(created.status).toBe(201);
            expect((await remove(created.body.datas, actor)).status).toBe(200);
        }
    });

    test('blocks cross-audit downloads, listing and deletion, even with a known file ID', async () => {
        const file = (await upload()).body.datas;
        expect((await download(file, 'outsider')).status).toBe(404);
        expect((await as(request(app).get(`/api/audits/${audit._id}/files`), 'outsider')).status).toBe(404);
        expect((await download(file, 'outsider', other._id)).status).toBe(404);
        expect((await remove(file, 'outsider', other._id)).status).toBe(404);
        expect((await download({ _id: 'invalid' })).status).toBe(422);
    });

    test.each(['REVIEW', 'APPROVED'])('keeps %s audits downloadable and blocks mutations when reviews are enabled', async state => {
        const file = (await upload()).body.datas;
        await settings(true);
        await Audit.updateOne({ _id: audit._id }, { $set: { state } });
        expect((await upload()).status).toBe(403);
        expect((await remove(file, 'writer')).status).toBe(403);
        expect((await download(file)).status).toBe(200);
    });

    test('enforces size, total bytes and count quotas, including simultaneous uploads', async () => {
        process.env.AUDIT_FILES_MAX_FILE_BYTES = '8';
        process.env.AUDIT_FILES_MAX_AUDIT_BYTES = '10';
        process.env.AUDIT_FILES_MAX_COUNT = '2';
        expect((await upload(Buffer.alloc(9))).status).toBe(413);
        const first = (await upload(Buffer.alloc(6))).body.datas;
        expect((await upload(Buffer.alloc(5))).status).toBe(422);
        const second = await upload(Buffer.alloc(4));
        expect(second.status).toBe(201);
        expect((await upload(Buffer.alloc(0))).status).toBe(422);
        await remove(first);
        await remove(second.body.datas);
        process.env.AUDIT_FILES_MAX_COUNT = '1';
        const responses = await Promise.all([upload(), upload()]);
        expect(responses.filter(response => response.status === 201)).toHaveLength(1);
        expect(await File.countDocuments()).toBe(1);
        expect(await File.usage(audit._id)).toEqual({ count: 1, bytes: 7 });
    });

    test('keeps file operations available when the audit type hides the menu entry', async () => {
        const Type = mongoose.model('AuditType');
        const type = await new Type({ name: 'Files Hidden', stage: 'default', hidden: ['files'] }).save();
        try {
            await Audit.updateOne({ _id: audit._id }, { $set: { auditType: type.name } });
            const created = await upload();
            expect(created.status).toBe(201);
            expect((await as(request(app).get(`/api/audits/${audit._id}/files`))).body.datas.files).toHaveLength(1);
            expect((await download(created.body.datas)).status).toBe(200);
            expect((await remove(created.body.datas)).status).toBe(200);
        } finally { await Type.deleteOne({ _id: type._id }); }
    });

    test('deletes content and metadata with the owning audit', async () => {
        const file = (await upload()).body.datas;
        await Audit.delete(false, audit._id, ids.author);
        expect(await File.countDocuments({ auditId: audit._id })).toBe(0);
        expect(await mongoose.connection.db.collection('auditFileBlobs.chunks').countDocuments()).toBe(0);
        expect((await download(file, 'reader')).status).toBe(404);
    });

    test('does not copy files into a retest', async () => {
        await new (mongoose.model('AuditType'))({ name: 'File retest', templates: [], sections: [] }).save();
        await upload();
        const retest = await Audit.createRetest(true, audit._id, ids.author, 'File retest');
        expect(await File.countDocuments({ auditId: retest._id })).toBe(0);
        expect(await File.countDocuments({ auditId: audit._id })).toBe(1);
        await mongoose.model('AuditType').deleteMany({ name: 'File retest' });
    });

    test('hides pending files and cleans abandoned uploads and their chunks', async () => {
        const id = new mongoose.Types.ObjectId();
        await File.reserve(audit._id, { _id: id, blobId: id, name: 'pending', size: 7,
            uploadedBy: ids.author, uploadedByName: 'author' });
        const response = await as(request(app).get(`/api/audits/${audit._id}/files`));
        expect(response.body.datas.files).toEqual([]);
        expect(response.body.datas.usage).toEqual({ bytes: 7, count: 1 });
        expect((await download({ _id: id })).status).toBe(404);
        await mongoose.connection.db.collection('auditFileBlobs.chunks').insertOne({ files_id: id, n: 0, data: Buffer.from('pending') });
        await File.collection.updateOne({ _id: id }, { $set: { updatedAt: new Date(0) } });
        await File.cleanupIncomplete();
        expect(await File.countDocuments()).toBe(0);
        expect(await mongoose.connection.db.collection('auditFileBlobs.chunks').countDocuments()).toBe(0);
    });

    test('removes incomplete content when a stream fails integrity validation', async () => {
        const { pipeline } = require('node:stream/promises');
        const id = new mongoose.Types.ObjectId();
        await expect(pipeline(Readable.from(Buffer.from('short')), File.digestStream(10),
            File.bucket().openUploadStreamWithId(id, 'failed'))).rejects.toThrow('integrity');
        await File.deleteBlob(id);
        expect(await File.bucket().find({ _id: id }).hasNext()).toBe(false);
    });

    test('cleans content and quota reservations after a client disconnects', async () => {
        const http = require('node:http');
        const server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        try {
            const req = http.request({ host: '127.0.0.1', port: server.address().port,
                path: `/api/audits/${audit._id}/files`, method: 'POST', headers: {
                    Cookie: `token=JWT ${tokens.author}`, 'Content-Type': 'application/octet-stream',
                    'Content-Length': '100', 'X-File-Name': 'interrupted.bin'
                } });
            req.on('error', () => {});
            req.write(Buffer.alloc(5));
            for (let attempt = 0; !await File.exists({ state: 'uploading' }); attempt++) {
                if (attempt > 100) throw new Error('Upload did not reserve storage');
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            req.destroy();
            for (let attempt = 0; await File.exists({}); attempt++) {
                if (attempt > 100) throw new Error('Interrupted upload was not removed');
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            expect(await mongoose.connection.db.collection('auditFileBlobs.chunks').countDocuments()).toBe(0);
            expect(await File.usage(audit._id)).toEqual({ count: 0, bytes: 0 });
        } finally { await new Promise(resolve => server.close(resolve)); }
    });

    test('recovers orphaned files after a crash during audit deletion', async () => {
        await upload();
        await Audit.deleteOne({ _id: audit._id }); // Simulate a crash before file cleanup.
        await File.cleanupIncomplete();
        expect(await File.countDocuments()).toBe(0);
        expect(await mongoose.connection.db.collection('auditFileBlobs.files').countDocuments()).toBe(0);
    });
});

describe('Audit file backup and scanning', () => {
    test('fails closed when the configured scanner is unavailable', async () => {
        const server = net.createServer();
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const port = server.address().port;
        await new Promise(resolve => server.close(resolve));
        process.env.AUDIT_FILES_CLAMAV_HOST = '127.0.0.1';
        process.env.AUDIT_FILES_CLAMAV_PORT = String(port);
        expect((await upload()).status).toBe(500);
        expect(await File.countDocuments()).toBe(0);
        expect(await mongoose.connection.db.collection('auditFileBlobs.files').countDocuments()).toBe(0);
    });
    test.each([undefined, 'backup-password'])('round trips the native backup API (password: %s)', async password => {
        const token = jwt.sign({ id: String(ids.author), username: 'file-admin', roles: ['admin'], permissions: '*' }, jwtSecret);
        const call = (method, url) => request(app)[method](url).set('Cookie', `token=JWT ${token}`);
        const waitIdle = async () => {
            for (let attempt = 0; attempt < 100; attempt++) {
                const status = await call('get', '/api/backups/status');
                if (status.body.datas.operation === 'idle') {
                    expect(status.body.datas.message).toBe('');
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            throw new Error('Backup API did not finish');
        };
        const file = (await upload(Buffer.from('native backup'), 'native.zip')).body.datas;
        expect((await call('post', '/api/backups').send({ data: ['Audits'], password, name: 'file-backup' })).status).toBe(200);
        await waitIdle();
        const list = await call('get', '/api/backups');
        const backup = list.body.datas.find(entry => entry.name === 'file-backup');
        expect(backup.auditFilesVersion).toBe(1);
        await remove(file);
        expect((await call('post', `/api/backups/${backup.slug}/restore`).send({ data: ['Audits'], password })).status).toBe(200);
        await waitIdle();
        expect((await download(file)).body.toString()).toBe('native backup');
        await call('delete', `/api/backups/${backup.slug}`);
    });

    test('backs up and restores original bytes, metadata and identifiers, and detects corruption', async () => {
        const file = (await upload(Buffer.from([0, 255, 10, 11]), 'preuve.zip')).body.datas;
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pwndoc-files-'));
        try {
            await Audit.backup(directory, [audit._id]);
            await remove(file);
            await Audit.restore(directory);
            const result = await download(file);
            expect(result.status).toBe(200);
            expect(result.body).toEqual(Buffer.from([0, 255, 10, 11]));
            expect((await File.findById(file._id)).sha256).toBe(file.sha256);
            await Audit.restore(directory); // Upsert restores do not duplicate files or blobs.
            expect(await File.countDocuments()).toBe(1);
            expect(await mongoose.connection.db.collection('auditFileBlobs.files').countDocuments()).toBe(1);
            await fs.writeFile(path.join(directory, 'audit-files', file._id), 'corrupt');
            await expect(File.restore(directory)).rejects.toThrow();
            expect((await download(file)).body).toEqual(Buffer.from([0, 255, 10, 11]));
            expect(await mongoose.connection.db.collection('auditFileBlobs.files').countDocuments()).toBe(1);
            await fs.unlink(path.join(directory, 'audits-files.json'));
            await expect(Audit.restore(directory)).resolves.toBeUndefined(); // Legacy archive.
        } finally { await fs.rm(directory, { recursive: true, force: true }); }
    });

    test('supports revert and removes files absent from the restored snapshot', async () => {
        const first = (await upload()).body.datas;
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pwndoc-files-'));
        try {
            await Audit.backup(directory);
            const extra = (await upload(Buffer.from('extra'))).body.datas;
            await Audit.restore(directory, 'revert');
            expect((await download(first)).status).toBe(200);
            expect((await download(extra)).status).toBe(404);
        } finally { await fs.rm(directory, { recursive: true, force: true }); }
    });

    test.each(['stream: OK\0', 'stream: Eicar-Test-Signature FOUND\0', 'stream: scanner ERROR\0'])(
        'honors configured ClamAV response %s and never exposes failed scans', async reply => {
            let received = Buffer.alloc(0);
            const server = net.createServer(socket => {
                let buffer = Buffer.alloc(0);
                let command = false;
                socket.on('data', data => {
                    buffer = Buffer.concat([buffer, data]);
                    if (!command) {
                        if (buffer.length < 10) return;
                        expect(buffer.subarray(0, 10).toString()).toBe('zINSTREAM\0');
                        command = true;
                        buffer = buffer.subarray(10);
                    }
                    while (buffer.length >= 4) {
                        const length = buffer.readUInt32BE();
                        if (buffer.length < length + 4) return;
                        received = Buffer.concat([received, buffer.subarray(4, length + 4)]);
                        buffer = buffer.subarray(length + 4);
                        if (!length) { socket.end(reply); return; }
                    }
                });
            });
            await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
            process.env.AUDIT_FILES_CLAMAV_HOST = '127.0.0.1';
            process.env.AUDIT_FILES_CLAMAV_PORT = String(server.address().port);
            try {
                const response = await upload(Buffer.from('scanner input'));
                expect(received.toString()).toBe('scanner input');
                if (reply === 'stream: OK\0') {
                    expect(response.status).toBe(201);
                    expect(response.body.datas.scanStatus).toBe('clean');
                } else {
                    expect(response.status).toBe(500);
                    expect(await File.countDocuments()).toBe(0);
                    expect(await mongoose.connection.db.collection('auditFileBlobs.files').countDocuments()).toBe(0);
                    expect(await mongoose.connection.db.collection('auditFileBlobs.chunks').countDocuments()).toBe(0);
                }
            } finally { await new Promise(resolve => server.close(resolve)); }
        });
});
