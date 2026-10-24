// OrcaRouter Cyber Inference model discovery.
//
// OrcaRouter's catalog endpoint is the single source of truth for the models this
// provider can serve (https://api.orcarouter.ai/v1/models). The API key stays on the
// backend: this module is the only place that calls the catalog, and it returns a
// minimal, filtered projection to the browser.
//
// Cyber scope: OrcaRouter Cyber Inference serves authorized, scoped security
// reasoning for verified security teams. Documentation:
//   https://www.orcarouter.ai/cyber
//   https://www.orcarouter.ai/models?tier=cyber

const DEFAULT_ORCA_API_BASE_URL = 'https://api.orcarouter.ai/v1';

// Endpoint types the OpenAIChat transport can speak. A record must advertise at
// least one of these to appear in a text selector.
const CHAT_ENDPOINT_TYPES = ['openai', 'anthropic', 'gemini', 'openai-response'];

// Capability -> endpoint types. Deliberately strict: a record is only offered for a
// capability it explicitly declares. Nothing is inferred from the model name.
const CAPABILITY_ENDPOINT_TYPES = {
    chat: CHAT_ENDPOINT_TYPES,
    embedding: ['embedding', 'embeddings'],
    image: ['image-generation'],
    video: ['openai-video'],
    rerank: ['jina-rerank']
};

// Dedicated non-text routes that must never leak into the text selector even when a
// catalog also lists a chat endpoint for the same record.
const NON_TEXT_ENDPOINT_TYPES = ['image-generation', 'openai-video', 'jina-rerank', 'embedding', 'embeddings'];

const MAX_MODELS = 2000;
const MAX_MODEL_ID_LENGTH = 200;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_DISCOVERY_TIMEOUT_MS = 15000;
const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/+-]*$/;

// Small cold-start catalog captured from the live catalog on 2026-10-24. Used only when
// live discovery fails, and always labelled degraded in the UI. Ids, names, context
// lengths, modalities and endpoint types are the values GET /v1/models returned; do not
// add guessed capabilities.
const VERIFIED_FALLBACK_MODELS = [
    {
        id: 'orcarouter/auto',
        name: 'OrcaRouter Auto',
        contextLength: null,
        inputModalities: [],
        supportedEndpointTypes: ['openai', 'openai-response', 'anthropic', 'gemini'],
        reasoningEfforts: []
    },
    {
        id: 'orcarouter/fusion',
        name: 'OrcaRouter Fusion',
        contextLength: 1000000,
        inputModalities: [],
        supportedEndpointTypes: ['openai', 'openai-response', 'anthropic', 'gemini'],
        reasoningEfforts: []
    },
    {
        id: 'orcarouter/fusion-flash',
        name: 'OrcaRouter Fusion Flash',
        contextLength: 262144,
        inputModalities: [],
        supportedEndpointTypes: ['openai', 'openai-response', 'anthropic', 'gemini'],
        reasoningEfforts: []
    },
    {
        id: 'orca/orcacyber-ultra-1.0',
        name: 'Orca: OrcaCyber Ultra 1.0',
        contextLength: 1048576,
        inputModalities: ['text'],
        supportedEndpointTypes: ['openai'],
        reasoningEfforts: []
    },
    {
        id: 'orca/orcacyber-zero-1.5',
        name: 'Orca: OrcaCyber Zero 1.5',
        contextLength: 1000000,
        inputModalities: ['text'],
        supportedEndpointTypes: ['openai'],
        reasoningEfforts: []
    },
    {
        id: 'orca/orcacyber-zero-1.0',
        name: 'Orca: OrcaCyber Zero 1.0',
        contextLength: 1000000,
        inputModalities: ['text'],
        supportedEndpointTypes: ['openai'],
        reasoningEfforts: []
    }
];

class OrcaDiscoveryError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'OrcaDiscoveryError';
        this.code = code;
    }
}

const trim = (value) => String(value || '').trim();

const stripTrailingSlashes = (value) => trim(value).replace(/\/+$/g, '');

// Explicit API override wins over the stored settings value; the shared
// ORCA_BASE_URL is the last fallback before the public default.
const resolveOrcaBaseUrl = (privateSettings = {}, env = process.env) => {
    const explicitApi = stripTrailingSlashes(env?.ORCA_API_BASE_URL);
    if (explicitApi)
        return explicitApi;

    const configured = stripTrailingSlashes(privateSettings?.orcarouterBaseUrl);
    if (configured)
        return configured;

    const shared = stripTrailingSlashes(env?.ORCA_BASE_URL);
    if (shared)
        return shared;

    return DEFAULT_ORCA_API_BASE_URL;
};

