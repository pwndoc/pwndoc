const Response = require('../lib/httpResponse.js');
const acl = require('../lib/auth').acl;
const Settings = require('mongoose').model('Settings');
const Audit = require('mongoose').model('Audit');
const Vulnerability = require('mongoose').model('Vulnerability');
const CustomField = require('mongoose').model('CustomField');
const AiPrompt = require('mongoose').model('AiPrompt');
const { generateWithProvider, generateWithProviderStream, testProviderConnection } = require('../lib/ai-client');
const { discoverOrcaModels, resolveOrcaBaseUrl, OrcaDiscoveryError } = require('../lib/ai-orcarouter');
const { MASKED_SECRET } = require('../lib/settings-secrets');
const { runAuditQa } = require('../lib/ai-qa');
const {
    runVulnerabilityQa,
    getVulnerabilityDetail
} = require('../lib/ai-vuln-qa');
const VulnerabilityQaCatalog = require('mongoose').model('VulnerabilityQaCatalog');
const {
    VULN_QA_ROOM,
    startVulnerabilityQaJob,
    getVulnerabilityQaJobStatus,
    isVulnerabilityQaJobActive,
    cancelVulnerabilityQaJob,
    serializeJob
} = require('../lib/ai-vuln-qa-job');
const {
    startSingleJob,
    getSingleJobStatus,
    isSingleJobActive,
    serializeJob: serializeSingleJob
} = require('../lib/ai-qa-single-job');

const DRAFT_VULNERABILITY_ID = '__draft__';

const normalizeDraftVulnerability = (raw) => {
    // Default `{}` here would falsely treat missing body.vulnerability as a draft.
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;

    return {
        ...raw,
        _id: DRAFT_VULNERABILITY_ID
    };
};
const {
    computeAuditQaFingerprint,
    normalizeStoredQaReport,
    getCachedQaReport,
    getOutdatedQaReport,
    buildQaReportCache,
    formatQaReportResponse
} = require('../lib/ai-qa-cache');
const {
    computeVulnerabilityQaFingerprint,
    getLatestVulnerabilityQaReport,
    buildVulnerabilityQaReportCache,
    formatVulnerabilityQaReportResponse,
    buildCatalogSliceForVulnerability,
    assembleAllVulnerabilitiesQaReport
} = require('../lib/ai-vuln-qa-cache');
const {
    normalizeQaScope,
    mergeQaIssues,
    emptyQaCounts,
    finalizeMergedQaResult,
    getQaChecksFromSettings,
    hasEnabledQaChecks,
    isAiEnabled
} = require('../lib/ai-qa-checks');
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

// The default provider is always implicitly allowed; allowedProviders extends that set. An
// empty allowedProviders therefore restricts users to the default provider only. Enforced here
// server-side so a forged request cannot pick a provider the admin didn't permit.
const getAllowedProviders = (settings) => {
    const def = normalizeProvider(settings?.ai?.public?.defaultProvider) || AI_DEFAULT_PROVIDER;
    const configured = Array.isArray(settings?.ai?.public?.allowedProviders)
        ? settings.ai.public.allowedProviders
        : [];
    return new Set([def, ...configured].filter((p) => AI_PROVIDERS.includes(p)));
};

// Returns { provider } on success, or { error } with a code callers map to an HTTP response:
// 'unsupported' (unknown provider id) or 'forbidden' (known but not permitted by the allow-list).
const resolveProvider = (req, settings) => {
    const provider = normalizeProvider(req.body.provider) ||
        normalizeProvider(settings?.ai?.public?.defaultProvider) ||
        AI_DEFAULT_PROVIDER;

    if (!AI_PROVIDERS.includes(provider))
        return { error: 'unsupported' };
    if (!getAllowedProviders(settings).has(provider))
        return { error: 'forbidden' };
    return { provider };
};

// Writes the matching error response and returns false when a provider couldn't be resolved,
// so callers can `if (!writeProviderError(res, resolved)) return;`. Returns true on success.
const writeProviderError = (res, resolved) => {
    if (resolved.error === 'forbidden') {
        Response.Forbidden(res, 'Provider not permitted in organization settings');
        return false;
    }
    if (resolved.error) {
        Response.BadParameters(res, 'Unsupported provider');
        return false;
    }
    return true;
};

