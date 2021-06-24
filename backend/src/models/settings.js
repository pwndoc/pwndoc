var mongoose = require('mongoose');//.set('debug', true);
var Schema = mongoose.Schema;
var fs = require('fs');

const BaseSettingSchema = {
    enabled: { type: Boolean, default: true },
    public: { type: Map, of: Schema.Types.Mixed, default: {} },
    private: { type: Map, of: Schema.Types.Mixed, default: {} },
};

// https://stackoverflow.com/questions/25822289/what-is-the-best-way-to-store-color-hex-values-in-mongodb-mongoose
const colorValidator = (v) => (/^#([0-9a-f]{3}){1,2}$/i).test(v);

const ReportSettingSchema = new Schema({
    ...BaseSettingSchema,
    public: {
        cvssColors: {
            noneColor: { type: String, default: "#4a86e8", validate: [colorValidator, 'Invalid color'] },
            lowColor: { type: String, default: "#008000", validate: [colorValidator, 'Invalid color'] },
            mediumColor: { type: String, default: "#f9a009", validate: [colorValidator, 'Invalid color'] },
            highColor: { type: String, default: "#fe0000", validate: [colorValidator, 'Invalid color'] },
            criticalColor: { type: String, default: "#212121", validate: [colorValidator, 'Invalid color'] }
        }
    },
    private: {
        imageBorder: { type: Boolean, default: false },
        imageBorderColor: { type: String, default: "#000000", validate: [colorValidator, 'Invalid color'] }
    }
});

const ReviewSettingSchema = new Schema({
    ...BaseSettingSchema,
    enabled: { type: Boolean, default: false },
    public: {
        mandatoryReview: { type: Boolean, default: false },
        minReviewers: { type: Number, default: 1, min: 1, max: 100, validate: [Number.isInteger, 'Invalid integer'] }
    },
    private: {
        removeApprovalsUponUpdate: { type: Boolean, default: false }
    }
});

const SettingSchema = new Schema({
    report: { type: ReportSettingSchema },
    reviews: { type: ReviewSettingSchema }
});

const APP_SETTINGS_FILE = `${__basedir}/app-settings.json`;
const BASE_SELECT_QUERY = "-_id -__v -report._id -reviews._id ";

// Merges settings public and private field.
function mergeSettings(settings) {
    if (settings._doc) settings = settings.toObject();

    return Object.entries(settings).reduce((obj, [name, setting]) => {
        if (setting) return {
            ...obj,
            [name]: {
                ...setting,
                settings: { ...(setting.public || {}), ...(setting.private || {}) },
                public: undefined,
                private: undefined
            }
        };
        else return obj;
    }, {});
}

// Unmerges single settings field into public and private (if not set).
function unmergeSettings(settings) {
    if (!settings) return settings;

    return Object.entries(settings).reduce((obj, [name, setting]) => {
        if (!setting.public) setting = { ...setting, public: setting.settings };
        if (!setting.private) setting = { ...setting, private: setting.settings };
        return { ...obj, [name]: setting };
    }, {});
}

// Removes settings that not set to enabled.
function removeDisabledSetting(settings) {
    if (settings._doc) settings = settings.toObject();

    return Object.entries(settings).reduce((obj, [name, setting]) => {
        if (setting.enabled) return {
            ...obj, [name]: { ...setting, enabled: undefined }
        };
        else return obj;
    }, {});
}

// Get settings
SettingSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        const query = Settings.findOne({});
        query.select(BASE_SELECT_QUERY);
        query.exec()
            .then(settings => resolve(mergeSettings(settings)))
            .catch(err => reject(err));
    });
};

// Get public settings
SettingSchema.statics.getPublic = () => {
    return new Promise((resolve, reject) => {
        const query = Settings.findOne({});
        let excludePrivate = Object.keys(SettingSchema.paths).filter((val) => val !== "__v" && val !== "_id")
        excludePrivate = "-" + excludePrivate.join(".private -") + ".private";
        query.select(BASE_SELECT_QUERY + excludePrivate);
        query.exec()
            .then(settings => resolve(mergeSettings(removeDisabledSetting(settings))))
            .catch(err => reject(err));
    });
};

// Update settings
SettingSchema.statics.update = (settings) => {
    settings = unmergeSettings(settings);

    return new Promise((resolve, reject) => {
        const query = Settings.findOneAndUpdate({}, settings, { new: true, runValidators: true });
        query.select(BASE_SELECT_QUERY);
        query.exec()
            .then(settings => resolve(mergeSettings(settings)))
            .catch(err => reject(err));
    });
};

// Restore settings to default
SettingSchema.statics.restoreDefaults = () => {
    return new Promise(async (resolve, reject) => {
        let defaultSettings = {};
        if (fs.existsSync(APP_SETTINGS_FILE)) {
            defaultSettings = JSON.parse(fs.readFileSync(APP_SETTINGS_FILE));
        }

        const query = Settings.deleteMany({});
        query.exec()
            .then(_ => {
                const query = new Settings(defaultSettings);
                query.save()
                    .then(_ => resolve("Restored default settings."))
                    .catch(err => reject(err));
            })
            .catch(err => reject(err));
    });
};

const Settings = mongoose.model('Settings', SettingSchema);
module.exports = Settings;
