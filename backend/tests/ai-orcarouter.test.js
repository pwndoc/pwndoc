const {
    DEFAULT_ORCA_API_BASE_URL,
    VERIFIED_FALLBACK_MODELS,
    OrcaDiscoveryError,
    resolveOrcaBaseUrl,
    assertAllowedBaseUrl,
    parseOrcaCatalog,
    filterModelsForCapability,
    getVerifiedFallbackCatalog,
    fetchOrcaModels,
    discoverOrcaModels
} = require('../src/lib/ai-orcarouter');

const catalogPayload = () => ({
    data: [
        {
            id: 'openai/gpt-5.5',
            name: 'GPT-5.5',
            context_length: 400000,
            architecture: { input_modalities: ['text', 'image'] },
            supported_endpoint_types: ['openai', 'openai-response'],
            reasoning_efforts: ['low', 'medium', 'high', 'xhigh']
        },
        {
            id: 'anthropic/claude-opus-4.8',
            architecture: { input_modalities: ['text', 'image'] },
            supported_endpoint_types: ['anthropic']
        },
        {
            id: 'orcarouter/auto',
            supported_endpoint_types: ['openai']
        },
        {
            id: 'embeddings/text-only',
            supported_endpoint_types: ['embedding']
        },
        {
            id: 'images/generator',
            supported_endpoint_types: ['image-generation']
        },
        {
            id: 'video/generator',
            supported_endpoint_types: ['openai-video']
        },
        {
            id: 'rerank/jina',
            supported_endpoint_types: ['jina-rerank']
        },
        {
            id: 'no-endpoints-declared'
        },
        {
            id: 'not a valid id!'
        },
        {
            id: 'openai/gpt-5.5'
        },
        null,
        'openai/string-record'
    ]
});

const jsonResponse = (payload, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    body: null
});

