const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const tar = require('tar-stream');
const {Writable} = require('stream');
const {pipeline} = require('stream/promises');
const {extractArchive, decryptArchive} = require('../src/lib/backup-archive');

describe('Backup archive IO', () => {
    let root;
    beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'pwndoc-backup-test-')); });
    afterEach(() => { jest.restoreAllMocks(); fs.rmSync(root, {recursive: true, force: true}); });
    const password = 'synthetic-test-password';
    const encrypt = bytes => {
        // Fixed fixture salt makes the wrong-password padding failure deterministic.
        const salt = Buffer.from('testSalt');
        const secret = crypto.pbkdf2Sync(password, salt, 10000, 48, 'sha256');
        const cipher = crypto.createCipheriv('aes-256-cbc', secret.subarray(0, 32), secret.subarray(32));
        return Buffer.concat([Buffer.from('Salted__'), salt, cipher.update(bytes), cipher.final()]);
    };
    async function archive(entries) {
        const filename = path.join(root, 'backup.tar.gz');
        const pack = tar.pack();
        const writing = pipeline(pack, zlib.createGzip(), fs.createWriteStream(filename));
        for (const [name, bytes] of entries) pack.entry({name}, bytes);
        pack.finalize(); await writing; return filename;
    }
    it('waits for delayed destination writes before starting encrypted restoration', async () => {
        const plaintext = zlib.gzipSync(Buffer.from('synthetic audit'));
        const encrypted = encrypt(plaintext);
        const filename = await archive([['backup.json', '{}'], ['data.tar.gz.enc', encrypted]]);
        const original = fs.createWriteStream;
        let finished = false;
        jest.spyOn(fs, 'createWriteStream').mockImplementation((destination, options) => {
            if (!destination.endsWith('.enc')) return original(destination, options);
            const chunks = [];
            return new Writable({
                write(chunk, encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); },
                final(callback) { setTimeout(() => { fs.writeFileSync(destination, Buffer.concat(chunks)); finished = true; callback(); }, 50); }
            });
        });
        await extractArchive(filename, root, ['data.tar.gz.enc'], () => true);
        expect(finished).toBe(true);
        const output = path.join(root, 'decrypted');
        await decryptArchive(path.join(root, 'data.tar.gz.enc'), output, password);
        expect(fs.readFileSync(output)).toEqual(plaintext);
    });
    it('restores an unencrypted archive and ignores unselected entries', async () => {
        const filename = await archive([['ignored.txt', 'ignored'], ['audits.json', '[]']]);
        await extractArchive(filename, root, ['audits.json'], () => true);
        expect(fs.readFileSync(path.join(root, 'audits.json'), 'utf8')).toBe('[]');
        expect(fs.existsSync(path.join(root, 'ignored.txt'))).toBe(false);
    });
    it('rejects destination write failures and missing selected files', async () => {
        const filename = await archive([['audits.json', '[]']]);
        await expect(extractArchive(filename, path.join(root, 'absent'), ['audits.json'], () => true)).rejects.toThrow();
        await expect(extractArchive(filename, root, ['missing.json'], () => true)).rejects.toThrow();
    });
    it.each(['empty', 'short', 'invalid-header', 'truncated', 'wrong-password', 'missing'])('rejects %s encrypted input rather than remaining pending', async scenario => {
        const filename = path.join(root, 'input.enc');
        let bytes = encrypt(Buffer.from('synthetic audit'));
        if (scenario === 'empty') bytes = Buffer.alloc(0);
        if (scenario === 'short') bytes = bytes.subarray(0, 8);
        if (scenario === 'invalid-header') bytes.fill(0, 0, 8);
        if (scenario === 'truncated') bytes = bytes.subarray(0, bytes.length - 1);
        if (scenario !== 'missing') fs.writeFileSync(filename, bytes);
        await expect(decryptArchive(filename, path.join(root, 'out'), scenario === 'wrong-password' ? 'wrong' : password)).rejects.toMatchObject({fn: 'BadParameters'});
    });
});
