const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');

// Opt-in, disposable database only. Never use an application database here.
const uri = process.env.PWNDOC_BACKUP_TEST_MONGODB_URI;
const describeMongo = uri ? describe : describe.skip;

describeMongo('Audit backup with MongoDB', () => {
    let Audit, Image, root, ownedDatabase = false;
    const ids = Array.from({length: 10}, () => new mongoose.Types.ObjectId());
    const auditIds = Array.from({length: 8}, () => new mongoose.Types.ObjectId());
    const html = n => `<img src="${ids[n]}">`;
    const locations = [
        {customFields: [{text: html(0)}]},
        {sections: [{customFields: [{text: html(1)}]}]},
        ...['description', 'observation', 'poc', 'remediation', 'retestDescription']
            .map((field, i) => ({findings: [{[field]: html(i + 2)}]})),
        {findings: [{customFields: [{text: `${html(7)}${html(7)}`}]}]}
    ];

    beforeAll(async () => {
        const database = new URL(uri).pathname.slice(1);
        if (!/^pwndoc_backup_test_[a-z0-9_]+$/.test(database))
            throw Error('Use a disposable pwndoc_backup_test_* database');
        await mongoose.connect(uri);
        if ((await mongoose.connection.db.listCollections().toArray()).length)
            throw Error('Test database must be empty');
        ownedDatabase = true;
        Audit = require('../src/models/audit');
        Image = require('../src/models/image');
        await Image.init();
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'pwndoc-audit-backup-mongo-'));
    });
    beforeEach(async () => {
        await Audit.deleteMany({});
        await Image.deleteMany({});
        await Audit.collection.insertMany(locations.map((location, i) => ({
            _id: auditIds[i], name: `Synthetic audit ${i}`, language: 'en', ...location
        })));
        await Image.collection.insertMany(ids.map((imageId, i) => ({
            _id: imageId, name: `Synthetic image ${i}`, value: `synthetic-value-${i}`
        })));
    });
    afterAll(async () => {
        if (ownedDatabase) await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        if (root) fs.rmSync(root, {recursive: true, force: true});
    });

    it('finds images in all locations, including audits with missing nested arrays', async () => {
        expect(new Set(await Audit.getAuditsImages())).toEqual(new Set(ids.slice(0, 8).map(String)));
    });

    it('restricts image extraction and exports to the selected audit IDs', async () => {
        expect(await Audit.getAuditsImages([String(auditIds[0])])).toEqual([String(ids[0])]);
        expect(await Audit.getAuditsImages([new mongoose.Types.ObjectId()])).toEqual([]);
        await Audit.backup(root, [String(auditIds[0])]);
        const audits = JSON.parse(fs.readFileSync(path.join(root, 'audits.json')));
        const images = JSON.parse(fs.readFileSync(path.join(root, 'audits-images.json')));
        expect(audits.map(audit => audit._id)).toEqual([String(auditIds[0])]);
        expect(images.map(image => image._id)).toEqual([String(ids[0])]);
    });

    it('restores the existing JSON format with all referenced images, excluding orphans', async () => {
        await Audit.backup(root);
        const expectedAudits = JSON.parse(fs.readFileSync(path.join(root, 'audits.json')));
        const expectedImages = JSON.parse(fs.readFileSync(path.join(root, 'audits-images.json')));
        expect(expectedImages).toHaveLength(8);
        await Audit.deleteMany({});
        await Image.deleteMany({});
        await Audit.restore(root);
        expect(await Audit.countDocuments()).toBe(8);
        expect(await Image.countDocuments()).toBe(8);
        for (const expected of expectedAudits) {
            const actual = await Audit.findById(expected._id).lean();
            expect(actual.name).toBe(expected.name);
            expect(actual.language).toBe(expected.language);
        }
        for (const expected of expectedImages)
            expect((await Image.findById(expected._id).lean()).value).toBe(expected.value);
        expect(new Set(await Audit.getAuditsImages())).toEqual(new Set(ids.slice(0, 8).map(String)));
    });
});