// Programmatic-only QA never needs a provider and must stay available when AI integration
// is disabled; every other scope needs both AI enabled and a resolvable provider. Writes the
// error response itself and returns null so callers can just `if (!resolved) return;`.
const resolveScopedProvider = (req, res, settings, scope) => {
    if (scope === 'programmatic')
        return { provider: null };

    if (!isAiEnabled(settings)) {
        Response.Forbidden(res, 'AI integration is disabled in organization settings');
        return null;
    }

    const resolved = resolveProvider(req, settings);
    if (!writeProviderError(res, resolved))
        return null;

    return { provider: resolved.provider };
};

const isAllowedEntityType = (entityType) => {
    return ALLOWED_ENTITY_TYPES.includes(entityType);
};

const writeSseEvent = (res, event, data) => {
    if (res.writableEnded)
        return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

// Streams the generate response over SSE: each LLM chunk emits a heartbeat so nginx's idle
// timeout never fires, however long the call runs. The frontend acts only on the terminal
// `done`/`error` event; the draft/reply contract is unchanged, only the transport differs.
const streamAiGenerateResponse = async (req, res, {
    provider,
    settings,
    fieldConfig,
    field,
    context,
    promptInstruction,
    userPrompt,
    messages
}) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    if (typeof res.flushHeaders === 'function')
        res.flushHeaders();

    const abortController = new AbortController();
    const onClientClose = () => abortController.abort();
    req.on('close', onClientClose);

    try {
        const result = await generateWithProviderStream({
            provider: provider,
            settings: settings,
            outputType: fieldConfig.outputType,
            context: context,
            promptInstruction: promptInstruction,
            userPrompt: userPrompt,
            messages: messages,
            signal: abortController.signal,
            onChunk: () => writeSseEvent(res, 'heartbeat', {})
        });

        writeSseEvent(res, 'done', {
            entityType: fieldConfig.entityType,
            field: field,
            outputType: fieldConfig.outputType,
            draft: result.draft,
            reply: result.reply || '',
            provider: provider,
            model: result.model
        });
    } catch (err) {
        writeSseEvent(res, 'error', { message: err?.message || String(err) });
    } finally {
        req.off('close', onClientClose);
        if (!res.writableEnded)
            res.end();
    }
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

        const resolved = resolveProvider(req, settings);
        if (!writeProviderError(res, resolved))
            return;
        const provider = resolved.provider;

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

        // From here the response streams over SSE; errors past this point go out as an
        // `error` SSE event, since headers are sent and Response.Internal can't set a body.
        await streamAiGenerateResponse(req, res, {
            provider: provider,
            settings: settings,
            fieldConfig: fieldConfig,
            field: field,
            context: context,
            promptInstruction: promptInstruction,
            userPrompt: userPrompt,
            messages: chatMessages
        });
    } catch (err) {
        if (res.headersSent) {
            if (!res.writableEnded)
                res.end();
            return;
        }
        Response.Internal(res, err);
    }
};

const auditQaJobKey = (auditId) => `audit:${auditId}`;
const vulnQaSingleJobKey = (vulnerabilityId, locale) => `vuln:${vulnerabilityId}:${locale}`;

const emptyAuditQaResponse = () => ({
    summary: '',
    issues: [],
    aiAnalysis: false,
    provider: null,
    model: null,
    counts: emptyQaCounts(),
    cached: false,
    outdated: false,
    ranAt: null,
    programmaticRanAt: null,
    aiRanAt: null,
    hasReport: false
});

