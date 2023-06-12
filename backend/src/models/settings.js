var mongoose = require('mongoose');//.set('debug', true);
var Schema = mongoose.Schema;
var _ = require('lodash');
var Utils = require('../lib/utils.js');

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
            }
        },
        private: {
            imageBorder: { type: Boolean, default: false },
            imageBorderColor: { type: String, default: "#000000", validate: [colorValidator, 'Invalid color'] }
        }
     },
    reviews: {
        enabled: { type: Boolean, default: false },
        public: {
            mandatoryReview: { type: Boolean, default: false },
            minReviewers: { type: Number, default: 1, min: 1, max: 100, validate: [Number.isInteger, 'Invalid integer'] }
        },
        private: {
            removeApprovalsUponUpdate: { type: Boolean, default: false }
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
        query.select('-_id report.enabled report.public reviews.enabled reviews.public');
        query.exec()
            .then(settings => resolve(settings))
            .catch(err => reject(err));
    });
};

// Update Settings
SettingSchema.statics.update = (settings) => {
    return new Promise((resolve, reject) => {
        const query = Settings.findOneAndUpdate({}, settings, { new: true, runValidators: true });
        query.exec()
            .then(settings => resolve(settings))
            .catch(err => reject(err));
    });
};


// Restore settings to default
SettingSchema.statics.restoreDefaults = () => {
    return new Promise((resolve, reject) => {
        const query = Settings.deleteMany({});
        query.exec()
            .then(_ => {
                const query = new Settings({});
                query.save()
                    .then(_ => resolve("Restored default settings."))
                    .catch(err => reject(err));
            })
            .catch(err => reject(err));
    });
};

const Settings = mongoose.model('Settings', SettingSchema);

// Populate/update settings when server starts
Settings.findOne()
.then((liveSettings) => {
  if (!liveSettings) {
    console.log("Initializing Settings");
    Settings.create({}).catch((err) => {
      throw "Error creating the settings in the database : " + err;
    });
  } 
  else {
    var needUpdate = false
    var liveSettingsPaths = Utils.getObjectPaths(liveSettings.toObject())

    liveSettingsPaths.forEach(path => {
        if (!SettingSchema.path(path) && !path.startsWith('_')) {
            needUpdate = true
            _.set(liveSettings, path, undefined)
        }
    })

    if (needUpdate) {
        console.log("Removing unused fields from Settings")
        liveSettings.save()
    }
  }
})
.catch((err) => {
  throw "Error checking for initial settings in the database : " + err;
});

module.exports = Settings;
