const { AI_PROVIDER_DEFAULTS } = require('./ai-prompts');
const { stringifyLlmPayload } = require('./ai-qa-shared');
const {
    resolveRedactionGuidelinesForRequest,
    getRedactionGuidelinesText,
    appendRedactionGuidelinesToSystemPrompt
} = require('./ai-redaction-guidelines');
const PROVIDER_LABELS = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    deepseek: 'DeepSeek',
    ollama: 'Ollama',
    bedrock: 'AWS Bedrock',
    orcarouter: 'OrcaRouter Cyber Inference'
};

let nodeLlmModule = null;

const loadNodeLlm = async () => {
    if (!nodeLlmModule)
        nodeLlmModule = await import('@node-llm/core');
    return nodeLlmModule;
};

const toBaseUrl = (value, fallback) => String(value || fallback).replace(/\/+$/g, '');

const toTimeout = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const configureChatTemperature = (chat, provider, temperature) => {
    // Bedrock Converse rejects temperature on several newer models.
    if (provider === 'bedrock')
        return chat;
    return chat.withTemperature(temperature);
};

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
};

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
};

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
};

const getDraftFormatInstruction = (outputType) => {
    if (outputType === 'array') {
        return '"draft" must be an array of concise strings.';
    }

    if (outputType === 'text') {
        return '"draft" must be plain text without markdown fences.';
    }

    return '"draft" must be HTML suitable to replace the selected excerpt (inline tags allowed, no markdown fences).';
};

const getSystemPrompt = (outputType, { selectionMode = false } = {}) => {
    const draftFormat = getDraftFormatInstruction(outputType);

    if (selectionMode) {
        return [
            'You are an assistant helping edit pentest report content.',
            'The user selected a specific excerpt from a field. Rewrite ONLY that excerpt based on their instructions and conversation.',
            'Use context.selectedText as the excerpt to rewrite. Do not rewrite unrelated content.',
            'Return ONLY valid JSON with keys:',
            `"reply" as a brief conversational message to the user, and ${draftFormat}`
        ].join(' ');
    }

    if (outputType === 'array') {
        return [
            'You are an assistant writing pentest report content.',
            'If context.currentFieldValue is provided, rewrite ONLY that value and use other context only as supporting reference.',
            'Do not include content from other fields unless it is already present in context.currentFieldValue or explicitly requested.',
            'Return ONLY valid JSON with one key: "draft" as an array of concise strings.'
        ].join(' ');
    }

    if (outputType === 'text') {
        return [
            'You are an assistant writing pentest report content.',
            'If context.currentFieldValue is provided, rewrite ONLY that value and use other context only as supporting reference.',
            'Do not include content from other fields unless it is already present in context.currentFieldValue or explicitly requested.',
            'Return ONLY valid JSON with one key: "draft" as plain text without markdown fences.'
        ].join(' ');
    }

    return [
        'You are an assistant writing pentest report content.',
        'If context.currentFieldValue is provided, rewrite ONLY that value and use other context only as supporting reference.',
        'Do not include content from other fields unless it is already present in context.currentFieldValue or explicitly requested.',
        'Return ONLY valid JSON with one key: "draft" as HTML paragraphs using <p>...</p> without markdown fences.'
    ].join(' ');
};

