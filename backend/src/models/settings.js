var mongoose = require('mongoose');//.set('debug', true);
var Schema = mongoose.Schema;
var _ = require('lodash');
var Utils = require('../lib/utils.js');
const { AI_PROVIDERS, AI_DEFAULT_PROVIDER } = require('../lib/ai-prompts');

// https://stackoverflow.com/questions/25822289/what-is-the-best-way-to-store-color-hex-values-in-mongodb-mongoose
const colorValidator = (v) => (/^#([0-9a-f]{3}){1,2}$/i).test(v);

const SettingSchema = new Schema({
    report: { 
        enabled: {type: Boolean, default: true},
        public: {
            cvssColors: {
                noneColor: { type: String, default: "#4a86e8", validate: [colorValidator, 'Invalid color'] },
                lowColor: { type: String, default: "#008000", validate: [colorValidator, 'Invalid color'] },
                mediumColor: { type: String, default: "#f9a009", validate: [colorValidator, 'Invalid color'] },
                highColor: { type: String, default: "#fe0000", validate: [colorValidator, 'Invalid color'] },
                criticalColor: { type: String, default: "#212121", validate: [colorValidator, 'Invalid color'] }
            },
            captions: {
                type: [{type: String, unique: true}],
                default: ['Figure']
            },
            highlightWarning: { type: Boolean, default: false},
            highlightWarningColor: { type: String, default: "#ffff25", validate: [colorValidator, 'Invalid color']},
            requiredFields: {
                company: {type: Boolean, default: false},
                client: {type: Boolean, default: false},
                dateStart: {type: Boolean, default: false},
                dateEnd: {type: Boolean, default: false},
                dateReport: {type: Boolean, default: false},
                scope: {type: Boolean, default: false},
                findingType: {type: Boolean, default: false},
                findingDescription: {type: Boolean, default: false},
                findingObservation: {type: Boolean, default: false},
                findingReferences: {type: Boolean, default: false},
                findingProofs: {type: Boolean, default: false},
                findingAffected: {type: Boolean, default: false},
                findingRemediationDifficulty: {type: Boolean, default: false},
                findingPriority: {type: Boolean, default: false},
                findingRemediation: {type: Boolean, default: false},
            },
            scoringMethods: {
                CVSS3: { type: Boolean, default: true },
                CVSS4: { type: Boolean, default: false }
            },
            enableSpellCheck: {type: Boolean, default: false},
        },
        private: {
            imageBorder: { type: Boolean, default: false },
            imageBorderColor: { type: String, default: "#000000", validate: [colorValidator, 'Invalid color'] },
            languageToolUrl: { type: String, default: '' },
            languageToolApiKey: { type: String, default: '' },
            languageToolUsername: { type: String, default: '' },
        }
     },
    reviews: {
        enabled: { type: Boolean, default: false },
        public: {
            mandatoryReview: { type: Boolean, default: false },
            minReviewers: { type: Number, default: 1, min: 1, max: 100, validate: [Number.isInteger, 'Invalid integer'] },
            allowDraftExports: { type: Boolean, default: false },
            draftWatermark: {
                type: [{
                    _id: false,
                    locale: { type: String, required: true },
                    value: { type: String, default: '' }
                }],
                default: []
            }
        },
        private: {
            removeApprovalsUponUpdate: { type: Boolean, default: false }
        }
    },
    ai: {
        public: {
            enabled: {type: Boolean, default: false},
            defaultProvider: {type: String, enum: AI_PROVIDERS, default: AI_DEFAULT_PROVIDER},
            // Providers users may pick at generation/QA time. The default provider is always
            // implicitly allowed; an empty list therefore restricts users to the default only.
            allowedProviders: {type: [String], enum: AI_PROVIDERS, default: []},
            redactionGuidelines: {
                content: {type: String, default: ''}
            },
            qaInstructions: {
                content: {type: String, default: ''}
            },
            qaChecks: {
                completeness: {type: Boolean, default: true},
                references: {type: Boolean, default: true},
                imageCaptions: {type: Boolean, default: true},
                duplicates: {type: Boolean, default: true},
                aiDuplicates: {type: Boolean, default: true},
                aiUnlinkedTranslations: {type: Boolean, default: true},
                redaction: {type: Boolean, default: true},
                customer: {type: Boolean, default: true},
                instructions: {type: Boolean, default: true}
            },
            globalPrompts: [{
                _id: false,
                id: {type: String, required: true},
                label: {type: String, default: ''},
                prompt: {type: String, default: ''},
                enabled: {type: Boolean, default: true}
            }]
        },
        private: {
            openaiApiKey: {type: String, default: ''},
            openaiBaseUrl: {type: String, default: 'https://api.openai.com/v1'},
            openaiModel: {type: String, default: 'gpt-5.4-mini'},
            anthropicApiKey: {type: String, default: ''},
            anthropicBaseUrl: {type: String, default: 'https://api.anthropic.com/v1'},
            anthropicModel: {type: String, default: 'claude-opus-4-8'},
            anthropicVersion: {type: String, default: '2023-06-01'},
            deepseekApiKey: {type: String, default: ''},
            deepseekBaseUrl: {type: String, default: 'https://api.deepseek.com/v1'},
            deepseekModel: {type: String, default: 'deepseek-v4-flash'},
            ollamaApiKey: {type: String, default: ''},
            ollamaBaseUrl: {type: String, default: 'http://localhost:11434/v1'},
            ollamaModel: {type: String, default: 'llama3.1'},
            bedrockApiKey: {type: String, default: ''},
            bedrockAccessKeyId: {type: String, default: ''},
            bedrockSecretAccessKey: {type: String, default: ''},
            bedrockSessionToken: {type: String, default: ''},
            bedrockRegion: {type: String, default: 'us-east-1'},
            bedrockModel: {type: String, default: 'global.anthropic.claude-opus-4-8'}
        }
    }
}, {strict: true});

// Get all settings
SettingSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        const query = Settings.findOne({});
        query.select('-_id -__v');
        query.exec()
            .then(settings => {
                resolve(settings)
            })
            .catch(err => reject(err));
    });
};

