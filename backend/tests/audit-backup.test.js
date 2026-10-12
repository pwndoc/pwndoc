const fs = require('fs');
const os = require('os');
const path = require('path');
const {Writable} = require('stream');
const {collectImageIds, writeJsonArray} = require('../src/lib/audit-backup');
const Audit = require('../src/models/audit');
// The image module initializes indexes on load; unit tests use no database.
jest.spyOn(require('mongoose').Model, 'syncIndexes').mockResolvedValue();
const Image = require('../src/models/image');

const id = n => n.toString(16).padStart(24, '0');
const html = n => `<p><img src="${id(n)}"></p>`;

describe('Audit backup image references', () => {
    afterEach(() => jest.restoreAllMocks());

    it('collects every supported rich-text location without requiring other arrays', async () => {
        const audits = [
            {customFields: [{text: html(1)}]},
            {sections: [{customFields: [{text: html(2)}]}]},
            ...['description', 'observation', 'poc', 'remediation', 'retestDescription']
                .map((field, i) => ({findings: [{[field]: html(i + 3)}]})),
            {findings: [{customFields: [{text: html(8)}]}]}
        ];
        expect(await collectImageIds(audits)).toEqual(Array.from({length: 8}, (_, i) => id(i + 1)));
    });

    it('deduplicates multiple matches across fields, findings and audits', async () => {
        const text = `${html(1)}<img src='${id(2)}'>${html(1)}`;
        expect(await collectImageIds([
            {customFields: [{text}], findings: [{poc: text}]},
            {sections: [{customFields: [{text}]}]}
        ])).toEqual([id(1), id(2)]);
    });

    it('ignores non-string custom values and invalid image references', async () => {
        const audits = [{customFields: [null, {}, {text: null}, {text: 42},
            {text: true}, {text: [html(1)]}, {text: {value: html(1)}},
            {text: '<img src="https://example.com/image.png"><img src="123">'}],
            sections: [null, {}], findings: [null, {}]}];
        expect(await collectImageIds(audits)).toEqual([]);
        expect(await collectImageIds([])).toEqual([]);
    });

    it('handles many independent nested fields without multiplying combinations', async () => {
        let reads = 0;
        const field = () => ({get text() { reads++; return html(1); }});
        const audit = {
            customFields: Array.from({length: 40}, field),
            sections: Array.from({length: 20}, () => ({customFields: Array.from({length: 30}, field)})),
            findings: Array.from({length: 50}, () => ({poc: html(2), customFields: Array.from({length: 40}, field)}))
        };
        expect(await collectImageIds([audit])).toEqual([id(1), id(2)]);
        expect(reads).toBe(40 + 20 * 30 + 50 * 40);
    });

    it('propagates cursor read failures', async () => {
        async function* audits() { yield {customFields: [{text: html(1)}]}; throw Error('read failed'); }
        await expect(collectImageIds(audits())).rejects.toThrow('read failed');
    });

    it.each([{ids: []}, {ids: [id(1)]}])('uses an ID-filtered projected lean cursor for $ids', async ({ids}) => {
        const query = {select: jest.fn().mockReturnThis(), lean: jest.fn().mockReturnThis(),
            cursor: jest.fn().mockReturnValue([{customFields: [{text: html(2)}]}])};
        jest.spyOn(Audit, 'find').mockReturnValue(query);
        const aggregate = jest.spyOn(Audit, 'aggregate');
        expect(await Audit.getAuditsImages(ids)).toEqual([id(2)]);
        expect(Audit.find.mock.calls[0][0]).toEqual(ids.length ? {_id: {$in: ids.map(value => expect.objectContaining({toHexString: expect.any(Function)}))}} : {});
        if (ids.length) expect(Audit.find.mock.calls[0][0]._id.$in[0].toHexString()).toBe(ids[0]);
        expect(query.select).toHaveBeenCalledWith('customFields.text sections.customFields.text findings.description findings.observation findings.poc findings.remediation findings.retestDescription findings.customFields.text');
        expect(query.lean).toHaveBeenCalled();
        expect(query.cursor).toHaveBeenCalledWith({batchSize: 10});
        expect(aggregate).not.toHaveBeenCalled();
    });

    it('rejects invalid audit IDs before querying the database', async () => {
        const find = jest.spyOn(Audit, 'find');
        await expect(Audit.getAuditsImages(['invalid'])).rejects.toThrow();
        expect(find).not.toHaveBeenCalled();
    });
});

