const _ = require('lodash');

const MASKED_SECRET = '••••••••••••••••';

const SECRET_FIELDS = [
    'report.private.languageToolApiKey',
    'ai.private.openaiApiKey',
    'ai.private.anthropicApiKey',
    'ai.private.deepseekApiKey',
    'ai.private.ollamaApiKey',
    'ai.private.bedrockApiKey',
    'ai.private.bedrockAccessKeyId',
    'ai.private.bedrockSecretAccessKey',
    'ai.private.bedrockSessionToken'
];

const configuredFieldPath = (path) => `${path}Configured`;

const sanitizeSettingsForClient = (settings) => {
    const obj = _.cloneDeep(settings?.toObject ? settings.toObject() : settings);
    if (!obj) return obj;

    SECRET_FIELDS.forEach((path) => {
        const configured = Boolean(String(_.get(obj, path) || '').trim());
        _.set(obj, configuredFieldPath(path), configured);
        _.set(obj, path, '');
    });

    return obj;
};

const mergeSettingsSecrets = (incoming, existing) => {
    const merged = _.cloneDeep(incoming);
    if (!merged || !existing) return merged;

    const existingObj = existing?.toObject ? existing.toObject() : existing;

    SECRET_FIELDS.forEach((path) => {
        const parentPath = path.split('.').slice(0, -1).join('.');
        if (!_.has(merged, parentPath)) return;

        const incomingValue = String(_.get(merged, path) || '').trim();
        const existingValue = String(_.get(existingObj, path) || '').trim();

        if (!incomingValue || incomingValue === MASKED_SECRET)
            _.set(merged, path, existingValue);
    });

    return merged;
};

module.exports = {
    MASKED_SECRET,
    SECRET_FIELDS,
    sanitizeSettingsForClient,
    mergeSettingsSecrets
};
