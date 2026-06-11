const QA_CHECK_KEYS = ['completeness', 'references', 'imageCaptions', 'redaction', 'customer', 'instructions'];

const defaultQaChecks = () => ({
    completeness: true,
    references: true,
    imageCaptions: true,
    redaction: true,
    customer: true,
    instructions: true
});

const normalizeQaChecks = (raw = {}) => {
    const normalized = defaultQaChecks();

    QA_CHECK_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(raw, key))
            normalized[key] = raw[key] !== false;
    });

    return normalized;
};

const getQaChecksFromSettings = (settings = {}) => {
    return normalizeQaChecks(settings?.ai?.public?.qaChecks || {});
};

const isQaCheckEnabled = (qaChecks = {}, key) => {
    if (!QA_CHECK_KEYS.includes(key))
        return false;
    return normalizeQaChecks(qaChecks)[key] !== false;
};

const hasEnabledAiQaChecks = (qaChecks = {}) => {
    return ['redaction', 'customer', 'instructions'].some((key) => isQaCheckEnabled(qaChecks, key));
};

const hasEnabledQaChecks = (qaChecks = {}) => {
    return QA_CHECK_KEYS.some((key) => isQaCheckEnabled(qaChecks, key));
};

const validateQaChecksPayload = (payload) => {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload))
        return { valid: false, message: 'Invalid qaChecks payload' };

    for (const key of Object.keys(payload)) {
        if (!QA_CHECK_KEYS.includes(key))
            return { valid: false, message: `Invalid qaChecks key: ${key}` };
        if (typeof payload[key] !== 'boolean')
            return { valid: false, message: `Invalid qaChecks.${key} payload` };
    }

    return { valid: true };
};

const buildQaChecksSettingsUpdate = (payload = {}) => {
    const normalized = normalizeQaChecks(payload);
    const update = {};

    QA_CHECK_KEYS.forEach((key) => {
        update[`ai.public.qaChecks.${key}`] = normalized[key];
    });

    return update;
};

const buildEnabledQaChecksPrompt = (qaChecks = {}) => {
    const enabledAreas = [];

    if (isQaCheckEnabled(qaChecks, 'redaction'))
        enabledAreas.push('redaction guideline compliance');
    if (isQaCheckEnabled(qaChecks, 'customer'))
        enabledAreas.push('customer and company alignment');
    if (isQaCheckEnabled(qaChecks, 'instructions'))
        enabledAreas.push('organization QA instructions, including any additional required sections or fields defined there');

    if (!enabledAreas.length)
        return '';

    return `Only evaluate these areas: ${enabledAreas.join(', ')}.`;
};

const filterAiIssuesByEnabledChecks = (issues = [], qaChecks = {}) => {
    return issues.filter((issue) => {
        if (QA_CHECK_KEYS.includes(issue.category))
            return isQaCheckEnabled(qaChecks, issue.category);
        return true;
    });
};

module.exports = {
    QA_CHECK_KEYS,
    defaultQaChecks,
    normalizeQaChecks,
    getQaChecksFromSettings,
    isQaCheckEnabled,
    hasEnabledAiQaChecks,
    hasEnabledQaChecks,
    validateQaChecksPayload,
    buildQaChecksSettingsUpdate,
    buildEnabledQaChecksPrompt,
    filterAiIssuesByEnabledChecks
};
