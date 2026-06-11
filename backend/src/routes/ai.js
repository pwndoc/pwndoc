const Response = require('../lib/httpResponse.js');
const acl = require('../lib/auth').acl;
const Settings = require('mongoose').model('Settings');
const CustomField = require('mongoose').model('CustomField');
const AiPrompt = require('mongoose').model('AiPrompt');
const {
    AI_PROVIDERS,
    AI_DEFAULT_PROVIDER,
    AI_PROVIDER_DEFAULTS,
    normalizePromptValue,
    toPromptCompositeKey,
    buildAiFieldCatalog
} = require('../lib/ai-prompts');

const toBaseUrl = (value, fallback) => String(value || fallback).replace(/\/+$/g, '');
const toTimeout = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const normalizeContextValue = (value) => {
    if (value === null || value === undefined)
        return '';
    if (Array.isArray(value))
        return value.join(', ');
    if (typeof value === 'object')
        return JSON.stringify(value);
    return String(value);
}

const renderPromptTemplate = (template = '', context = {}) => {
    const source = String(template || '');
    return source.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
        return normalizeContextValue(context[key]);
    }).trim();
}

const toReferenceArray = (value) => {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
        .split('\n')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
}

const normalizeProvider = (provider) => {
    if (!provider || typeof provider !== 'string')
        return null;
    return provider.toLowerCase().trim();
}

const extractJsonObjectFromText = (text = '') => {
    const trimmed = String(text || '').trim();
    if (!trimmed)
        return null;

    const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

    try {
        return JSON.parse(withoutFence);
    } catch (_) {}

    const jsonMatch = withoutFence.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
        return null;

    try {
        return JSON.parse(jsonMatch[0]);
    } catch (_) {
        return null;
    }
}

const getDraftFromParsed = (outputType, parsed = {}, providerLabel = 'AI provider') => {
    const raw = parsed?.draft;

    if (outputType === 'array') {
        const refs = toReferenceArray(raw);
        if (refs.length === 0) {
            throw({
                fn: 'BadRequest',
                message: `${providerLabel} response is missing a valid array draft`
            });
        }
        return refs;
    }

    if (typeof raw !== 'string' || !raw.trim()) {
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} response is missing a valid text draft`
        });
    }

    return raw.trim();
}

const normalizeOpenAIContent = (content) => {
    if (typeof content === 'string')
        return content;
    if (Array.isArray(content)) {
        return content
        .map((entry) => entry?.text || entry?.content || '')
        .filter(Boolean)
        .join('\n');
    }
    return '';
}

const getSystemPrompt = (outputType) => {
    if (outputType === 'array') {
        return [
            'You are an assistant writing pentest report content.',
            'Return ONLY valid JSON with one key: "draft" as an array of concise strings.'
        ].join(' ');
    }

    if (outputType === 'text') {
        return [
            'You are an assistant writing pentest report content.',
            'Return ONLY valid JSON with one key: "draft" as plain text without markdown fences.'
        ].join(' ');
    }

    return [
        'You are an assistant writing pentest report content.',
        'Return ONLY valid JSON with one key: "draft" as HTML paragraphs using <p>...</p> without markdown fences.'
    ].join(' ');
}

const generateWithOpenAICompatible = async ({
    providerLabel,
    outputType,
    context = {},
    promptInstruction = '',
    userPrompt = '',
    apiKey = '',
    baseUrl,
    model,
    timeoutMs,
    requireApiKey = true
}) => {
    if (requireApiKey && !apiKey) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key.`
        });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const systemPrompt = getSystemPrompt(outputType);

    const userPayload = {
        promptInstruction: promptInstruction,
        context: context,
        userPrompt: userPrompt || ''
    };

    const headers = {
        'Content-Type': 'application/json'
    };
    if (apiKey)
        headers.Authorization = `Bearer ${apiKey}`;

    let response = null;
    try {
        response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: headers,
            signal: controller.signal,
            body: JSON.stringify({
                model: model,
                temperature: 0.2,
                messages: [
                    {role: 'system', content: systemPrompt},
                    {role: 'user', content: JSON.stringify(userPayload)}
                ]
            })
        });
    } catch (err) {
        if (err && err.name === 'AbortError') {
            throw({
                fn: 'BadRequest',
                message: `${providerLabel} request timed out after ${timeoutMs}ms`
            });
        }
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} request failed: ${err.message || String(err)}`
        });
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        let detail = '';
        try {
            detail = await response.text();
        } catch (_) {}
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`
        });
    }

    const payload = await response.json();
    const content = normalizeOpenAIContent(payload?.choices?.[0]?.message?.content);
    const parsed = extractJsonObjectFromText(content);
    if (!parsed) {
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} response does not contain valid JSON`
        });
    }

    return {
        draft: getDraftFromParsed(outputType, parsed, providerLabel),
        model: payload?.model || model
    };
}

const normalizeAnthropicContent = (content) => {
    if (typeof content === 'string')
        return content;
    if (Array.isArray(content)) {
        return content
        .filter((entry) => entry && entry.type === 'text' && entry.text)
        .map((entry) => entry.text)
        .join('\n');
    }
    return '';
}

const generateWithAnthropic = async ({
    outputType,
    context = {},
    promptInstruction = '',
    userPrompt = '',
    apiKey = '',
    baseUrl,
    model,
    version,
    timeoutMs
}) => {
    if (!apiKey) {
        throw({
            fn: 'BadParameters',
            message: 'Anthropic provider is not configured. Set API key.'
        });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const systemPrompt = getSystemPrompt(outputType);

    const userPayload = {
        promptInstruction: promptInstruction,
        context: context,
        userPrompt: userPrompt || ''
    };

    let response = null;
    try {
        response = await fetch(`${baseUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': version
            },
            signal: controller.signal,
            body: JSON.stringify({
                model: model,
                max_tokens: 1200,
                temperature: 0.2,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: JSON.stringify(userPayload)
                    }
                ]
            })
        });
    } catch (err) {
        if (err && err.name === 'AbortError') {
            throw({
                fn: 'BadRequest',
                message: `Anthropic request timed out after ${timeoutMs}ms`
            });
        }
        throw({
            fn: 'BadRequest',
            message: `Anthropic request failed: ${err.message || String(err)}`
        });
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        let detail = '';
        try {
            detail = await response.text();
        } catch (_) {}
        throw({
            fn: 'BadRequest',
            message: `Anthropic returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`
        });
    }

    const payload = await response.json();
    const content = normalizeAnthropicContent(payload?.content);
    const parsed = extractJsonObjectFromText(content);
    if (!parsed) {
        throw({
            fn: 'BadRequest',
            message: 'Anthropic response does not contain valid JSON'
        });
    }

    return {
        draft: getDraftFromParsed(outputType, parsed, 'Anthropic'),
        model: payload?.model || model
    };
}