const handleAiQa = (io) => async function(req, res) {
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

        // Resolve scope/provider before touching the audit at all: an invalid scope or a
        // disabled-AI request should reject without paying for the audit fetch below.
        const loadOnly = Boolean(req.body.loadOnly);
        let scope = null;
        let provider = null;

        if (!loadOnly) {
            scope = normalizeQaScope(req.body.scope);
            if (!scope) {
                Response.BadParameters(res, 'Missing or invalid scope');
                return;
            }

            const resolved = resolveScopedProvider(req, res, settings, scope);
            if (!resolved)
                return;
            provider = resolved.provider;
        }

        const audit = await Audit.getAudit(
            acl.isAllowed(req.decodedToken.roles, 'audits:read-all'),
            auditId,
            req.decodedToken.id
        );

        const auditObject = typeof audit.toObject === 'function' ? audit.toObject() : audit;
        const jobKey = auditQaJobKey(auditId);

        if (loadOnly) {
            const report = getCachedQaReport(auditObject) || getOutdatedQaReport(auditObject);
            Response.Ok(res, {
                auditId: auditId,
                hasReport: Boolean(report),
                job: getSingleJobStatus(jobKey),
                ...(report || emptyAuditQaResponse())
            });
            return;
        }

        // Programmatic-only checks are local (no LLM call), so run them inline - no proxy
        // timeout risk to justify background-job overhead.
        if (scope === 'programmatic') {
            const existingStored = normalizeStoredQaReport(auditObject) || {};
            const partialResult = await runAuditQa({
                audit: auditObject,
                settings: settings,
                provider: provider,
                scope: scope
            });
            const mergedIssues = mergeQaIssues(existingStored.issues || [], partialResult.issues || [], scope);
            const mergedResult = finalizeMergedQaResult(existingStored, partialResult, mergedIssues);
            const fingerprint = computeAuditQaFingerprint(auditObject);
            const qaReport = buildQaReportCache(fingerprint, mergedResult, {
                existing: existingStored,
                scope: scope
            });
            await Audit.saveLatestQaReport(auditId, qaReport);

            Response.Ok(res, {
                auditId: auditId,
                hasReport: true,
                ...formatQaReportResponse(qaReport, {
                    cached: false,
                    outdated: false
                })
            });
            return;
        }

        if (isSingleJobActive(jobKey)) {
            Response.BadParameters(res, 'An AI QA run is already in progress for this audit.');
            return;
        }

        // AI call runs as a detached background job so the connection doesn't stay open:
        // the client gets the job now and loads the persisted report once done (loadOnly
        // above, or the audit-qa:done socket event). The report is authoritative; the job
        // record only tracks whether a run is in flight.
        const { job } = startSingleJob({
            key: jobKey,
            io: io,
            room: auditId,
            event: 'audit-qa:done',
            meta: { auditId: auditId, scope: scope },
            task: async () => {
                const existingStored = normalizeStoredQaReport(auditObject) || {};
                const partialResult = await runAuditQa({
                    audit: auditObject,
                    settings: settings,
                    provider: provider,
                    scope: scope
                });
                const mergedIssues = mergeQaIssues(existingStored.issues || [], partialResult.issues || [], scope);
                const mergedResult = finalizeMergedQaResult(existingStored, partialResult, mergedIssues);
                const fingerprint = computeAuditQaFingerprint(auditObject);
                const qaReport = buildQaReportCache(fingerprint, mergedResult, {
                    existing: existingStored,
                    scope: scope
                });
                await Audit.saveLatestQaReport(auditId, qaReport);
            }
        });

        Response.Ok(res, { auditId: auditId, job: serializeSingleJob(job) });
    } catch (err) {
        Response.Internal(res, err);
    }
};

const emptyVulnerabilityQaResponse = (mode = 'single') => ({
    summary: '',
    issues: [],
    aiAnalysis: false,
    provider: null,
    model: null,
    counts: emptyQaCounts(),
    cached: false,
    outdated: false,
    ranAt: null,
    programmaticRanAt: null,
    aiRanAt: null,
    hasReport: false,
    mode: mode,
    locale: '',
    vulnerabilityId: null,
    title: '',
    vulnerabilityCount: 0
});

const respondVulnerabilityQaReport = (report, options = {}) => (
    report ? { hasReport: true, ...report } : emptyVulnerabilityQaResponse(options.mode || 'single')
);