const resolveProviderConfig = (provider, settings = {}) => {
    const defaults = AI_PROVIDER_DEFAULTS[provider];
    const privateSettings = settings?.ai?.private || {};

    switch (provider) {
        case 'openai':
            return {
                apiKey: (privateSettings.openaiApiKey || '').trim(),
                baseUrl: toBaseUrl(privateSettings.openaiBaseUrl, defaults.baseUrl),
                model: (privateSettings.openaiModel || defaults.model).trim() || defaults.model,
                timeoutMs: toTimeout(privateSettings.openaiTimeoutMs, defaults.timeoutMs),
                requireApiKey: true
            };
        case 'anthropic':
            return {
                apiKey: (privateSettings.anthropicApiKey || '').trim(),
                baseUrl: toBaseUrl(privateSettings.anthropicBaseUrl, defaults.baseUrl),
                model: (privateSettings.anthropicModel || defaults.model).trim() || defaults.model,
                version: (privateSettings.anthropicVersion || defaults.version).trim() || defaults.version,
                timeoutMs: toTimeout(privateSettings.anthropicTimeoutMs, defaults.timeoutMs),
                requireApiKey: true
            };
        case 'deepseek':
            return {
                apiKey: (privateSettings.deepseekApiKey || '').trim(),
                baseUrl: toBaseUrl(privateSettings.deepseekBaseUrl, defaults.baseUrl),
                model: (privateSettings.deepseekModel || defaults.model).trim() || defaults.model,
                timeoutMs: toTimeout(privateSettings.deepseekTimeoutMs, defaults.timeoutMs),
                requireApiKey: true
            };
        case 'ollama':
            return {
                apiKey: (privateSettings.ollamaApiKey || '').trim(),
                baseUrl: toBaseUrl(privateSettings.ollamaBaseUrl, defaults.baseUrl),
                model: (privateSettings.ollamaModel || defaults.model).trim() || defaults.model,
                timeoutMs: toTimeout(privateSettings.ollamaTimeoutMs, defaults.timeoutMs),
                requireApiKey: false
            };
        case 'bedrock': {
            const apiKey = (privateSettings.bedrockApiKey || '').trim();
            const accessKeyId = (privateSettings.bedrockAccessKeyId || '').trim();
            const secretAccessKey = (privateSettings.bedrockSecretAccessKey || '').trim();
            const sessionToken = (privateSettings.bedrockSessionToken || '').trim();
            return {
                apiKey: apiKey,
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
                sessionToken: sessionToken,
                region: (privateSettings.bedrockRegion || defaults.region).trim() || defaults.region,
                model: (privateSettings.bedrockModel || defaults.model).trim() || defaults.model,
                timeoutMs: toTimeout(privateSettings.bedrockTimeoutMs, defaults.timeoutMs),
                requireCredentials: true,
                hasCredentials: Boolean(apiKey || (accessKeyId && secretAccessKey))
            };
        }
        case 'orcarouter':
            return {
                apiKey: (privateSettings.orcarouterApiKey || '').trim(),
                baseUrl: toBaseUrl(privateSettings.orcarouterBaseUrl, defaults.baseUrl),
                model: (privateSettings.orcarouterModel || defaults.model).trim() || defaults.model,
                timeoutMs: toTimeout(privateSettings.orcarouterTimeoutMs, defaults.timeoutMs),
                requireApiKey: true
            };
        default:
            return null;
    }
};

const buildLlmConfig = (provider, providerConfig) => {
    const config = {
        provider: provider,
        requestTimeout: providerConfig.timeoutMs,
        maxRetries: 0
    };

    switch (provider) {
        case 'openai':
            config.openaiApiKey = providerConfig.apiKey;
            config.openaiApiBase = providerConfig.baseUrl;
            break;
        case 'anthropic':
            config.anthropicApiKey = providerConfig.apiKey;
            config.anthropicApiBase = providerConfig.baseUrl;
            break;
        case 'deepseek':
            config.deepseekApiKey = providerConfig.apiKey;
            config.deepseekApiBase = providerConfig.baseUrl;
            break;
        case 'ollama':
            config.ollamaApiBase = providerConfig.baseUrl;
            break;
        // OrcaRouter exposes the OpenAI wire format, so the OpenAI chat transport is the
        // correct adapter. The named `orcarouter` provider keeps its own settings, label,
        // catalog and error surface; only the transport is shared.
        case 'orcarouter':
            config.provider = 'openai';
            config.openaiApiKey = providerConfig.apiKey;
            config.openaiApiBase = providerConfig.baseUrl;
            break;
        case 'bedrock':
            config.bedrockRegion = providerConfig.region;
            if (providerConfig.apiKey) {
                config.bedrockApiKey = providerConfig.apiKey;
            } else {
                config.bedrockAccessKeyId = providerConfig.accessKeyId;
                config.bedrockSecretAccessKey = providerConfig.secretAccessKey;
                if (providerConfig.sessionToken)
                    config.bedrockSessionToken = providerConfig.sessionToken;
            }
            break;
    }

    return config;
};

const getErrorMessage = (err) => {
    if (err === null || err === undefined)
        return 'Unknown error';
    if (typeof err === 'string')
        return err;
    if (typeof err.message === 'string' && err.message.trim())
        return err.message.trim();
    if (typeof err.datas === 'string' && err.datas.trim())
        return err.datas.trim();
    if (typeof err === 'object' && typeof err.fn === 'string' && typeof err.message === 'string')
        return err.message.trim();

    try {
        return JSON.stringify(err);
    } catch (_) {
        return String(err);
    }
};

