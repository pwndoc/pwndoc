const Response = require('../lib/httpResponse.js');
const acl = require('../lib/auth').acl;
const Settings = require('mongoose').model('Settings');
const { getAiPromptsFromSettings } = require('../lib/ai-prompts');

const toBaseUrl = (value, fallback) => String(value || fallback).replace(/\/+$/g, '');
const toTimeout = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const OPENAI_BASE_URL = toBaseUrl(process.env.AI_OPENAI_BASE_URL, 'https://api.openai.com/v1');
const OPENAI_MODEL = process.env.AI_OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_TIMEOUT_MS = toTimeout(process.env.AI_OPENAI_TIMEOUT_MS, 30000);

const DEEPSEEK_BASE_URL = toBaseUrl(process.env.AI_DEEPSEEK_BASE_URL, 'https://api.deepseek.com/v1');
const DEEPSEEK_MODEL = process.env.AI_DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_TIMEOUT_MS = toTimeout(process.env.AI_DEEPSEEK_TIMEOUT_MS, 30000);

const OLLAMA_BASE_URL = toBaseUrl(process.env.AI_OLLAMA_BASE_URL, 'http://localhost:11434/v1');
const OLLAMA_MODEL = process.env.AI_OLLAMA_MODEL || 'llama3.1';
const OLLAMA_TIMEOUT_MS = toTimeout(process.env.AI_OLLAMA_TIMEOUT_MS, 60000);

const ANTHROPIC_BASE_URL = toBaseUrl(process.env.AI_ANTHROPIC_BASE_URL, 'https://api.anthropic.com/v1');
const ANTHROPIC_MODEL = process.env.AI_ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const ANTHROPIC_TIMEOUT_MS = toTimeout(process.env.AI_ANTHROPIC_TIMEOUT_MS, 30000);
const ANTHROPIC_VERSION = process.env.AI_ANTHROPIC_VERSION || '2023-06-01';

const SUPPORTED_FIELDS = ['description', 'observation', 'remediation', 'references'];
const SUPPORTED_PROVIDERS = ['mock', 'openai', 'anthropic', 'deepseek', 'ollama'];