const isLoopbackHost = (hostname) => ['localhost', '127.0.0.1', '[::1]', '::1'].includes(String(hostname || '').toLowerCase());

// Remote origins must be HTTPS; plain HTTP is only accepted on loopback for local
// self-hosted development.
const assertAllowedBaseUrl = (value) => {
    let parsed = null;
    try {
        parsed = new URL(String(value || ''));
    } catch (_) {
        throw new OrcaDiscoveryError('invalid_url', 'OrcaRouter base URL is not a valid URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol))
        throw new OrcaDiscoveryError('invalid_url', 'OrcaRouter base URL must use HTTP or HTTPS');

    if (parsed.protocol === 'http:' && !isLoopbackHost(parsed.hostname))
        throw new OrcaDiscoveryError('invalid_url', 'OrcaRouter base URL must use HTTPS for remote hosts');

    if (parsed.username || parsed.password)
        throw new OrcaDiscoveryError('invalid_url', 'OrcaRouter base URL must not contain credentials');

    return stripTrailingSlashes(parsed.toString());
};

const toLowerStringArray = (value) => {
    if (!Array.isArray(value))
        return [];
    return [...new Set(value.map((entry) => trim(entry).toLowerCase()).filter(Boolean))];
};

const toPositiveInteger = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
};

// Accepts both the OpenAI `{ data: [...] }` envelope and a bare array, and keeps only
// shaped, bounded records. Unknown fields are dropped so the browser never receives
// more catalog metadata than the selector needs.
const normalizeModelRecord = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;

    const id = trim(raw.id);
    if (!id || id.length > MAX_MODEL_ID_LENGTH || !MODEL_ID_PATTERN.test(id))
        return null;

    const name = trim(raw.name) || id;
    const architecture = raw.architecture && typeof raw.architecture === 'object' ? raw.architecture : {};
    const inputModalities = toLowerStringArray(architecture.input_modalities || raw.input_modalities);
    const supportedEndpointTypes = toLowerStringArray(raw.supported_endpoint_types || raw.supportedEndpointTypes);
    const contextLength = toPositiveInteger(raw.context_length ?? raw.contextLength ?? architecture.context_length);
    const rawReasoningEfforts = raw.reasoning_efforts || raw.reasoningEfforts;
    const reasoningEfforts = Array.isArray(rawReasoningEfforts)
        ? toLowerStringArray(rawReasoningEfforts)
        : [];

    return {
        id,
        name,
        contextLength,
        inputModalities,
        supportedEndpointTypes,
        reasoningEfforts
    };
};

const parseOrcaCatalog = (payload) => {
    const rawModels = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
            ? payload.data
            : [];

    const seen = new Set();
    const models = [];

    for (const raw of rawModels) {
        if (models.length >= MAX_MODELS)
            break;
        const model = normalizeModelRecord(raw);
        if (!model || seen.has(model.id))
            continue;
        seen.add(model.id);
        models.push(model);
    }

    return models;
};

const hasEndpointType = (model, endpointTypes) =>
    (model.supportedEndpointTypes || []).some((entry) => endpointTypes.includes(entry));

// Every capability filter fails closed: a record with no declared endpoint types is
// never offered.
const isModelCompatibleWith = (model, capability) => {
    if (!model || !Array.isArray(model.supportedEndpointTypes) || model.supportedEndpointTypes.length === 0)
        return false;

    if (capability === 'chat')
        return hasEndpointType(model, CHAT_ENDPOINT_TYPES) &&
            !model.supportedEndpointTypes.every((entry) => NON_TEXT_ENDPOINT_TYPES.includes(entry));

    if (capability === 'multimodal')
        return isModelCompatibleWith(model, 'chat') && model.inputModalities.length > 0 &&
            model.inputModalities.some((entry) => entry !== 'text');

    const endpointTypes = CAPABILITY_ENDPOINT_TYPES[capability];
    return Array.isArray(endpointTypes) ? hasEndpointType(model, endpointTypes) : false;
};

const filterModelsForCapability = (models = [], capability = 'chat') =>
    (Array.isArray(models) ? models : []).filter((model) => isModelCompatibleWith(model, capability));

const getVerifiedFallbackCatalog = (capability = 'chat') =>
    filterModelsForCapability(VERIFIED_FALLBACK_MODELS, capability)
        .map((model) => ({ ...model, verifiedFallback: true }));