// Provider error bodies quote the offending credential back, and reach any AI-assist user.
const redactSecrets = (text = '') => String(text)
    .replace(/\b(sk|xai|gsk|pplx|rk)-[A-Za-z0-9_-]{8,}/g, '$1-[redacted]')
    .replace(/\b(AKIA|ASIA)[0-9A-Z]{8,}/g, '$1[redacted]')
    .replace(/\b(sk-ant|anthropic)[A-Za-z0-9_-]{8,}/gi, '$1-[redacted]')
    .replace(/(\/\/[^/\s:@]+):[^/\s@]+@/g, '$1:[redacted]@');

const mapLlmError = (err, providerLabel, timeoutMs) => {
    if (err && err.name === 'AbortError') {
        return {
            fn: 'BadRequest',
            message: `${providerLabel} request timed out after ${timeoutMs}ms`
        };
    }

    if (err && (err.name === 'ConfigurationError' || err.name === 'ProviderNotConfiguredError')) {
        return {
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key.`
        };
    }

    if (err && typeof err.status === 'number') {
        let detail = getErrorMessage(err);
        if (err.body && typeof err.body === 'string')
            detail = err.body;
        else if (err.body)
            detail = JSON.stringify(err.body);

        detail = redactSecrets(detail);

        return {
            fn: 'BadRequest',
            message: `${providerLabel} returned HTTP ${err.status}${detail ? `: ${detail}` : ''}`
        };
    }

    const detail = redactSecrets(getErrorMessage(err));
    if (detail.includes("reading 'message'")) {
        return {
            fn: 'BadRequest',
            message: `${providerLabel} returned an empty or blocked response. Verify model access, guardrails, and request size.`
        };
    }

    if (detail.includes('Bedrock returned no assistant message')) {
        return {
            fn: 'BadRequest',
            message: `${providerLabel} ${detail}`
        };
    }

    return {
        fn: 'BadRequest',
        message: `${providerLabel} request failed: ${detail}`
    };
};

const normalizeChatMessages = (messages = []) => {
    if (!Array.isArray(messages))
        return [];

    return messages
    .map((entry) => {
        const role = String(entry?.role || '').trim().toLowerCase();
        const content = String(entry?.content || '').trim();
        if (!content || !['user', 'assistant'].includes(role))
            return null;
        return { role, content };
    })
    .filter(Boolean);
};

const getChatResponseFromParsed = (outputType, parsed = {}, providerLabel = 'AI provider') => {
    const draft = getDraftFromParsed(outputType, parsed, providerLabel);
    const reply = typeof parsed?.reply === 'string' ? parsed.reply.trim() : '';

    return {
        draft,
        reply
    };
};

// Shared setup for the ask and stream generate paths: resolves the provider and builds
// the chat session, ready to .ask() or .stream().
const prepareGenerateChat = async ({
    provider,
    settings,
    outputType,
    context = {},
    messages = []
}) => {
    const providerLabel = PROVIDER_LABELS[provider] || provider;
    const providerConfig = resolveProviderConfig(provider, settings);

    if (!providerConfig) {
        throw({
            fn: 'BadParameters',
            message: `Unsupported provider "${provider}"`
        });
    }

    if (providerConfig.requireCredentials && !providerConfig.hasCredentials) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key or IAM credentials.`
        });
    }

    if (providerConfig.requireApiKey && !providerConfig.apiKey) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key.`
        });
    }

    const { createLLM } = await loadNodeLlm();
    const llm = createLLM(buildLlmConfig(provider, providerConfig));

    const selectionMode = Boolean(String(context?.selectedText || '').trim());
    const chatHistory = normalizeChatMessages(messages);
    const redactionGuidelines = resolveRedactionGuidelinesForRequest(settings);
    const redactionGuidelinesText = getRedactionGuidelinesText(redactionGuidelines);
    const systemPrompt = appendRedactionGuidelinesToSystemPrompt(
        getSystemPrompt(outputType, { selectionMode }),
        redactionGuidelines
    );

    let chat = configureChatTemperature(llm.chat(providerConfig.model, {
        systemPrompt: systemPrompt
    }), provider, 0.2);

    const requestHeaders = {};
    if (provider === 'anthropic' && providerConfig.version)
        requestHeaders['anthropic-version'] = providerConfig.version;
    if (provider === 'ollama' && providerConfig.apiKey)
        requestHeaders.Authorization = `Bearer ${providerConfig.apiKey}`;
    if (Object.keys(requestHeaders).length > 0)
        chat = chat.withRequestOptions({ headers: requestHeaders });

    chatHistory.forEach((entry) => {
        chat = chat.add(entry.role, entry.content);
    });

    return { chat, providerLabel, providerConfig, selectionMode, redactionGuidelinesText };
};

const finalizeGenerateContent = (content, { outputType, selectionMode, providerLabel, model, finishReason }) => {
    const trimmed = String(content || '').trim();
    if (!trimmed) {
        throw({
            fn: 'BadRequest',
            message: finishReason ?
                `${providerLabel} returned an empty response (finish reason: ${finishReason}).` :
                `${providerLabel} returned an empty response.`
        });
    }

    const parsed = extractJsonObjectFromText(trimmed);
    if (!parsed) {
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} response does not contain valid JSON`
        });
    }

    if (selectionMode) {
        const chatResponse = getChatResponseFromParsed(outputType, parsed, providerLabel);
        return {
            draft: chatResponse.draft,
            reply: chatResponse.reply,
            model: model
        };
    }

    return {
        draft: getDraftFromParsed(outputType, parsed, providerLabel),
        reply: '',
        model: model
    };
};