module.exports = function() {
    describe('OrcaRouter base URL policy', () => {
        it('defaults to the public inference origin', () => {
            expect(resolveOrcaBaseUrl({}, {})).toBe(DEFAULT_ORCA_API_BASE_URL);
            expect(DEFAULT_ORCA_API_BASE_URL).toBe('https://api.orcarouter.ai/v1');
        });

        it('prefers an explicit API override, then the configured value, then the shared base', () => {
            const settings = { orcarouterBaseUrl: 'https://configured.example/v1' };
            expect(resolveOrcaBaseUrl(settings, { ORCA_API_BASE_URL: 'https://api.example/v1', ORCA_BASE_URL: 'https://shared.example' }))
                .toBe('https://api.example/v1');
            expect(resolveOrcaBaseUrl(settings, { ORCA_BASE_URL: 'https://shared.example' }))
                .toBe('https://configured.example/v1');
            expect(resolveOrcaBaseUrl({}, { ORCA_BASE_URL: 'https://shared.example/' }))
                .toBe('https://shared.example');
        });

        it('accepts HTTPS remote origins and HTTP loopback, and rejects the rest', () => {
            expect(assertAllowedBaseUrl('https://api.orcarouter.ai/v1')).toBe('https://api.orcarouter.ai/v1');
            expect(assertAllowedBaseUrl('http://127.0.0.1:8080/v1')).toBe('http://127.0.0.1:8080/v1');
            expect(() => assertAllowedBaseUrl('http://api.orcarouter.ai/v1')).toThrow(OrcaDiscoveryError);
            expect(() => assertAllowedBaseUrl('ftp://api.orcarouter.ai/v1')).toThrow(OrcaDiscoveryError);
            expect(() => assertAllowedBaseUrl('https://user:pass@api.orcarouter.ai/v1')).toThrow(OrcaDiscoveryError);
            expect(() => assertAllowedBaseUrl('not-a-url')).toThrow(OrcaDiscoveryError);
        });
    });

    describe('OrcaRouter catalog parsing', () => {
        it('keeps shaped records, preserves vendor namespaces and drops malformed or duplicate ids', () => {
            const models = parseOrcaCatalog(catalogPayload());

            expect(models.map((model) => model.id)).toEqual([
                'openai/gpt-5.5',
                'anthropic/claude-opus-4.8',
                'orcarouter/auto',
                'embeddings/text-only',
                'images/generator',
                'video/generator',
                'rerank/jina',
                'no-endpoints-declared'
            ]);
            expect(models[0]).toMatchObject({
                id: 'openai/gpt-5.5',
                name: 'GPT-5.5',
                contextLength: 400000,
                inputModalities: ['text', 'image'],
                supportedEndpointTypes: ['openai', 'openai-response'],
                reasoningEfforts: ['low', 'medium', 'high', 'xhigh']
            });
            // No name supplied -> the id is the label, never an empty string.
            expect(models[2].name).toBe('orcarouter/auto');
        });

        it('accepts a bare array envelope', () => {
            expect(parseOrcaCatalog([{ id: 'orcarouter/auto', supported_endpoint_types: ['openai'] }]))
                .toHaveLength(1);
        });
    });

    describe('OrcaRouter capability filtering', () => {
        const models = parseOrcaCatalog(catalogPayload());

        it('offers only text chat models for the chat selector', () => {
            const ids = filterModelsForCapability(models, 'chat').map((model) => model.id);

            expect(ids).toEqual([
                'openai/gpt-5.5',
                'anthropic/claude-opus-4.8',
                'orcarouter/auto'
            ]);
        });

        it('fails closed: a record with no declared endpoint types is never offered', () => {
            const ids = filterModelsForCapability(models, 'chat').map((model) => model.id);
            expect(ids).not.toContain('no-endpoints-declared');
        });

        it('filters multimodal options by explicit input modalities only', () => {
            const imageIds = filterModelsForCapability(models, 'multimodal').map((model) => model.id);
            expect(imageIds).toEqual(['openai/gpt-5.5', 'anthropic/claude-opus-4.8']);

            const audioIds = filterModelsForCapability(models, 'multimodal')
                .filter((model) => model.inputModalities.includes('audio'))
                .map((model) => model.id);
            expect(audioIds).toEqual([]);
        });

        it('maps each non-text capability to its dedicated endpoint type', () => {
            expect(filterModelsForCapability(models, 'embedding').map((model) => model.id)).toEqual(['embeddings/text-only']);
            expect(filterModelsForCapability(models, 'image').map((model) => model.id)).toEqual(['images/generator']);
            expect(filterModelsForCapability(models, 'video').map((model) => model.id)).toEqual(['video/generator']);
            expect(filterModelsForCapability(models, 'rerank').map((model) => model.id)).toEqual(['rerank/jina']);
        });
    });

    describe('OrcaRouter verified fallback catalog', () => {
        it('keeps the catalog default and the dedicated cyber models with their metadata', () => {
            const fallback = getVerifiedFallbackCatalog('chat');
            const ids = fallback.map((model) => model.id);

            expect(ids).toContain('orcarouter/auto');
            expect(ids).toContain('orcarouter/fusion');
            expect(ids).toContain('orca/orcacyber-ultra-1.0');
            expect(ids).toContain('orca/orcacyber-zero-1.5');
            expect(fallback.every((model) => model.verifiedFallback === true)).toBe(true);

            const ultra = fallback.find((model) => model.id === 'orca/orcacyber-ultra-1.0');
            expect(ultra.contextLength).toBe(1048576);
            expect(ultra.inputModalities).toEqual(['text']);
            expect(ultra.supportedEndpointTypes).toEqual(['openai']);
        });

        it('is derived from the same capability filter as the live catalog', () => {
            expect(getVerifiedFallbackCatalog('chat').every((model) =>
                filterModelsForCapability([model], 'chat').length === 1)).toBe(true);
            expect(VERIFIED_FALLBACK_MODELS.length).toBeLessThanOrEqual(10);
        });
    });

    describe('OrcaRouter live catalog fetch', () => {
        it('calls the inference origin model endpoint with the bearer key and returns only compatible models', async () => {
            const calls = [];
            const fetchImpl = async (url, options) => {
                calls.push({ url, options });
                return jsonResponse(catalogPayload());
            };

            const result = await fetchOrcaModels({
                apiKey: 'sk-orca-test-value',
                baseUrl: 'https://api.orcarouter.ai/v1',
                fetchImpl
            });

            expect(calls).toHaveLength(1);
            expect(calls[0].url).toBe('https://api.orcarouter.ai/v1/models');
            expect(calls[0].options.headers.Authorization).toBe('Bearer sk-orca-test-value');
            expect(result.source).toBe('live');
            expect(result.degraded).toBe(false);
            expect(result.catalogModelCount).toBe(8);
            expect(result.models.map((model) => model.id)).toEqual([
                'openai/gpt-5.5',
                'anthropic/claude-opus-4.8',
                'orcarouter/auto'
            ]);
        });

        it('treats a 401 as terminal authentication failure and never echoes the key', async () => {
            const fetchImpl = async () => jsonResponse({ error: 'bad key sk-orca-abcdef1234567890' }, 401);

            await expect(fetchOrcaModels({ apiKey: 'sk-orca-abcdef1234567890', fetchImpl }))
                .rejects.toMatchObject({ code: 'auth' });

            try {
                await fetchOrcaModels({ apiKey: 'sk-orca-abcdef1234567890', fetchImpl });
            } catch (err) {
                expect(err.message).not.toContain('sk-orca-abcdef1234567890');
            }
        });

        it('requires a configured key before making a request', async () => {
            const fetchImpl = jest.fn();
            await expect(fetchOrcaModels({ apiKey: '   ', fetchImpl })).rejects.toMatchObject({ code: 'not_configured' });
            expect(fetchImpl).not.toHaveBeenCalled();
        });

        it('returns a degraded verified fallback when the catalog is unreachable', async () => {
            const fetchImpl = async () => { throw new Error('ECONNREFUSED'); };

            const result = await discoverOrcaModels({ apiKey: 'sk-orca-test-value', fetchImpl });

            expect(result.source).toBe('fallback');
            expect(result.degraded).toBe(true);
            expect(result.models.map((model) => model.id)).toContain('orcarouter/auto');
            expect(result.error).not.toContain('sk-orca-test-value');
        });

        it('returns a degraded fallback on a catalog 500 but not on a 403', async () => {
            const serverError = await discoverOrcaModels({
                apiKey: 'sk-orca-test-value',
                fetchImpl: async () => jsonResponse({ error: 'down' }, 500)
            });
            expect(serverError).toMatchObject({ source: 'fallback', degraded: true });

            await expect(discoverOrcaModels({
                apiKey: 'sk-orca-test-value',
                fetchImpl: async () => jsonResponse({ error: 'forbidden' }, 403)
            })).rejects.toMatchObject({ code: 'auth' });
        });

        it('reports a timeout as a degraded fallback', async () => {
            const fetchImpl = async (url, options) => new Promise((resolve, reject) => {
                options.signal.addEventListener('abort', () => {
                    const err = new Error('aborted');
                    err.name = 'AbortError';
                    reject(err);
                });
            });

            const result = await discoverOrcaModels({
                apiKey: 'sk-orca-test-value',
                timeoutMs: 5,
                fetchImpl
            });

            expect(result.degraded).toBe(true);
            expect(result.error).toMatch(/timed out/);
        });
    });
};