// Get public settings
SettingSchema.statics.getPublic = () => {
    return new Promise((resolve, reject) => {
        const query = Settings.findOne({});
        // Model names are not secret (unlike keys/base URLs), so they are surfaced publicly to
        // label the provider selector. Keys and other private config stay out of the projection.
        const modelFields = AI_PROVIDERS.map(p => `ai.private.${p}Model`).join(' ');
        query.select(`-_id report.enabled report.public reviews.enabled reviews.public ai.public.enabled ai.public.defaultProvider ai.public.allowedProviders ai.public.qaChecks ai.public.globalPrompts ${modelFields}`);
        query.exec()
            .then(settings => {
                if (!settings) return resolve(settings);
                const obj = settings.toObject();
                // Reshape the selected model fields into a public map, then drop ai.private
                // entirely so no private subtree ever reaches non-admin clients.
                const providerModels = {};
                AI_PROVIDERS.forEach(p => {
                    const model = obj.ai?.private?.[`${p}Model`];
                    if (model) providerModels[p] = model;
                });
                if (obj.ai?.public) obj.ai.public.providerModels = providerModels;
                if (obj.ai) delete obj.ai.private;
                resolve(obj);
            })
            .catch(err => reject(err));
    });
};

// Update Settings
SettingSchema.statics.update = (settings) => {
    return new Promise((resolve, reject) => {
        Settings.findOne({})
            .then(current => {
                current.set(settings);
                return current.save();
            })
            .then(settings => resolve(settings))
            .catch(err => reject(err));
    });
};

