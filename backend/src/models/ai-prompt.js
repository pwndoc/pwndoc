var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AiPromptSchema = new Schema({
    entityType: {type: String, required: true, default: 'finding', enum: ['finding', 'section']},
    fieldKey: {type: String, required: true},
    fieldLabel: {type: String, required: true},
    outputType: {type: String, required: true, enum: ['html', 'text', 'array']},
    enabled: {type: Boolean, default: true},
    prompt: {type: String, default: ''},
    customFieldId: {type: Schema.Types.ObjectId, required: false, default: null}
}, {timestamps: true, strict: true});

AiPromptSchema.index({entityType: 1, fieldKey: 1}, {
    name: 'unique_entity_field_key',
    unique: true
});

AiPromptSchema.statics.backup = (path) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs');

        function exportAiPromptsPromise() {
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(`${path}/aiPrompts.json`);
                writeStream.write('[');

                let prompts = AiPrompt.find().cursor();
                let isFirst = true;

                prompts.eachAsync(async (document) => {
                    if (!isFirst) {
                        writeStream.write(',');
                    } else {
                        isFirst = false;
                    }
                    writeStream.write(JSON.stringify(document, null, 2));
                    return Promise.resolve();
                })
                .then(() => {
                    writeStream.write(']');
                    writeStream.end();
                })
                .catch((error) => {
                    reject(error);
                });

                writeStream.on('finish', () => {
                    resolve('ok');
                });

                writeStream.on('error', (error) => {
                    reject(error);
                });
            });
        }

        try {
            await exportAiPromptsPromise();
            resolve();
        }
        catch (error) {
            reject({error: error, model: 'AiPrompt'});
        }
    });
}

AiPromptSchema.statics.restore = (path, mode = 'upsert') => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs');

        function importAiPromptsPromise() {
            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(`${path}/aiPrompts.json`);
                const JSONStream = require('JSONStream');

                let jsonStream = JSONStream.parse('*');
                readStream.pipe(jsonStream);

                readStream.on('error', (error) => {
                    if (error.code === 'ENOENT') {
                        resolve();
                        return;
                    }
                    reject(error);
                });

                jsonStream.on('data', async (document) => {
                    AiPrompt.findOneAndReplace(
                        {entityType: document.entityType, fieldKey: document.fieldKey},
                        document,
                        {upsert: true}
                    )
                    .catch((err) => {
                        console.log(err);
                        reject(err);
                    });
                });
                jsonStream.on('end', () => {
                    resolve();
                });
                jsonStream.on('error', (error) => {
                    reject(error);
                });
            });
        }

        try {
            if (mode === 'revert')
                await AiPrompt.deleteMany();
            await importAiPromptsPromise();
            resolve();
        }
        catch (error) {
            reject({error: error, model: 'AiPrompt'});
        }
    });
}

var AiPrompt = mongoose.model('AiPrompt', AiPromptSchema);
