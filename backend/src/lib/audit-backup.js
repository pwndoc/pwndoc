const {Readable} = require('stream');
const {pipeline} = require('stream/promises');

const imageFields = [
    'description', 'observation', 'poc', 'remediation', 'retestDescription'
];

// Keep only unique IDs, not the HTML or a Cartesian product of nested fields.
async function collectImageIds(audits) {
    const ids = new Set();
    const regex = /img src=["']([0-9a-f]{24})["']/g;
    const addText = text => {
        if (typeof text !== 'string') return;
        for (const match of text.matchAll(regex)) ids.add(match[1]);
    };
    const addCustomFields = fields => {
        for (const field of fields || []) addText(field?.text);
    };

    for await (const audit of audits) {
        addCustomFields(audit.customFields);
        for (const section of audit.sections || []) addCustomFields(section?.customFields);
        for (const finding of audit.findings || []) {
            if (!finding) continue;
            for (const field of imageFields) addText(finding[field]);
            addCustomFields(finding.customFields);
        }
    }
    return [...ids];
}

// pipeline applies destination backpressure and propagates read/write errors.
async function writeJsonArray(documents, destination) {
    async function* serialize() {
        yield '[';
        let first = true;
        for await (const document of documents) {
            if (!first) yield ',';
            first = false;
            yield JSON.stringify(document, null, 2);
        }
        yield ']';
    }
    await pipeline(Readable.from(serialize(), {objectMode: false}), destination);
}

module.exports = {collectImageIds, writeJsonArray};