const readBodyWithLimit = async (response, maxBytes = MAX_RESPONSE_BYTES) => {
    if (!response?.body || typeof response.body.getReader !== 'function') {
        const text = await response.text();
        if (String(text).length > maxBytes)
            throw new OrcaDiscoveryError('http', 'OrcaRouter catalog response exceeded the size limit');
        return text;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    let text = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done)
            break;
        received += value?.byteLength || 0;
        if (received > maxBytes) {
            try { await reader.cancel(); } catch (_) {}
            throw new OrcaDiscoveryError('http', 'OrcaRouter catalog response exceeded the size limit');
        }
        text += decoder.decode(value, { stream: true });
    }

    return text + decoder.decode();
};

// Fetches the live catalog. The key is only ever sent as an Authorization header and is
// never included in an error message.
const fetchOrcaModels = async ({
    apiKey,
    baseUrl,
    timeoutMs = DEFAULT_DISCOVERY_TIMEOUT_MS,
    capability = 'chat',
    fetchImpl = globalThis.fetch
} = {}) => {
    const key = trim(apiKey);
    if (!key)
        throw new OrcaDiscoveryError('not_configured', 'OrcaRouter Cyber Inference provider is not configured. Set API key.');

    const safeBaseUrl = assertAllowedBaseUrl(baseUrl || DEFAULT_ORCA_API_BASE_URL);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response = null;
    try {
        if (typeof fetchImpl !== 'function')
            throw new OrcaDiscoveryError('network', 'No HTTP client available for model discovery');

        response = await fetchImpl(`${safeBaseUrl}/models`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${key}`,
                Accept: 'application/json'
            },
            signal: controller.signal
        });
    } catch (err) {
        if (err?.name === 'AbortError')
            throw new OrcaDiscoveryError('timeout', `OrcaRouter model discovery timed out after ${timeoutMs}ms`);
        if (err instanceof OrcaDiscoveryError)
            throw err;
        throw new OrcaDiscoveryError('network', 'Could not reach the OrcaRouter model catalog');
    } finally {
        clearTimeout(timer);
    }

    if (response.status === 401 || response.status === 403)
        throw new OrcaDiscoveryError('auth', 'OrcaRouter rejected the API key. Update the key and try again.');
    if (response.status === 429)
        throw new OrcaDiscoveryError('rate_limit', 'OrcaRouter rate-limited model discovery. Try again shortly.');
    if (!response.ok)
        throw new OrcaDiscoveryError('http', `OrcaRouter model discovery returned HTTP ${response.status}`);

    let payload = null;
    try {
        payload = JSON.parse(await readBodyWithLimit(response));
    } catch (err) {
        if (err instanceof OrcaDiscoveryError)
            throw err;
        throw new OrcaDiscoveryError('http', 'OrcaRouter model catalog returned invalid JSON');
    }

    const allModels = parseOrcaCatalog(payload);
    return {
        models: filterModelsForCapability(allModels, capability),
        source: 'live',
        degraded: false,
        catalogModelCount: allModels.length
    };
};

// Live catalog first; on outage/rate-limit/invalid-response fall back to the small
// verified seed and mark the result degraded. Authentication failures are terminal and
// never masked by a fallback, so a bad key is reported as a bad key.
const discoverOrcaModels = async (options = {}) => {
    try {
        return await fetchOrcaModels(options);
    } catch (err) {
        if (err?.code === 'auth' || err?.code === 'not_configured' || err?.code === 'invalid_url')
            throw err;

        const capability = options.capability || 'chat';
        return {
            models: getVerifiedFallbackCatalog(capability),
            source: 'fallback',
            degraded: true,
            catalogModelCount: 0,
            error: err?.message || 'OrcaRouter model discovery failed'
        };
    }
};

module.exports = {
    DEFAULT_ORCA_API_BASE_URL,
    CHAT_ENDPOINT_TYPES,
    MAX_MODELS,
    MAX_RESPONSE_BYTES,
    VERIFIED_FALLBACK_MODELS,
    OrcaDiscoveryError,
    resolveOrcaBaseUrl,
    assertAllowedBaseUrl,
    normalizeModelRecord,
    parseOrcaCatalog,
    isModelCompatibleWith,
    filterModelsForCapability,
    getVerifiedFallbackCatalog,
    fetchOrcaModels,
    discoverOrcaModels
};