const handleVulnerabilityQa = (io) => async function(req, res) {
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

        const vulnerabilityId = String(req.body.vulnerabilityId || '').trim();
        const draftVulnerability = normalizeDraftVulnerability(req.body.vulnerability);

        // Catalog-level findings (duplicates, unlinked translations) involving this
        // vulnerability, served from the stored catalog document — the per-vuln run no
        // longer recomputes catalog checks.
        const buildCatalogSlice = async (targetVulnerabilityId) => {
            const [catalogDoc, vulnerabilities] = await Promise.all([
                VulnerabilityQaCatalog.getByLocale(locale),
                Vulnerability.getAllForQa()
            ]);
            return buildCatalogSliceForVulnerability(catalogDoc, vulnerabilities, locale, targetVulnerabilityId);
        };

        if (req.body.loadOnly) {
            if (vulnerabilityId) {
                const vulnerabilityDoc = await Vulnerability.getByIdForQa(vulnerabilityId);
                if (!vulnerabilityDoc) {
                    Response.NotFound(res, 'Vulnerability not found');
                    return;
                }
                const vulnerability = typeof vulnerabilityDoc.toObject === 'function' ?
                    vulnerabilityDoc.toObject() : vulnerabilityDoc;

                const report = getLatestVulnerabilityQaReport(vulnerability, locale);
                Response.Ok(res, {
                    ...respondVulnerabilityQaReport(report, { mode: 'single' }),
                    job: getSingleJobStatus(vulnQaSingleJobKey(vulnerabilityId, locale)),
                    catalog: await buildCatalogSlice(vulnerabilityId)
                });
                return;
            }

            if (draftVulnerability) {
                Response.Ok(res, emptyVulnerabilityQaResponse('single'));
                return;
            }

            const [vulnerabilities, catalogDoc] = await Promise.all([
                Vulnerability.getAllForQa(),
                VulnerabilityQaCatalog.getByLocale(locale)
            ]);
            const report = assembleAllVulnerabilitiesQaReport({
                vulnerabilities: vulnerabilities,
                locale: locale,
                catalogDoc: catalogDoc
            });
            Response.Ok(res, respondVulnerabilityQaReport(report, { mode: 'all' }));
            return;
        }

        const scope = normalizeQaScope(req.body.scope);
        if (!scope) {
            Response.BadParameters(res, 'Missing or invalid scope');
            return;
        }

        const resolved = resolveScopedProvider(req, res, settings, scope);
        if (!resolved)
            return;
        const provider = resolved.provider;

        if (vulnerabilityId) {
            if (isVulnerabilityQaJobActive(locale)) {
                Response.BadParameters(res, 'A catalog-wide QA run is in progress for this language. Wait for it to finish before rechecking a single template.');
                return;
            }

            const vulnerabilityDoc = await Vulnerability.getByIdForQa(vulnerabilityId);
            if (!vulnerabilityDoc) {
                Response.NotFound(res, 'Vulnerability not found');
                return;
            }
            const vulnerability = typeof vulnerabilityDoc.toObject === 'function' ?
                vulnerabilityDoc.toObject() : vulnerabilityDoc;

            const buildSingleVulnQaReport = async () => {
                const partialResult = await runVulnerabilityQa({
                    vulnerability: vulnerability,
                    locale: locale,
                    settings: settings,
                    provider: provider,
                    scope: scope
                });
                const fingerprint = computeVulnerabilityQaFingerprint(vulnerability, locale);
                // Only merge the other scope's previous results when they describe the same
                // content: a stale-fingerprint entry must not contribute issues or timestamps.
                const storedEntry = (vulnerability.qaReports || []).find((entry) => entry?.locale === locale);
                const fingerprintMatches = storedEntry?.fingerprint === fingerprint;
                const existingReport = fingerprintMatches ?
                    (getLatestVulnerabilityQaReport(vulnerability, locale) || {}) :
                    {};
                const mergedIssues = mergeQaIssues(existingReport.issues || [], partialResult.issues || [], scope);
                const mergedResult = finalizeMergedQaResult(existingReport, partialResult, mergedIssues);
                return buildVulnerabilityQaReportCache(fingerprint, mergedResult, {
                    locale: locale,
                    mode: 'single',
                    vulnerabilityId: partialResult.vulnerabilityId,
                    title: partialResult.title
                }, {
                    existing: existingReport,
                    scope: scope
                });
            };

            // Programmatic-only checks are local (no LLM call), so run them inline - no
            // proxy timeout risk to justify background-job overhead.
            if (scope === 'programmatic') {
                const qaReport = await buildSingleVulnQaReport();
                await Vulnerability.saveQaReportForLocale(vulnerabilityId, locale, qaReport);

                Response.Ok(res, {
                    ...respondVulnerabilityQaReport(
                        formatVulnerabilityQaReportResponse(qaReport, { cached: false, outdated: false }),
                        { mode: 'single' }
                    ),
                    catalog: await buildCatalogSlice(vulnerabilityId)
                });
                return;
            }

            const jobKey = vulnQaSingleJobKey(vulnerabilityId, locale);
            if (isSingleJobActive(jobKey)) {
                Response.BadParameters(res, 'An AI QA run is already in progress for this vulnerability.');
                return;
            }

            // AI call runs as a detached background job so the connection doesn't stay
            // open: the client gets the job now and loads the persisted report once done
            // (loadOnly above, or the vuln-qa-single:done socket event). The report is
            // authoritative; the job record only tracks whether a run is in flight.
            const { job } = startSingleJob({
                key: jobKey,
                io: io,
                room: VULN_QA_ROOM,
                event: 'vuln-qa-single:done',
                meta: { vulnerabilityId: vulnerabilityId, locale: locale },
                task: async () => {
                    const qaReport = await buildSingleVulnQaReport();
                    await Vulnerability.saveQaReportForLocale(vulnerabilityId, locale, qaReport);
                }
            });

            Response.Ok(res, { vulnerabilityId: vulnerabilityId, locale: locale, job: serializeSingleJob(job) });
            return;
        }

        if (draftVulnerability) {
            const detail = getVulnerabilityDetail(draftVulnerability, locale);
            if (!detail) {
                Response.BadParameters(res, 'Draft vulnerability has no content for this language');
                return;
            }

            const result = await runVulnerabilityQa({
                vulnerability: draftVulnerability,
                locale: locale,
                settings: settings,
                provider: provider,
                scope: scope
            });

            Response.Ok(res, respondVulnerabilityQaReport(
                formatVulnerabilityQaReportResponse(
                    buildVulnerabilityQaReportCache(
                        computeVulnerabilityQaFingerprint(draftVulnerability, locale),
                        result,
                        {
                            locale: locale,
                            mode: 'single',
                            vulnerabilityId: null,
                            title: result.title
                        },
                        { scope: scope }
                    ),
                    { cached: false, outdated: false }
                ),
                { mode: 'single' }
            ));
            return;
        }

        // Catalog-wide runs are handled by the background job endpoints.
        Response.BadParameters(res, 'Catalog-wide QA runs use POST /api/ai/vulnerabilities/qa/run');
    } catch (err) {
        Response.Internal(res, err);
    }
};