// Ensure settings exist and sanitize obsolete fields
SettingSchema.statics.ensureInitialized = async function() {
    var liveSettings = await this.findOne({});

    if (!liveSettings) {
        console.log("Initializing Settings");
        liveSettings = await this.create({});
        return liveSettings;
    }

    var needUpdate = false
    var liveSettingsPaths = Utils.getObjectPaths(liveSettings.toObject())

    liveSettingsPaths.forEach(path => {
        if (!SettingSchema.path(path) && !path.startsWith('_')) {
            needUpdate = true
            _.set(liveSettings, path, undefined)
        }
    })

    if (!AI_PROVIDERS.includes(liveSettings?.ai?.public?.defaultProvider)) {
        needUpdate = true
        _.set(liveSettings, 'ai.public.defaultProvider', AI_DEFAULT_PROVIDER)
    }

    var allowedProviders = liveSettings?.ai?.public?.allowedProviders
    if (Array.isArray(allowedProviders)) {
        var sanitizedAllowed = [...new Set(allowedProviders.filter(p => AI_PROVIDERS.includes(p)))]
        if (sanitizedAllowed.length !== allowedProviders.length) {
            needUpdate = true
            _.set(liveSettings, 'ai.public.allowedProviders', sanitizedAllowed)
        }
    }

    if (typeof liveSettings?.ai?.public?.enabled !== 'boolean') {
        needUpdate = true
        _.set(liveSettings, 'ai.public.enabled', false)
    }

    if (needUpdate) {
        console.log("Removing unused fields from Settings")
        await liveSettings.save()
    }

    return liveSettings
};


// Restore settings to default
SettingSchema.statics.restoreDefaults = () => {
    return new Promise(async (resolve, reject) => {
        try {
            await Settings.deleteMany({})
            await Settings.ensureInitialized()
            resolve("Restored default settings.")
        }
        catch (err) {
            reject(err)
        }
    })
};

SettingSchema.statics.backup = (path) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function exportSettingsPromise() {
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(`${path}/settings.json`)
                writeStream.write('[')

                let settings = Settings.find().cursor()
                let isFirst = true

                settings.eachAsync(async (document) => {
                    if (!isFirst) {
                        writeStream.write(',')
                    } else {
                        isFirst = false
                    }
                    writeStream.write(JSON.stringify(document, null, 2))
                    return Promise.resolve()
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
            })
        }

        try {
            await exportSettingsPromise()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Settings'})
        }
            
    })
}

SettingSchema.statics.restore = (path) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')

        function importSettingsPromise () {
            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(`${path}/settings.json`)
                const JSONStream = require('JSONStream')
                const documents = []

                let jsonStream = JSONStream.parse('*')
                readStream.pipe(jsonStream)

                readStream.on('error', (error) => {
                    reject(error)
                })

                // Collect docs synchronously; resolve only after bulkWrite completes.
                // Resolving on stream 'end' alone raced ensureInitialized() and created a
                // second Settings document via create({}).
                jsonStream.on('data', (document) => {
                    documents.push(document)
                })
                jsonStream.on('end', () => {
                    if (documents.length === 0) {
                        resolve()
                        return
                    }
                    Settings.bulkWrite(documents.map(document => ({
                        replaceOne: {
                            filter: {_id: document._id},
                            replacement: document,
                            upsert: true
                        }
                    })))
                    .then(() => resolve())
                    .catch(err => reject(err))
                })
                jsonStream.on('error', (error) => {
                    reject(error)
                })
            })
        }

        try {
            await Settings.deleteMany()
            await importSettingsPromise()
            await Settings.ensureInitialized()
            resolve()
        }
        catch (error) {
            reject({error: error, model: 'Settings'})
        }
    })
}

const Settings = mongoose.model('Settings', SettingSchema);

// Populate/update settings when server starts
Settings.ensureInitialized()
.catch((err) => {
  throw "Error ensuring initial settings in the database : " + err;
});

module.exports = Settings;
