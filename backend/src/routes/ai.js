const Response = require('../lib/httpResponse.js');
const acl = require('../lib/auth').acl;
const Settings = require('mongoose').model('Settings');
const Audit = require('mongoose').model('Audit');
const Vulnerability = require('mongoose').model('Vulnerability');
const CustomField = require('mongoose').model('CustomField');
const AiPrompt = require('mongoose').model('AiPrompt');
const { generateWithProvider } = require('../lib/ai-client');
const { runAuditQa } = require('../lib/ai-qa');
const {
    runVulnerabilityQa,
    runAllVulnerabilitiesQa
} = require('../lib/ai-vuln-qa');
const {
    computeAuditQaFingerprint,
    getCachedQaReport,
    buildQaReportCache,
    formatQaReportResponse
} = require('../lib/ai-qa-cache');
const {
    AI_PROVIDERS,
    AI_DEFAULT_PROVIDER,
    normalizePromptValue,
    toPromptCompositeKey,
    buildAiFieldCatalog,
    buildEnabledFieldPrompts
} = require('../lib/ai-prompts');

const ALLOWED_ENTITY_TYPES = ['finding', 'section'];

const normalizeContextValue = (value) => {
    if (value === null || value === undefined)
        return '';
    if (Array.isArray(value))
        return value.join(', ');
    if (typeof value === 'object')
        return JSON.stringify(value);
    return String(value);
};

const renderPromptTemplate = (template = '', context = {}) => {
    const source = String(template || '');
    return source.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
        return normalizeContextValue(context[key]);
    }).trim();
};

const normalizeProvider = (provider) => {
    if (!provider || typeof provider !== 'string')
        return null;
    return provider.toLowerCase().trim();
};

const isAllowedEntityType = (entityType) => {
    return ALLOWED_ENTITY_TYPES.includes(entityType);
};

const handleAiGenerate = async function(req, res) {
    try {
        const entityType = String(req.body.entityType || 'finding').trim().toLowerCase();
        if (!isAllowedEntityType(entityType)) {
            Response.BadParameters(res, 'Unsupported entityType. Allowed entity types: finding, section');
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
            Response.BadParameters(res, 'Unsupported field for the requested entityType');
            return;
        }

        const promptDoc = await AiPrompt.findOne({
            entityType: fieldConfig.entityType,
            fieldKey: fieldConfig.fieldKey
        }).select('enabled prompt').lean();
        if (promptDoc && promptDoc.enabled === false) {
            Response.Forbidden(res, 'AI generation is disabled for the requested field');
            return;
        }

        const promptTemplate = normalizePromptValue(promptDoc?.prompt) || fieldConfig.defaultPrompt;
        let promptInstruction = renderPromptTemplate(promptTemplate, req.body.context || {});

        const provider = normalizeProvider(req.body.provider) ||
            normalizeProvider(settings?.ai?.public?.defaultProvider) ||
            AI_DEFAULT_PROVIDER;

        if (!AI_PROVIDERS.includes(provider)) {
            Response.BadParameters(res, 'Unsupported provider');
            return;
        }

        const context = req.body.context || {};
        const selectedText = String(context.selectedText || '').trim();
        const userPrompt = String(req.body.userPrompt || '').trim();
        const selectionMode = Boolean(selectedText);

        if (selectionMode && !userPrompt) {
            Response.BadParameters(res, 'Missing required parameter: userPrompt');
            return;
        }

        const chatMessages = req.body.messages || [];

        if (!selectionMode) {
            const promptOverride = String(req.body.promptInstruction || '').trim();
            if (promptOverride)
                promptInstruction = promptOverride;
            else if (userPrompt && chatMessages.length === 0)
                promptInstruction = userPrompt;
        }

        if (!selectionMode && !promptInstruction) {
            Response.BadParameters(res, 'Missing required parameter: userPrompt');
            return;
        }

        const result = await generateWithProvider({
            provider: provider,
            settings: settings,
            outputType: fieldConfig.outputType,
            context: context,
            promptInstruction: promptInstruction,
            userPrompt: userPrompt,
            messages: chatMessages
        });

        Response.Ok(res, {
            entityType: fieldConfig.entityType,
            field: field,
            outputType: fieldConfig.outputType,
            draft: result.draft,
            reply: result.reply || '',
            provider: provider,
            model: result.model
        });
    } catch (err) {
        Response.Internal(res, err);
    }
};