const handleVulnerabilityQaRun = (io) => async function(req, res) {
    try {
        const locale = String(req.body.locale || '').trim();
        if (!locale) {
            Response.BadParameters(res, 'Missing required parameter: locale');
            return;
        }

        const settings = await Settings.getAll();

        const scope = normalizeQaScope(req.body.scope);
        if (!scope) {
            Response.BadParameters(res, 'Missing or invalid scope');
            return;
        }

        const resolved = resolveScopedProvider(req, res, settings, scope);
        if (!resolved)
            return;
        const provider = resolved.provider;

        if (!hasEnabledQaChecks(getQaChecksFromSettings(settings))) {
            Response.BadParameters(res, 'No QA checks are enabled in organization settings');
            return;
        }

        const { alreadyRunning, job } = startVulnerabilityQaJob({
            locale: locale,
            scope: scope,
            provider: provider,
            settings: settings,
            io: io
        });

        Response.Ok(res, {
            alreadyRunning: alreadyRunning,
            job: serializeJob(job)
        });
    } catch (err) {
        Response.Internal(res, err);
    }
};

const handleVulnerabilityQaStatus = async function(req, res) {
    try {
        const locale = String(req.query.locale || '').trim();
        if (!locale) {
            Response.BadParameters(res, 'Missing required parameter: locale');
            return;
        }

        const [vulnerabilities, catalogDoc] = await Promise.all([
            Vulnerability.getAllForQa(),
            VulnerabilityQaCatalog.getByLocale(locale)
        ]);
        const report = assembleAllVulnerabilitiesQaReport({
            vulnerabilities: vulnerabilities,
            locale: locale,
            catalogDoc: catalogDoc
        });

        Response.Ok(res, {
            job: getVulnerabilityQaJobStatus(locale),
            report: respondVulnerabilityQaReport(report, { mode: 'all' })
        });
    } catch (err) {
        Response.Internal(res, err);
    }
};

