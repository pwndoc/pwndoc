const DELIVERY_MODES = {
    INLINE: 'inline',
    BEDROCK_PROMPT_CACHE: 'bedrock_prompt_cache'
};

const normalizeString = (value) => String(value || '').trim();

const normalizeRedactionGuidelines = (raw = {}) => {
    const delivery = Object.values(DELIVERY_MODES).includes(raw.delivery) ?
        raw.delivery :
        DELIVERY_MODES.INLINE;

    return {
        delivery: delivery,
        content: String(raw.content || ''),
        bedrockPromptCache: {
            cacheReference: normalizeString(raw.bedrockPromptCache?.cacheReference),
            region: normalizeString(raw.bedrockPromptCache?.region)
        }
    };
};

const getRedactionGuidelinesFromSettings = (settings = {}) => {
    return normalizeRedactionGuidelines(settings?.ai?.public?.redactionGuidelines || {});
};

const resolveRedactionGuidelinesForRequest = (settings = {}) => {
    const guidelines = getRedactionGuidelinesFromSettings(settings);

    if (guidelines.delivery === DELIVERY_MODES.BEDROCK_PROMPT_CACHE) {
        return {
            delivery: guidelines.delivery,
            content: '',
            bedrockPromptCache: guidelines.bedrockPromptCache,
            inlineFallback: normalizeString(guidelines.content)
        };
    }

    return {
        delivery: DELIVERY_MODES.INLINE,
        content: normalizeString(guidelines.content),
        bedrockPromptCache: {
            cacheReference: '',
            region: ''
        },
        inlineFallback: ''
    };
};

const getRedactionGuidelinesText = (resolved = {}) => {
    if (resolved.delivery === DELIVERY_MODES.BEDROCK_PROMPT_CACHE) {
        if (resolved.bedrockPromptCache?.cacheReference)
            return '';
        return resolved.inlineFallback || '';
    }

    return resolved.content || '';
};

const appendRedactionGuidelinesToSystemPrompt = (systemPrompt, resolved = {}) => {
    const guidelinesText = getRedactionGuidelinesText(resolved);
    if (!guidelinesText)
        return systemPrompt;

    return [
        systemPrompt,
        'Follow these organization redaction guidelines when writing or editing report content:',
        guidelinesText
    ].join(' ');
};

const validateRedactionGuidelinesPayload = (payload) => {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload))
        return { valid: false, message: 'Invalid redactionGuidelines payload' };

    const delivery = String(payload.delivery || DELIVERY_MODES.INLINE).trim();
    if (!Object.values(DELIVERY_MODES).includes(delivery))
        return { valid: false, message: `Invalid redaction guidelines delivery. Allowed values: ${Object.values(DELIVERY_MODES).join(', ')}` };

    if (typeof payload.content !== 'string')
        return { valid: false, message: 'Invalid redactionGuidelines.content payload' };

    const bedrockPromptCache = payload.bedrockPromptCache;
    if (bedrockPromptCache !== undefined && (bedrockPromptCache === null || typeof bedrockPromptCache !== 'object' || Array.isArray(bedrockPromptCache)))
        return { valid: false, message: 'Invalid redactionGuidelines.bedrockPromptCache payload' };

    if (bedrockPromptCache) {
        if (bedrockPromptCache.cacheReference !== undefined && typeof bedrockPromptCache.cacheReference !== 'string')
            return { valid: false, message: 'Invalid bedrockPromptCache.cacheReference payload' };
        if (bedrockPromptCache.region !== undefined && typeof bedrockPromptCache.region !== 'string')
            return { valid: false, message: 'Invalid bedrockPromptCache.region payload' };
    }

    return { valid: true };
};

const buildRedactionGuidelinesSettingsUpdate = (payload = {}) => {
    const normalized = normalizeRedactionGuidelines(payload);

    return {
        'ai.public.redactionGuidelines.delivery': normalized.delivery,
        'ai.public.redactionGuidelines.content': normalized.content,
        'ai.public.redactionGuidelines.bedrockPromptCache.cacheReference': normalized.bedrockPromptCache.cacheReference,
        'ai.public.redactionGuidelines.bedrockPromptCache.region': normalized.bedrockPromptCache.region
    };
};

module.exports = {
    DELIVERY_MODES,
    normalizeRedactionGuidelines,
    getRedactionGuidelinesFromSettings,
    resolveRedactionGuidelinesForRequest,
    getRedactionGuidelinesText,
    appendRedactionGuidelinesToSystemPrompt,
    validateRedactionGuidelinesPayload,
    buildRedactionGuidelinesSettingsUpdate
};