module.exports = function(app) {
    app.post('/api/ai/generate', acl.hasPermission('ai:generate'), async function(req, res) {
        try {
            const entityType = String(req.body.entityType || 'finding').trim().toLowerCase();
            if (!['finding', 'section'].includes(entityType)) {
                Response.BadParameters(res, `Unsupported entityType "${entityType}". Allowed entity types: finding, section`);
                return;
            }

            const field = String(req.body.field || '').trim();
            if (!field) {
                Response.BadParameters(res, 'Missing required parameter: field');
                return;
            }

            let settings = null;
            try {
                settings = await Settings.getAll();
            } catch (_) {
                settings = null;
            }

            if (!settings || settings?.ai?.public?.enabled === false) {
                Response.Forbidden(res, 'AI integration is disabled in organization settings');
                return;
            }

            const customFields = await CustomField.getAll();
            const fieldCatalog = buildAiFieldCatalog(customFields);
            const fieldByCompositeKey = new Map(
                fieldCatalog.map((entry) => [toPromptCompositeKey(entry.entityType, entry.fieldKey), entry])
            );
            const fieldConfig = fieldByCompositeKey.get(toPromptCompositeKey(entityType, field));

            if (!fieldConfig) {
                Response.BadParameters(res, `Unsupported field "${field}" for entityType "${entityType}"`);
                return;
            }

            const promptDoc = await AiPrompt.findOne({
                entityType: fieldConfig.entityType,
                fieldKey: fieldConfig.fieldKey
            }).select('enabled prompt').lean();
            if (promptDoc && promptDoc.enabled === false) {
                Response.Forbidden(res, `AI generation is disabled for field "${fieldConfig.fieldLabel}"`);
                return;
            }

            const promptTemplate = normalizePromptValue(promptDoc?.prompt) || fieldConfig.defaultPrompt;
            const promptInstruction = renderPromptTemplate(promptTemplate, req.body.context || {});

            const provider = normalizeProvider(req.body.provider) ||
                normalizeProvider(settings?.ai?.public?.defaultProvider) ||
                AI_DEFAULT_PROVIDER;

            if (!AI_PROVIDERS.includes(provider)) {
                Response.BadParameters(res, `Unsupported provider "${provider}". Allowed providers: ${AI_PROVIDERS.join(', ')}`);
                return;
            }

            const openaiApiKey = (settings?.ai?.private?.openaiApiKey || '').trim();
            const openaiBaseUrl = toBaseUrl(settings?.ai?.private?.openaiBaseUrl, AI_PROVIDER_DEFAULTS.openai.baseUrl);
            const openaiModel = (settings?.ai?.private?.openaiModel || AI_PROVIDER_DEFAULTS.openai.model).trim() || AI_PROVIDER_DEFAULTS.openai.model;
            const openaiTimeoutMs = toTimeout(settings?.ai?.private?.openaiTimeoutMs, AI_PROVIDER_DEFAULTS.openai.timeoutMs);

            const anthropicApiKey = (settings?.ai?.private?.anthropicApiKey || '').trim();
            const anthropicBaseUrl = toBaseUrl(settings?.ai?.private?.anthropicBaseUrl, AI_PROVIDER_DEFAULTS.anthropic.baseUrl);
            const anthropicModel = (settings?.ai?.private?.anthropicModel || AI_PROVIDER_DEFAULTS.anthropic.model).trim() || AI_PROVIDER_DEFAULTS.anthropic.model;
            const anthropicVersion = (settings?.ai?.private?.anthropicVersion || AI_PROVIDER_DEFAULTS.anthropic.version).trim() || AI_PROVIDER_DEFAULTS.anthropic.version;
            const anthropicTimeoutMs = toTimeout(settings?.ai?.private?.anthropicTimeoutMs, AI_PROVIDER_DEFAULTS.anthropic.timeoutMs);

            const deepseekApiKey = (settings?.ai?.private?.deepseekApiKey || '').trim();
            const deepseekBaseUrl = toBaseUrl(settings?.ai?.private?.deepseekBaseUrl, AI_PROVIDER_DEFAULTS.deepseek.baseUrl);
            const deepseekModel = (settings?.ai?.private?.deepseekModel || AI_PROVIDER_DEFAULTS.deepseek.model).trim() || AI_PROVIDER_DEFAULTS.deepseek.model;
            const deepseekTimeoutMs = toTimeout(settings?.ai?.private?.deepseekTimeoutMs, AI_PROVIDER_DEFAULTS.deepseek.timeoutMs);

            const ollamaApiKey = (settings?.ai?.private?.ollamaApiKey || '').trim();
            const ollamaBaseUrl = toBaseUrl(settings?.ai?.private?.ollamaBaseUrl, AI_PROVIDER_DEFAULTS.ollama.baseUrl);
            const ollamaModel = (settings?.ai?.private?.ollamaModel || AI_PROVIDER_DEFAULTS.ollama.model).trim() || AI_PROVIDER_DEFAULTS.ollama.model;
            const ollamaTimeoutMs = toTimeout(settings?.ai?.private?.ollamaTimeoutMs, AI_PROVIDER_DEFAULTS.ollama.timeoutMs);

            let result = null;
            if (provider === 'openai') {
                result = await generateWithOpenAICompatible({
                    providerLabel: 'OpenAI',
                    outputType: fieldConfig.outputType,
                    context: req.body.context || {},
                    promptInstruction: promptInstruction,
                    userPrompt: req.body.userPrompt || '',
                    apiKey: openaiApiKey,
                    baseUrl: openaiBaseUrl,
                    model: openaiModel,
                    timeoutMs: openaiTimeoutMs,
                    requireApiKey: true
                });
            } else if (provider === 'anthropic') {
                result = await generateWithAnthropic({
                    outputType: fieldConfig.outputType,
                    context: req.body.context || {},
                    promptInstruction: promptInstruction,
                    userPrompt: req.body.userPrompt || '',
                    apiKey: anthropicApiKey,
                    baseUrl: anthropicBaseUrl,
                    model: anthropicModel,
                    version: anthropicVersion,
                    timeoutMs: anthropicTimeoutMs
                });
            } else if (provider === 'deepseek') {
                result = await generateWithOpenAICompatible({
                    providerLabel: 'DeepSeek',
                    outputType: fieldConfig.outputType,
                    context: req.body.context || {},
                    promptInstruction: promptInstruction,
                    userPrompt: req.body.userPrompt || '',
                    apiKey: deepseekApiKey,
                    baseUrl: deepseekBaseUrl,
                    model: deepseekModel,
                    timeoutMs: deepseekTimeoutMs,
                    requireApiKey: true
                });
            } else {
                result = await generateWithOpenAICompatible({
                    providerLabel: 'Ollama',
                    outputType: fieldConfig.outputType,
                    context: req.body.context || {},
                    promptInstruction: promptInstruction,
                    userPrompt: req.body.userPrompt || '',
                    apiKey: ollamaApiKey,
                    baseUrl: ollamaBaseUrl,
                    model: ollamaModel,
                    timeoutMs: ollamaTimeoutMs,
                    requireApiKey: false
                });
            }

            Response.Ok(res, {
                entityType: fieldConfig.entityType,
                field: field,
                outputType: fieldConfig.outputType,
                draft: result.draft,
                provider: provider,
                model: result.model
            });
        } catch (err) {
            Response.Internal(res, err);
        }
    });
};
