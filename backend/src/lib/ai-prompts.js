const DEFAULT_AI_PROMPTS = {
    description: 'Write a technical finding description for "{title}" in the "{vulnType}" category. Explain what is vulnerable and the business/security impact.',
    observation: 'Write a clear observation for "{title}" using available evidence. Include exploitation path and realistic attacker impact.',
    remediation: 'Write practical remediation for "{title}" with prioritized, concrete actions and verification guidance.',
    references: 'Provide concise references for "{title}" in "{vulnType}". Include standards or authoritative guidance when possible.'
};

const normalizePromptValue = (value) => {
    if (value === null || value === undefined)
        return '';
    return String(value).trim();
}

const mergeWithDefaults = (prompts = {}) => {
    const result = {};
    Object.keys(DEFAULT_AI_PROMPTS).forEach((field) => {
        const candidate = normalizePromptValue(prompts[field]);
        result[field] = candidate || DEFAULT_AI_PROMPTS[field];
    });
    return result;
}

const getAiPromptsFromSettings = (settings = {}) => {
    const prompts = settings?.ai?.public?.prompts || {};
    return mergeWithDefaults(prompts);
}

module.exports = {
    DEFAULT_AI_PROMPTS,
    mergeWithDefaults,
    getAiPromptsFromSettings
};