describe('Streaming audit backup exports', () => {
    let root;
    beforeEach(() => {root = fs.mkdtempSync(path.join(os.tmpdir(), 'pwndoc-audit-backup-'));});
    afterEach(() => {jest.restoreAllMocks(); fs.rmSync(root, {recursive: true, force: true});});

    it.each([{documents: []}, {documents: [{name: 'audit', customFields: [{text: 'é'}]}]}])('preserves the JSON array format for $documents', async ({documents}) => {
        const filename = path.join(root, 'export.json');
        await writeJsonArray(documents, fs.createWriteStream(filename));
        expect(fs.readFileSync(filename, 'utf8')).toBe(`[${documents.map(document => JSON.stringify(document, null, 2)).join(',')}]`);
    });

    it('does not read the entire cursor while the destination is blocked', async () => {
        let produced = 0, release, signal;
        const started = new Promise(resolve => {signal = resolve;});
        const destination = new Writable({highWaterMark: 1, write(chunk, encoding, callback) {
            if (!release) {release = callback; signal();} else callback();
        }});
        async function* documents() {
            for (let n = 0; n < 100; n++) {produced++; yield {value: 'x'.repeat(100000)};}
        }
        const writing = writeJsonArray(documents(), destination);
        await started;
        try {expect(produced).toBeLessThan(3);} finally {release();}
        await writing;
        expect(produced).toBe(100);
    });

    it('propagates destination failures and closes the document iterator', async () => {
        let closed = false;
        async function* documents() {
            try {while (true) yield {value: 'x'.repeat(100000)};} finally {closed = true;}
        }
        const destination = new Writable({write(chunk, encoding, callback) {
            callback(chunk.length > 1 ? Error('disk full') : null);
        }});
        await expect(writeJsonArray(documents(), destination)).rejects.toThrow('disk full');
        expect(closed).toBe(true);
    });

    it('propagates document cursor failures and destroys the destination', async () => {
        async function* documents() {yield {name: 'audit'}; throw Error('cursor failed');}
        const destination = new Writable({write(chunk, encoding, callback) {callback();}});
        await expect(writeJsonArray(documents(), destination)).rejects.toThrow('cursor failed');
        expect(destination.destroyed).toBe(true);
    });

    it('exports selected audits and only their referenced image documents', async () => {
        const audits = [{_id: id(1), customFields: [{text: html(2)}]}];
        const images = [{_id: id(2), value: 'synthetic-base64'}];
        jest.spyOn(Audit, 'find').mockReturnValue({cursor: () => audits});
        jest.spyOn(Audit, 'getAuditsImages').mockResolvedValue([id(2)]);
        jest.spyOn(Image, 'find').mockReturnValue({cursor: () => images});
        await Audit.backup(root, [id(1)]);
        expect(Audit.find).toHaveBeenCalledWith({_id: {$in: [id(1)]}});
        expect(Audit.getAuditsImages).toHaveBeenCalledWith([id(1)]);
        expect(Image.find).toHaveBeenCalledWith({_id: {$in: [id(2)]}});
        expect(JSON.parse(fs.readFileSync(path.join(root, 'audits.json')))).toEqual(audits);
        expect(JSON.parse(fs.readFileSync(path.join(root, 'audits-images.json')))).toEqual(images);
    });

    it('rejects image discovery errors instead of leaving the backup pending', async () => {
        jest.spyOn(Audit, 'find').mockReturnValue({cursor: () => []});
        const error = Error('image cursor failed');
        jest.spyOn(Audit, 'getAuditsImages').mockRejectedValue(error);
        await expect(Audit.backup(root)).rejects.toEqual({error, model: 'Audit'});
    });
});