const generateWithProvider = async ({
    provider,
    settings,
    outputType,
    context = {},
    promptInstruction = '',
    userPrompt = '',
    messages = []
}) => {
    const { chat, providerLabel, providerConfig, selectionMode, redactionGuidelinesText } =
        await prepareGenerateChat({ provider, settings, outputType, context, messages });

    const userPayload = {
        promptInstruction: promptInstruction,
        context: context,
        userPrompt: userPrompt || '',
        redactionGuidelines: redactionGuidelinesText
    };

    let response = null;
    try {
        response = await chat.ask(stringifyLlmPayload(userPayload), {
            requestTimeout: providerConfig.timeoutMs
        });
    } catch (err) {
        throw mapLlmError(err, providerLabel, providerConfig.timeoutMs);
    }

    const content = String(response?.content || response || '');
    return finalizeGenerateContent(content, {
        outputType,
        selectionMode,
        providerLabel,
        model: response?.model || providerConfig.model,
        finishReason: response?.finish_reason || response?.finishReason
    });
};

// Streaming variant of generateWithProvider: re-emits each LLM chunk via onChunk so the
// caller can keep the downstream connection alive past a proxy's idle timeout. Same
// {draft, reply, model} contract; callers uninterested in progress can ignore onChunk.
const generateWithProviderStream = async ({
    provider,
    settings,
    outputType,
    context = {},
    promptInstruction = '',
    userPrompt = '',
    messages = [],
    signal,
    onChunk
}) => {
    const { chat, providerLabel, providerConfig, selectionMode, redactionGuidelinesText } =
        await prepareGenerateChat({ provider, settings, outputType, context, messages });

    const userPayload = {
        promptInstruction: promptInstruction,
        context: context,
        userPrompt: userPrompt || '',
        redactionGuidelines: redactionGuidelinesText
    };

    let content = '';
    let finishReason = null;
    try {
        const stream = chat.stream(stringifyLlmPayload(userPayload), {
            requestTimeout: providerConfig.timeoutMs,
            signal: signal
        });
        for await (const chunk of stream) {
            const delta = String(chunk?.content || '');
            if (delta) {
                content += delta;
                if (typeof onChunk === 'function')
                    onChunk(delta);
            }
            if (chunk?.finish_reason)
                finishReason = chunk.finish_reason;
        }
    } catch (err) {
        throw mapLlmError(err, providerLabel, providerConfig.timeoutMs);
    }

    return finalizeGenerateContent(content, {
        outputType,
        selectionMode,
        providerLabel,
        model: providerConfig.model,
        finishReason
    });
};

const buildQaSystemPrompt = (scopeInstruction = '') => {
    return [
        'You are a senior QA reviewer for penetration test reports.',
        'Review the provided audit snapshot and flag issues that would block or weaken report delivery.',
        scopeInstruction,
        'Return ONLY valid JSON with keys:',
        '"summary" as a brief overall assessment, and',
        '"issues" as an array of objects with keys:',
        '"severity" (error, warning, or info),',
        '"category" (completeness, redaction, customer, instructions, references, imageCaptions, duplicates, or other),',
        '"title" (short issue title),',
        '"message" (actionable explanation),',
        '"location" (general, network, report, finding:<finding title>, section:Name, or field path).',
        'Only flag real problems supported by the snapshot. Do not invent missing data.'
    ].filter(Boolean).join(' ');
};

const QA_SEVERITIES = ['error', 'warning', 'info'];
const QA_CATEGORIES = ['completeness', 'redaction', 'customer', 'instructions', 'references', 'imageCaptions', 'duplicates', 'aiDuplicates', 'aiUnlinkedTranslations', 'other'];