const handleAiQa = async function(req, res) {
    try {
        const auditId = String(req.body.auditId || '').trim();
        if (!auditId) {
            Response.BadParameters(res, 'Missing required parameter: auditId');
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

        const audit = await Audit.getAudit(
            acl.isAllowed(req.decodedToken.role, 'audits:read-all'),
            auditId,
            req.decodedToken.id
        );

        const provider = normalizeProvider(req.body.provider) ||
            normalizeProvider(settings?.ai?.public?.defaultProvider) ||
            AI_DEFAULT_PROVIDER;

        if (!AI_PROVIDERS.includes(provider)) {
            Response.BadParameters(res, 'Unsupported provider');
            return;
        }

        const auditObject = typeof audit.toObject === 'function' ? audit.toObject() : audit;

        const cachedReport = getCachedQaReport(auditObject);
        if (cachedReport) {
            Response.Ok(res, {
                auditId: auditId,
                ...cachedReport
            });
            return;
        }

        const result = await runAuditQa({
            audit: auditObject,
            settings: settings,
            provider: provider
        });

        const fingerprint = computeAuditQaFingerprint(auditObject);
        const qaReport = buildQaReportCache(fingerprint, result);
        await Audit.saveLatestQaReport(auditId, qaReport);

        Response.Ok(res, {
            auditId: auditId,
            ...formatQaReportResponse(qaReport, {
                cached: false,
                outdated: false
            })
        });
    } catch (err) {
        Response.Internal(res, err);
    }
};

const handleVulnerabilityQa = async function(req, res) {
    try {
        const locale = String(req.body.locale || '').trim();
        if (!locale) {
            Response.BadParameters(res, 'Missing required parameter: locale');
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

        const provider = normalizeProvider(req.body.provider) ||
            normalizeProvider(settings?.ai?.public?.defaultProvider) ||
            AI_DEFAULT_PROVIDER;

        if (!AI_PROVIDERS.includes(provider)) {
            Response.BadParameters(res, 'Unsupported provider');
            return;
        }

        const allVulnerabilities = await Vulnerability.getAll();
        const vulnerabilityId = String(req.body.vulnerabilityId || '').trim();

        if (vulnerabilityId) {
            const vulnerability = allVulnerabilities.find((entry) => {
                return String(entry._id) === vulnerabilityId;
            });

            if (!vulnerability) {
                Response.NotFound(res, 'Vulnerability not found');
                return;
            }

            const result = await runVulnerabilityQa({
                vulnerability: typeof vulnerability.toObject === 'function' ?
                    vulnerability.toObject() :
                    vulnerability,
                locale: locale,
                settings: settings,
                provider: provider,
                allVulnerabilities: allVulnerabilities.map((entry) => {
                    return typeof entry.toObject === 'function' ? entry.toObject() : entry;
                })
            });

            Response.Ok(res, result);
            return;
        }

        const result = await runAllVulnerabilitiesQa({
            vulnerabilities: allVulnerabilities.map((entry) => {
                return typeof entry.toObject === 'function' ? entry.toObject() : entry;
            }),
            locale: locale,
            settings: settings,
            provider: provider
        });

        Response.Ok(res, result);
    } catch (err) {
        Response.Internal(res, err);
    }
};

const handleAiEnabledFields = async (req, res) => {
    try {
        const entityType = String(req.query.entityType || '').trim().toLowerCase();
        if (!isAllowedEntityType(entityType)) {
            Response.BadParameters(res, 'Unsupported entityType. Allowed entity types: finding, section');
            return;
        }

        const settings = await Settings.getAll();
        if (!settings || settings?.ai?.public?.enabled === false) {
            Response.Ok(res, { fields: [] });
            return;
        }

        const customFields = await CustomField.getAll();
        const fieldCatalog = buildAiFieldCatalog(customFields);
        const promptRows = await AiPrompt.find({}).select('entityType fieldKey enabled prompt').lean();
        const fields = buildEnabledFieldPrompts(fieldCatalog, promptRows, entityType);

        Response.Ok(res, { fields });
    } catch (err) {
        Response.Internal(res, err);
    }
};

module.exports = function(app) {
    app.get('/api/ai/enabled-fields', acl.hasPermission('ai:generate'), handleAiEnabledFields);
    app.post('/api/ai/generate', acl.hasPermission('ai:generate'), handleAiGenerate);
    app.post('/api/ai/qa', acl.hasPermission('ai:qa'), handleAiQa);
    app.post('/api/ai/vulnerabilities/qa', acl.hasPermission('ai:qa'), handleVulnerabilityQa);
};