const escapeHtml = (value = '') => {
    return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const normalizeContextValue = (value) => {
    if (value === null || value === undefined)
        return '';
    if (Array.isArray(value))
        return value.join(', ');
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

const uniqStrings = (values = []) => {
    return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

const buildMockDraft = (field, context = {}, promptInstruction = '', userPrompt = '') => {
    const title = escapeHtml(context.title || 'the identified issue');
    const vulnType = escapeHtml(context.vulnType || 'security');
    const observation = escapeHtml(context.observation || '');
    const description = escapeHtml(context.description || '');
    const remediation = escapeHtml(context.remediation || '');
    const prompt = escapeHtml(userPrompt || promptInstruction || '');

    if (field === 'references') {
        const output = [];
        if (prompt)
            output.push(prompt);
        output.push(`OWASP Testing Guide - ${title}`);
        if (vulnType)
            output.push(`${vulnType} Security Verification Reference`);
        return uniqStrings([...output, ...toReferenceArray(context.references)]).slice(0, 5);
    }

    const firstParagraph = prompt || `Draft for ${field} related to ${title}.`;
    let secondParagraph = '';
    if (field === 'description') {
        secondParagraph = observation ?
            `Observed behavior: ${observation}` :
            'Further technical validation should document attack prerequisites and impact boundaries.';
    } else if (field === 'observation') {
        secondParagraph = description ?
            `Context from description: ${description}` :
            'Capture reproducible steps, affected components, and attacker-controlled conditions.';
    } else if (field === 'remediation') {
        secondParagraph = remediation ?
            `Existing remediation notes: ${remediation}` :
            'Prioritize practical controls, ownership, and verification steps to reduce risk.';
    }

    return `<p>${firstParagraph}</p><p>${secondParagraph}</p>`;
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

const getDraftFromParsed = (field, parsed = {}, providerLabel = 'AI provider') => {
    if (field === 'references') {
        const refs = toReferenceArray(parsed.references || parsed[field]);
        if (refs.length === 0) {
            throw({
                fn: 'BadRequest',
                message: `${providerLabel} response is missing valid references`
            });
        }
        return refs;
    }

    const raw = parsed[field];
    if (typeof raw !== 'string' || !raw.trim()) {
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} response is missing a valid "${field}" value`
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

const generateWithOpenAICompatible = async ({
    providerLabel,
    field,
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
    const systemPrompt = [
        'You are an assistant writing pentest report finding content.',
        field === 'references' ?
            'Return ONLY valid JSON with one key: "references" as an array of concise strings.' :
            `Return ONLY valid JSON with one key: "${field}" as HTML paragraphs using <p>...</p> without markdown fences.`
    ].join(' ');

    const userPayload = {
        field: field,
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
            message: `${providerLabel} response does not contain valid JSON for "${field}"`
        });
    }

    return {
        draft: getDraftFromParsed(field, parsed, providerLabel),
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
    field,
    context = {},
    promptInstruction = '',
    userPrompt = '',
    apiKey = ''
}) => {
    if (!apiKey) {
        throw({
            fn: 'BadParameters',
            message: 'Anthropic provider is not configured. Set API key.'
        });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
    const systemPrompt = [
        'You are an assistant writing pentest report finding content.',
        field === 'references' ?
            'Return ONLY valid JSON with one key: "references" as an array of concise strings.' :
            `Return ONLY valid JSON with one key: "${field}" as HTML paragraphs using <p>...</p> without markdown fences.`
    ].join(' ');

    const userPayload = {
        field: field,
        promptInstruction: promptInstruction,
        context: context,
        userPrompt: userPrompt || ''
    };

    let response = null;
    try {
        response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': ANTHROPIC_VERSION
            },
            signal: controller.signal,
            body: JSON.stringify({
                model: ANTHROPIC_MODEL,
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
                message: `Anthropic request timed out after ${ANTHROPIC_TIMEOUT_MS}ms`
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
            message: `Anthropic response does not contain valid JSON for "${field}"`
        });
    }

    return {
        draft: getDraftFromParsed(field, parsed, 'Anthropic'),
        model: payload?.model || ANTHROPIC_MODEL
    };
}

module.exports = function(app) {
    app.post('/api/ai/generate', acl.hasPermission('ai:generate'), async function(req, res) {
        try {
            const field = req.body.field;
            if (!field) {
                Response.BadParameters(res, 'Missing required parameter: field');
                return;
            }

            if (!SUPPORTED_FIELDS.includes(field)) {
                Response.BadParameters(res, `Unsupported field "${field}". Allowed fields: ${SUPPORTED_FIELDS.join(', ')}`);
                return;
            }

            let settings = null;
            try {
                settings = await Settings.getAll();
            } catch (_) {
                settings = null;
            }

            const prompts = getAiPromptsFromSettings(settings || {});
            const promptInstruction = renderPromptTemplate(prompts[field], req.body.context || {});

            const provider = normalizeProvider(req.body.provider) ||
                normalizeProvider(settings?.ai?.public?.defaultProvider) ||
                normalizeProvider(process.env.AI_PROVIDER) ||
                'mock';

            if (!SUPPORTED_PROVIDERS.includes(provider)) {
                Response.BadParameters(res, `Unsupported provider "${provider}". Allowed providers: ${SUPPORTED_PROVIDERS.join(', ')}`);
                return;
            }

            const openaiApiKey = (settings?.ai?.private?.openaiApiKey || process.env.AI_OPENAI_API_KEY || '').trim();
            const anthropicApiKey = (settings?.ai?.private?.anthropicApiKey || process.env.AI_ANTHROPIC_API_KEY || '').trim();
            const deepseekApiKey = (settings?.ai?.private?.deepseekApiKey || process.env.AI_DEEPSEEK_API_KEY || '').trim();
            const ollamaApiKey = (settings?.ai?.private?.ollamaApiKey || process.env.AI_OLLAMA_API_KEY || '').trim();
            const ollamaBaseUrl = toBaseUrl(settings?.ai?.private?.ollamaBaseUrl, OLLAMA_BASE_URL);
            const ollamaModel = (settings?.ai?.private?.ollamaModel || OLLAMA_MODEL).trim() || OLLAMA_MODEL;

            let result = null;
            if (provider === 'openai') {
                result = await generateWithOpenAICompatible({
                    providerLabel: 'OpenAI',
                    field: field,
                    context: req.body.context || {},
                    promptInstruction: promptInstruction,
                    userPrompt: req.body.userPrompt || '',
                    apiKey: openaiApiKey,
                    baseUrl: OPENAI_BASE_URL,
                    model: OPENAI_MODEL,
                    timeoutMs: OPENAI_TIMEOUT_MS,
                    requireApiKey: true
                });
            } else if (provider === 'anthropic') {
                result = await generateWithAnthropic({
                    field: field,
                    context: req.body.context || {},
                    promptInstruction: promptInstruction,
                    userPrompt: req.body.userPrompt || '',
                    apiKey: anthropicApiKey
                });
            } else if (provider === 'deepseek') {
                result = await generateWithOpenAICompatible({
                    providerLabel: 'DeepSeek',
                    field: field,
                    context: req.body.context || {},
                    promptInstruction: promptInstruction,
                    userPrompt: req.body.userPrompt || '',
                    apiKey: deepseekApiKey,
                    baseUrl: DEEPSEEK_BASE_URL,
                    model: DEEPSEEK_MODEL,
                    timeoutMs: DEEPSEEK_TIMEOUT_MS,
                    requireApiKey: true
                });
            } else if (provider === 'ollama') {
                result = await generateWithOpenAICompatible({
                    providerLabel: 'Ollama',
                    field: field,
                    context: req.body.context || {},
                    promptInstruction: promptInstruction,
                    userPrompt: req.body.userPrompt || '',
                    apiKey: ollamaApiKey,
                    baseUrl: ollamaBaseUrl,
                    model: ollamaModel,
                    timeoutMs: OLLAMA_TIMEOUT_MS,
                    requireApiKey: false
                });
            } else {
                result = {
                    draft: buildMockDraft(field, req.body.context || {}, promptInstruction, req.body.userPrompt || ''),
                    model: 'pwndoc-template-v1'
                };
            }

            Response.Ok(res, {
                field: field,
                draft: result.draft,
                provider: provider,
                model: result.model
            });
        } catch (err) {
            Response.Internal(res, err);
        }
    });
};