// Dropping these collapses every duplicate/translation pair into an unpaired issue.
const QA_ISSUE_LINK_FIELDS =['vulnerabilityId', 'templateTitle', 'locale', 'reason', 'relatedTemplates', 'relatedTitles'];

const normalizeQaIssueFromParsed = (issue = {}) => {
    const severity = QA_SEVERITIES.includes(issue.severity) ? issue.severity : 'warning';
    const category = QA_CATEGORIES.includes(issue.category) ? issue.category : 'other';

    const normalized = {
        severity: severity,
        category: category,
        title: String(issue.title || 'Issue').trim(),
        message: String(issue.message || '').trim(),
        location: String(issue.location || 'report').trim() || 'report',
        source: 'ai'
    };

    QA_ISSUE_LINK_FIELDS.forEach((field) => {
        if (issue[field] !== undefined && issue[field] !== null)
            normalized[field] = issue[field];
    });

    return normalized;
};

const getQaIssuesFromParsed = (parsed = {}, providerLabel = 'AI provider') => {
    const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : '';
    const rawIssues = Array.isArray(parsed?.issues) ? parsed.issues : [];

    const issues = rawIssues
        .map((issue) => normalizeQaIssueFromParsed(issue))
        .filter((issue) => issue.title && issue.message);

    if (!summary && issues.length === 0) {
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} QA response is missing issues and summary`
        });
    }

    return {
        summary: summary,
        issues: issues
    };
};

const runQaWithProvider = async ({
    provider,
    settings,
    auditSnapshot = {},
    qaChecks = {},
    redactionGuidelines = {},
    redactionGuidelinesText = '',
    qaInstructions = {},
    qaInstructionsText = ''
}) => {
    const { buildEnabledQaChecksPrompt } = require('./ai-qa-checks');
    const scopeInstruction = buildEnabledQaChecksPrompt(qaChecks);
    const providerLabel = PROVIDER_LABELS[provider] || provider;
    const providerConfig = resolveProviderConfig(provider, settings);

    if (!providerConfig) {
        throw({
            fn: 'BadParameters',
            message: `Unsupported provider "${provider}"`
        });
    }

    if (providerConfig.requireCredentials && !providerConfig.hasCredentials) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key or IAM credentials.`
        });
    }

    if (providerConfig.requireApiKey && !providerConfig.apiKey) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key.`
        });
    }

    const { createLLM } = await loadNodeLlm();
    const llm = createLLM(buildLlmConfig(provider, providerConfig));

    let chat = configureChatTemperature(llm.chat(providerConfig.model, {
        systemPrompt: buildQaSystemPrompt(scopeInstruction)
    }), provider, 0.1);

    const requestHeaders = {};
    if (provider === 'anthropic' && providerConfig.version)
        requestHeaders['anthropic-version'] = providerConfig.version;
    if (provider === 'ollama' && providerConfig.apiKey)
        requestHeaders.Authorization = `Bearer ${providerConfig.apiKey}`;
    if (Object.keys(requestHeaders).length > 0)
        chat = chat.withRequestOptions({ headers: requestHeaders });

    const userPayload = {
        task: 'audit_report_qa',
        audit: auditSnapshot,
        enabledChecks: Object.keys(qaChecks || {}).filter((key) => qaChecks[key] !== false),
        redactionGuidelines: redactionGuidelinesText,
        qaInstructions: qaInstructionsText
    };

    let response = null;
    try {
        response = await chat.ask(stringifyLlmPayload(userPayload), {
            requestTimeout: providerConfig.timeoutMs
        });
    } catch (err) {
        throw mapLlmError(err, providerLabel, providerConfig.timeoutMs);
    }

    const content = String(response?.content || response || '').trim();
    if (!content) {
        const finishReason = response?.finish_reason || response?.finishReason;
        throw({
            fn: 'BadRequest',
            message: finishReason ?
                `${providerLabel} returned an empty QA response (finish reason: ${finishReason}).` :
                `${providerLabel} returned an empty QA response.`
        });
    }

    const parsed = extractJsonObjectFromText(content);
    if (!parsed) {
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} QA response does not contain valid JSON`
        });
    }

    const qaResponse = getQaIssuesFromParsed(parsed, providerLabel);
    return {
        summary: qaResponse.summary,
        issues: qaResponse.issues,
        model: response?.model || providerConfig.model
    };
};