const handleVulnerabilityQaCancel = async function(req, res) {
    try {
        const locale = String(req.body.locale || '').trim();
        if (!locale) {
            Response.BadParameters(res, 'Missing required parameter: locale');
            return;
        }

        const job = cancelVulnerabilityQaJob(locale);
        if (!job) {
            Response.BadParameters(res, 'No QA run in progress for this language');
            return;
        }

        Response.Ok(res, { job: serializeJob(job) });
    } catch (err) {
        Response.Internal(res, err);
    }
};

// Dismiss or restore a single QA issue from the catalog-wide report. Template issues
// (vulnerabilityId present) are stored on the vulnerability and scoped to its current
// content fingerprint; catalog issues are stored on the catalog document and keyed on
// issue identity so "not a duplicate" verdicts survive re-runs.
const handleVulnerabilityQaDismiss = async function(req, res) {
    try {
        const locale = String(req.body.locale || '').trim();
        const key = String(req.body.key || '').trim();
        if (!locale || !key) {
            Response.BadParameters(res, 'Missing required parameters: locale, key');
            return;
        }

        const dismissed = req.body.dismissed !== false;
        const username = req.decodedToken?.username || '';
        const vulnerabilityId = String(req.body.vulnerabilityId || '').trim();

        if (vulnerabilityId) {
            const vulnerability = await Vulnerability.findById(vulnerabilityId).lean().exec();
            if (!vulnerability) {
                Response.NotFound(res, 'Vulnerability not found');
                return;
            }

            const fingerprint = computeVulnerabilityQaFingerprint(vulnerability, locale);
            if (!fingerprint) {
                Response.BadParameters(res, 'Vulnerability has no content for this language');
                return;
            }

            await Vulnerability.setQaIssueDismissed(vulnerabilityId, locale, key, dismissed, fingerprint, username);
        } else {
            const catalog = await VulnerabilityQaCatalog.setIssueDismissed(locale, key, dismissed, username);
            if (!catalog) {
                Response.BadParameters(res, 'No catalog QA report for this language');
                return;
            }
        }

        Response.Ok(res, { dismissed: dismissed });
    } catch (err) {
        Response.Internal(res, err);
    }
};

