const DELIVERY_MODES = {
    INLINE: 'inline',
    BEDROCK_PROMPT_CACHE: 'bedrock_prompt_cache'
};

const normalizeString = (value) => String(value || '').trim();

const normalizeQaInstructions = (raw = {}) => {
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

const getQaInstructionsFromSettings = (settings = {}) => {
    return normalizeQaInstructions(settings?.ai?.public?.qaInstructions || {});
};

const resolveQaInstructionsForRequest = (settings = {}) => {
    const instructions = getQaInstructionsFromSettings(settings);

    if (instructions.delivery === DELIVERY_MODES.BEDROCK_PROMPT_CACHE) {
        return {
            delivery: instructions.delivery,
            content: '',
            bedrockPromptCache: instructions.bedrockPromptCache,
            inlineFallback: normalizeString(instructions.content)
        };
    }

    return {
        delivery: DELIVERY_MODES.INLINE,
        content: normalizeString(instructions.content),
        bedrockPromptCache: {
            cacheReference: '',
            region: ''
        },
        inlineFallback: ''
    };
};

const getQaInstructionsText = (resolved = {}) => {
    if (resolved.delivery === DELIVERY_MODES.BEDROCK_PROMPT_CACHE) {
        if (resolved.bedrockPromptCache?.cacheReference)
            return '';
        return resolved.inlineFallback || '';
    }

    return resolved.content || '';
};

const validateQaInstructionsPayload = (payload) => {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload))
        return { valid: false, message: 'Invalid qaInstructions payload' };

    const delivery = String(payload.delivery || DELIVERY_MODES.INLINE).trim();
    if (!Object.values(DELIVERY_MODES).includes(delivery))
        return { valid: false, message: `Invalid QA instructions delivery. Allowed values: ${Object.values(DELIVERY_MODES).join(', ')}` };

    if (typeof payload.content !== 'string')
        return { valid: false, message: 'Invalid qaInstructions.content payload' };

    const bedrockPromptCache = payload.bedrockPromptCache;
    if (bedrockPromptCache !== undefined && (bedrockPromptCache === null || typeof bedrockPromptCache !== 'object' || Array.isArray(bedrockPromptCache)))
        return { valid: false, message: 'Invalid qaInstructions.bedrockPromptCache payload' };

    if (bedrockPromptCache) {
        if (bedrockPromptCache.cacheReference !== undefined && typeof bedrockPromptCache.cacheReference !== 'string')
            return { valid: false, message: 'Invalid bedrockPromptCache.cacheReference payload' };
        if (bedrockPromptCache.region !== undefined && typeof bedrockPromptCache.region !== 'string')
            return { valid: false, message: 'Invalid bedrockPromptCache.region payload' };
    }

    return { valid: true };
};

const buildQaInstructionsSettingsUpdate = (payload = {}) => {
    const normalized = normalizeQaInstructions(payload);

    return {
        'ai.public.qaInstructions.delivery': normalized.delivery,
        'ai.public.qaInstructions.content': normalized.content,
        'ai.public.qaInstructions.bedrockPromptCache.cacheReference': normalized.bedrockPromptCache.cacheReference,
        'ai.public.qaInstructions.bedrockPromptCache.region': normalized.bedrockPromptCache.region
    };
};

module.exports = {
    DELIVERY_MODES,
    normalizeQaInstructions,
    getQaInstructionsFromSettings,
    resolveQaInstructionsForRequest,
    getQaInstructionsText,
    validateQaInstructionsPayload,
    buildQaInstructionsSettingsUpdate
};