const buildVulnerabilityTemplateQaSystemPrompt = (scopeInstruction = '') => {
    return [
        'You are a senior penetration testing knowledge manager reviewing reusable vulnerability templates.',
        'Review the provided vulnerability template snapshot and flag content quality issues such as missing sections, weak wording, or inconsistent remediation.',
        'Templates are reusable library entries, not live audit findings. Do not review report delivery readiness or finding validation workflow.',
        scopeInstruction,
        'Return ONLY valid JSON with keys:',
        '"summary" as a brief overall assessment, and',
        '"issues" as an array of objects with keys:',
        '"severity" (error, warning, or info),',
        '"category" (completeness, redaction, customer, instructions, references, imageCaptions, duplicates, or other),',
        '"title" (short issue title),',
        '"message" (actionable explanation),',
        '"location" (vulnerability:<template title> or vulnerability:<template title>/<field>). For a custom-field issue, use vulnerability:<template title>/custom-field:<exact custom field label>.',
        'Only flag real problems supported by the snapshot. Do not invent missing data.'
    ].filter(Boolean).join(' ');
};

const runVulnerabilityTemplateQaWithProvider = async ({
    provider,
    settings,
    templateSnapshot = {},
    qaChecks = {},
    redactionGuidelines = {},
    redactionGuidelinesText = '',
    qaInstructions = {},
    qaInstructionsText = ''
}) => {
    const { buildEnabledQaChecksPrompt } = require('./ai-qa-checks');
    const scopeInstruction = buildEnabledQaChecksPrompt(qaChecks);
    const providerLabel = PROVIDER_LABELS[provider] || provider;
    const providerConfig = resolveProviderConfig(provider, settings);

    if (!providerConfig) {
        throw({
            fn: 'BadParameters',
            message: `Unsupported provider "${provider}"`
        });
    }

    if (providerConfig.requireCredentials && !providerConfig.hasCredentials) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key or IAM credentials.`
        });
    }

    if (providerConfig.requireApiKey && !providerConfig.apiKey) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key.`
        });
    }

    const { createLLM } = await loadNodeLlm();
    const llm = createLLM(buildLlmConfig(provider, providerConfig));

    let chat = configureChatTemperature(llm.chat(providerConfig.model, {
        systemPrompt: buildVulnerabilityTemplateQaSystemPrompt(scopeInstruction)
    }), provider, 0.1);

    const requestHeaders = {};
    if (provider === 'anthropic' && providerConfig.version)
        requestHeaders['anthropic-version'] = providerConfig.version;
    if (provider === 'ollama' && providerConfig.apiKey)
        requestHeaders.Authorization = `Bearer ${providerConfig.apiKey}`;
    if (Object.keys(requestHeaders).length > 0)
        chat = chat.withRequestOptions({ headers: requestHeaders });

    const userPayload = {
        task: 'vulnerability_template_qa',
        template: templateSnapshot,
        enabledChecks: Object.keys(qaChecks || {}).filter((key) => qaChecks[key] !== false),
        redactionGuidelines: redactionGuidelinesText,
        qaInstructions: qaInstructionsText
    };

    let response = null;
    try {
        response = await chat.ask(stringifyLlmPayload(userPayload), {
            requestTimeout: providerConfig.timeoutMs
        });
    } catch (err) {
        throw mapLlmError(err, providerLabel, providerConfig.timeoutMs);
    }

    const content = String(response?.content || response || '').trim();
    if (!content) {
        const finishReason = response?.finish_reason || response?.finishReason;
        throw({
            fn: 'BadRequest',
            message: finishReason ?
                `${providerLabel} returned an empty QA response (finish reason: ${finishReason}).` :
                `${providerLabel} returned an empty QA response.`
        });
    }

    const parsed = extractJsonObjectFromText(content);
    if (!parsed) {
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} QA response does not contain valid JSON`
        });
    }

    const qaResponse = getQaIssuesFromParsed(parsed, providerLabel);
    return {
        summary: qaResponse.summary,
        issues: qaResponse.issues,
        model: response?.model || providerConfig.model
    };
};

const buildVulnerabilityUnlinkedTranslationSystemPrompt = () => {
    return [
        'You are a senior penetration testing knowledge manager reviewing a multilingual vulnerability template library.',
        'Each template record should contain every language version in its details array. Templates stored as separate records per language should be merged.',
        'Identify separate template records (different vulnerabilityId) that describe the SAME security issue in DIFFERENT languages and should be merged together.',
        'Only flag cross-language pairs or groups. Do not flag templates that already share the same vulnerabilityId.',
        'Do not flag templates that are merely similar but describe different issues.',
        'Return ONLY valid JSON with keys:',
        '"summary" as a brief overall assessment, and',
        '"issues" as an array of objects with keys:',
        '"severity" (error, warning, or info),',
        '"title" (short issue title),',
        '"message" (actionable explanation),',
        '"location" (vulnerability:<template title>),',
        '"vulnerabilityId" (template id when available),',
        '"templateTitle" (template title),',
        '"locale" (template language code),',
        '"relatedTemplates" as an array of objects with keys "vulnerabilityId", "title", "locale", and optional "reason".',
        'Only flag supported unlinked translation relationships. Return an empty issues array when none are found.'
    ].join(' ');
};

const runVulnerabilityUnlinkedTranslationQaWithProvider = async ({
    provider,
    settings,
    mode = 'all',
    target = null,
    templates = []
}) => {
    const providerLabel = PROVIDER_LABELS[provider] || provider;
    const providerConfig = resolveProviderConfig(provider, settings);

    if (!providerConfig) {
        throw({
            fn: 'BadParameters',
            message: `Unsupported provider "${provider}"`
        });
    }

    if (providerConfig.requireCredentials && !providerConfig.hasCredentials) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key or IAM credentials.`
        });
    }

    if (providerConfig.requireApiKey && !providerConfig.apiKey) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key.`
        });
    }

    const { createLLM } = await loadNodeLlm();
    const llm = createLLM(buildLlmConfig(provider, providerConfig));

    let chat = configureChatTemperature(llm.chat(providerConfig.model, {
        systemPrompt: buildVulnerabilityUnlinkedTranslationSystemPrompt()
    }), provider, 0.1);

    const requestHeaders = {};
    if (provider === 'anthropic' && providerConfig.version)
        requestHeaders['anthropic-version'] = providerConfig.version;
    if (provider === 'ollama' && providerConfig.apiKey)
        requestHeaders.Authorization = `Bearer ${providerConfig.apiKey}`;
    if (Object.keys(requestHeaders).length > 0)
        chat = chat.withRequestOptions({ headers: requestHeaders });

    const userPayload = {
        task: 'vulnerability_template_unlinked_translation_detection',
        mode: mode,
        target: target,
        templates: templates
    };

    let response = null;
    try {
        response = await chat.ask(stringifyLlmPayload(userPayload), {
            requestTimeout: providerConfig.timeoutMs
        });
    } catch (err) {
        throw mapLlmError(err, providerLabel, providerConfig.timeoutMs);
    }

    const content = String(response?.content || response || '').trim();
    if (!content) {
        const finishReason = response?.finish_reason || response?.finishReason;
        throw({
            fn: 'BadRequest',
            message: finishReason ?
                `${providerLabel} returned an empty QA response (finish reason: ${finishReason}).` :
                `${providerLabel} returned an empty QA response.`
        });
    }

    const parsed = extractJsonObjectFromText(content);
    if (!parsed) {
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} QA response does not contain valid JSON`
        });
    }

    const qaResponse = getQaIssuesFromParsed(parsed, providerLabel);
    return {
        summary: qaResponse.summary,
        issues: qaResponse.issues,
        model: response?.model || providerConfig.model
    };
};