// Resolve or unresolve an entire vulnerability's QA from the catalog-wide report. The
// resolution is stored on the vulnerability scoped to its current content fingerprint, so
// editing the template reopens its issues on the next run.
const handleVulnerabilityQaResolve = async function(req, res) {
    try {
        const locale = String(req.body.locale || '').trim();
        const vulnerabilityId = String(req.body.vulnerabilityId || '').trim();
        if (!locale || !vulnerabilityId) {
            Response.BadParameters(res, 'Missing required parameters: locale, vulnerabilityId');
            return;
        }

        const vulnerability = await Vulnerability.findById(vulnerabilityId).lean().exec();
        if (!vulnerability) {
            Response.NotFound(res, 'Vulnerability not found');
            return;
        }

        const fingerprint = computeVulnerabilityQaFingerprint(vulnerability, locale);
        if (!fingerprint) {
            Response.BadParameters(res, 'Vulnerability has no content for this language');
            return;
        }

        const resolved = req.body.resolved !== false;
        const username = req.decodedToken?.username || '';
        await Vulnerability.setQaResolved(vulnerabilityId, locale, resolved, fingerprint, username);

        Response.Ok(res, { resolved: resolved });
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

const AI_TEST_OVERRIDE_FIELDS = {
    openai: ['openaiApiKey', 'openaiBaseUrl', 'openaiModel'],
    anthropic: ['anthropicApiKey', 'anthropicBaseUrl', 'anthropicModel', 'anthropicVersion'],
    deepseek: ['deepseekApiKey', 'deepseekBaseUrl', 'deepseekModel'],
    ollama: ['ollamaApiKey', 'ollamaBaseUrl', 'ollamaModel'],
    orcarouter: ['orcarouterApiKey', 'orcarouterBaseUrl', 'orcarouterModel'],
    bedrock: [
        'bedrockApiKey',
        'bedrockAccessKeyId',
        'bedrockSecretAccessKey',
        'bedrockSessionToken',
        'bedrockRegion',
        'bedrockModel'
    ]
};

const buildAiTestOverrides = (provider, body = {}) => {
    const fields = AI_TEST_OVERRIDE_FIELDS[provider] || [];
    const overrides = {};

    fields.forEach((field) => {
        const value = body[field];
        if (value === undefined || value === null || value === MASKED_SECRET)
            return;
        overrides[field] = value;
    });

    return overrides;
};

const handleAiTestConnection = async function(req, res) {
    try {
        const provider = normalizeProvider(req.body.provider);
        if (!provider || !AI_PROVIDERS.includes(provider)) {
            Response.BadParameters(res, 'Unsupported provider');
            return;
        }

        const settings = await Settings.getAll();
        const settingsObject = typeof settings.toObject === 'function' ? settings.toObject() : settings;
        const overrides = buildAiTestOverrides(provider, req.body);
        const testSettings = {
            ...settingsObject,
            ai: {
                ...settingsObject.ai,
                private: {
                    ...settingsObject.ai?.private,
                    ...overrides
                }
            }
        };

        const result = await testProviderConnection(provider, testSettings);
        Response.Ok(res, result);
    } catch (err) {
        Response.Internal(res, err);
    }
};

// Server-side model discovery for OrcaRouter Cyber Inference. The API key never leaves
// the backend; the browser receives only the filtered selector projection.
const handleOrcaModelDiscovery = async function(req, res) {
    try {
        const settings = await Settings.getAll();
        const settingsObject = typeof settings?.toObject === 'function' ? settings.toObject() : settings;
        const overrides = buildAiTestOverrides('orcarouter', req.body);
        const privateSettings = {
            ...(settingsObject?.ai?.private || {}),
            ...overrides
        };

        const result = await discoverOrcaModels({
            apiKey: String(privateSettings.orcarouterApiKey || '').trim(),
            baseUrl: resolveOrcaBaseUrl(privateSettings),
            capability: 'chat'
        });

        Response.Ok(res, result);
    } catch (err) {
        if (err instanceof OrcaDiscoveryError || err?.name === 'OrcaDiscoveryError') {
            if (err.code === 'auth')
                return Response.Unauthorized(res, err.message);
            if (err.code === 'not_configured' || err.code === 'invalid_url')
                return Response.BadParameters(res, err.message);
        }
        Response.Internal(res, err);
    }
};

const tokenAllowsAny = (token, permissions) =>
    permissions.some((permission) => acl.isAllowedToken(token, permission));

// Gate for endpoints that require holding any of an explicit permission list.
const requireAnyPermission = (...permissions) => function(req, res, next) {
    if (tokenAllowsAny(req.decodedToken, permissions))
        return next();

    Response.Forbidden(res, 'Insufficient privileges');
};

const requireAiAssistPermission = requireAnyPermission('audits:ai-assist', 'vulnerabilities:ai-assist');

// Each area has three disjoint QA scopes: read (view), base (built-in checks), ai (AI checks).
// `all` runs both kinds, so it needs both perms.
const tokenAllowsQaScope = (token, scope, base, aiBase) => {
    if (scope === 'programmatic')
        return acl.isAllowedToken(token, base);
    if (scope === 'ai')
        return acl.isAllowedToken(token, aiBase);
    if (scope === 'all')
        return acl.isAllowedToken(token, base) && acl.isAllowedToken(token, aiBase);
    return false;
};

// Scope-aware QA authorization: reading a cached report (loadOnly) needs any QA perm; runs
// are gated on the perm the scope requires.
const requireQaPermission = (readPerm, base, aiBase) => function(req, res, next) {
    const token = req.decodedToken;

    if (Boolean(req.body?.loadOnly)) {
        if (tokenAllowsAny(token, [readPerm, base, aiBase]))
            return next();
        return Response.Forbidden(res, 'Insufficient privileges');
    }

    // An invalid scope is left for the handler to reject with a 422; gate it on any run perm.
    const scope = normalizeQaScope(req.body?.scope);
    if (!scope) {
        if (tokenAllowsAny(token, [base, aiBase]))
            return next();
        return Response.Forbidden(res, 'Insufficient privileges');
    }

    if (tokenAllowsQaScope(token, scope, base, aiBase))
        return next();

    Response.Forbidden(res, 'Insufficient privileges');
};

const requireVulnerabilityQaPermission = function(req, res, next) {
    const vulnerabilityId = String(req.body?.vulnerabilityId || '').trim();
    const draftVulnerability = req.body?.vulnerability;
    const hasDraft = draftVulnerability &&
        typeof draftVulnerability === 'object' &&
        !Array.isArray(draftVulnerability);
    // A saved/draft vuln uses the per-vuln perms; no id/draft means the catalog-wide perms.
    const isSingle = Boolean(vulnerabilityId || hasDraft);
    const readPerm = isSingle ? 'vulnerabilities:qa-read' : 'vulnerabilities:qa-read-catalog';
    const base = isSingle ? 'vulnerabilities:qa' : 'vulnerabilities:qa-catalog';
    const aiBase = isSingle ? 'vulnerabilities:ai-qa' : 'vulnerabilities:ai-qa-catalog';

    return requireQaPermission(readPerm, base, aiBase)(req, res, next);
};

// Catalog perms: any grants read (view report/status); generate excludes read-only holders.
const VULN_QA_READ_CATALOG = ['vulnerabilities:qa-read-catalog', 'vulnerabilities:qa-catalog', 'vulnerabilities:ai-qa-catalog'];
const VULN_QA_GENERATE_CATALOG = ['vulnerabilities:qa-catalog', 'vulnerabilities:ai-qa-catalog'];

module.exports = function(app, io) {
    app.get('/api/ai/enabled-fields', acl.hasPermission('validtoken'), requireAiAssistPermission, handleAiEnabledFields);
    app.post('/api/ai/generate', acl.hasPermission('validtoken'), requireAiAssistPermission, handleAiGenerate);
    app.post('/api/ai/qa', acl.hasPermission('validtoken'), requireQaPermission('audits:qa-read', 'audits:qa', 'audits:ai-qa'), handleAiQa(io));
    app.post('/api/ai/vulnerabilities/qa', acl.hasPermission('validtoken'), requireVulnerabilityQaPermission, handleVulnerabilityQa(io));
    app.post('/api/ai/vulnerabilities/qa/run', acl.hasPermission('validtoken'), requireQaPermission('vulnerabilities:qa-read-catalog', 'vulnerabilities:qa-catalog', 'vulnerabilities:ai-qa-catalog'), handleVulnerabilityQaRun(io));
    app.get('/api/ai/vulnerabilities/qa/status', acl.hasPermission('validtoken'), requireAnyPermission(...VULN_QA_READ_CATALOG), handleVulnerabilityQaStatus);
    app.post('/api/ai/vulnerabilities/qa/cancel', acl.hasPermission('validtoken'), requireAnyPermission(...VULN_QA_GENERATE_CATALOG), handleVulnerabilityQaCancel);
    app.post('/api/ai/vulnerabilities/qa/dismiss', acl.hasPermission('validtoken'), requireAnyPermission(...VULN_QA_GENERATE_CATALOG), handleVulnerabilityQaDismiss);
    app.post('/api/ai/vulnerabilities/qa/resolve', acl.hasPermission('validtoken'), requireAnyPermission(...VULN_QA_GENERATE_CATALOG), handleVulnerabilityQaResolve);
    app.post('/api/ai/test', acl.hasPermission('settings:update'), handleAiTestConnection);
    // Editor-only: the request may override the base URL, and the stored key is sent to
    // whatever URL is used, so this must never be reachable with read-only settings access.
    app.post('/api/ai/providers/orcarouter/models', acl.hasPermission('settings:update'), handleOrcaModelDiscovery);
};