const buildVulnerabilityDuplicateSystemPrompt = () => {
    return [
        'You are a senior penetration testing knowledge manager reviewing a vulnerability template database.',
        'Identify templates that describe the SAME specific underlying security issue, even when titles differ or wording is paraphrased.',
        'Do not flag templates that only share a broad vulnerability class unless they would be redundant entries for the same finding in a report.',
        'Return ONLY valid JSON with keys:',
        '"summary" as a brief overall assessment, and',
        '"issues" as an array of objects with keys:',
        '"severity" (error, warning, or info),',
        '"title" (short issue title),',
        '"message" (actionable explanation),',
        '"location" (vulnerability:<template title>),',
        '"vulnerabilityId" (template id when available),',
        '"templateTitle" (template title),',
        '"relatedTemplates" as an array of objects with keys "vulnerabilityId", "title", and optional "reason".',
        'Only flag supported duplicate relationships. Return an empty issues array when none are found.'
    ].join(' ');
};

const runVulnerabilityDuplicateQaWithProvider = async ({
    provider,
    settings,
    locale = '',
    mode = 'all',
    target = null,
    templates = []
}) => {
    const providerLabel = PROVIDER_LABELS[provider] || provider;
    const providerConfig = resolveProviderConfig(provider, settings);

    if (!providerConfig) {
        throw({
            fn: 'BadParameters',
            message: `Unsupported provider "${provider}"`
        });
    }

    if (providerConfig.requireCredentials && !providerConfig.hasCredentials) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key or IAM credentials.`
        });
    }

    if (providerConfig.requireApiKey && !providerConfig.apiKey) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key.`
        });
    }

    const { createLLM } = await loadNodeLlm();
    const llm = createLLM(buildLlmConfig(provider, providerConfig));

    let chat = configureChatTemperature(llm.chat(providerConfig.model, {
        systemPrompt: buildVulnerabilityDuplicateSystemPrompt()
    }), provider, 0.1);

    const requestHeaders = {};
    if (provider === 'anthropic' && providerConfig.version)
        requestHeaders['anthropic-version'] = providerConfig.version;
    if (provider === 'ollama' && providerConfig.apiKey)
        requestHeaders.Authorization = `Bearer ${providerConfig.apiKey}`;
    if (Object.keys(requestHeaders).length > 0)
        chat = chat.withRequestOptions({ headers: requestHeaders });

    const userPayload = {
        task: 'vulnerability_template_duplicate_detection',
        locale: locale,
        mode: mode,
        target: target,
        templates: templates
    };

    let response = null;
    try {
        response = await chat.ask(stringifyLlmPayload(userPayload), {
            requestTimeout: providerConfig.timeoutMs
        });
    } catch (err) {
        throw mapLlmError(err, providerLabel, providerConfig.timeoutMs);
    }

    const content = String(response?.content || response || '').trim();
    if (!content) {
        const finishReason = response?.finish_reason || response?.finishReason;
        throw({
            fn: 'BadRequest',
            message: finishReason ?
                `${providerLabel} returned an empty duplicate-detection response (finish reason: ${finishReason}).` :
                `${providerLabel} returned an empty duplicate-detection response.`
        });
    }

    const parsed = extractJsonObjectFromText(content);
    if (!parsed) {
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} duplicate-detection response does not contain valid JSON`
        });
    }

    const qaResponse = getQaIssuesFromParsed(parsed, providerLabel);
    return {
        summary: qaResponse.summary,
        issues: qaResponse.issues,
        model: response?.model || providerConfig.model
    };
};

const testProviderConnection = async (provider, settings = {}) => {
    const providerLabel = PROVIDER_LABELS[provider] || provider;
    const providerConfig = resolveProviderConfig(provider, settings);

    if (!providerConfig) {
        throw({
            fn: 'BadParameters',
            message: `Unsupported provider "${provider}"`
        });
    }

    if (providerConfig.requireCredentials && !providerConfig.hasCredentials) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key or IAM credentials.`
        });
    }

    if (providerConfig.requireApiKey && !providerConfig.apiKey) {
        throw({
            fn: 'BadParameters',
            message: `${providerLabel} provider is not configured. Set API key.`
        });
    }

    const { createLLM } = await loadNodeLlm();
    const llm = createLLM(buildLlmConfig(provider, providerConfig));

    let chat = configureChatTemperature(llm.chat(providerConfig.model, {
        systemPrompt: 'Reply with the single word OK and nothing else.'
    }), provider, 0);

    const requestHeaders = {};
    if (provider === 'anthropic' && providerConfig.version)
        requestHeaders['anthropic-version'] = providerConfig.version;
    if (provider === 'ollama' && providerConfig.apiKey)
        requestHeaders.Authorization = `Bearer ${providerConfig.apiKey}`;
    if (Object.keys(requestHeaders).length > 0)
        chat = chat.withRequestOptions({ headers: requestHeaders });

    const testTimeoutMs = Math.min(providerConfig.timeoutMs, 15000);
    let response = null;
    try {
        response = await chat.ask('Reply with OK.', {
            requestTimeout: testTimeoutMs
        });
    } catch (err) {
        throw mapLlmError(err, providerLabel, testTimeoutMs);
    }

    const content = String(response?.content || response || '').trim();
    if (!content) {
        throw({
            fn: 'BadRequest',
            message: `${providerLabel} returned an empty response.`
        });
    }

    return {
        ok: true,
        provider: provider,
        model: response?.model || providerConfig.model
    };
};

module.exports = {
    generateWithProvider,
    generateWithProviderStream,
    runQaWithProvider,
    runVulnerabilityTemplateQaWithProvider,
    runVulnerabilityUnlinkedTranslationQaWithProvider,
    runVulnerabilityDuplicateQaWithProvider,
    testProviderConnection,
    // Exported for tests
    extractJsonObjectFromText,
    getQaIssuesFromParsed,
    getDraftFromParsed,
    normalizeChatMessages,
    mapLlmError,
    buildLlmConfig,
    configureChatTemperature
};
