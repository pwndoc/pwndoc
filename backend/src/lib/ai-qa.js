const {
    stripHtml,
    isEmptyContent,
    normalizeIssue,
    summarizeCustomFields
} = require('./ai-qa-shared');
const { runQaWithProvider } = require('./ai-client');
const {
    formatFindingLocation,
    normalizeIssueLocations,
    normalizeAiIssueLocation
} = require('./ai-qa-location');
const {
    resolveRedactionGuidelinesForRequest,
    getRedactionGuidelinesText
} = require('./ai-redaction-guidelines');
const {
    resolveQaInstructionsForRequest,
    getQaInstructionsText
} = require('./ai-qa-instructions');
const { AI_DEFAULT_PROVIDER } = require('./ai-prompts');
const { runReferenceLinkChecks } = require('./ai-qa-link-checker');
const { runImageCaptionChecks } = require('./ai-qa-image-captions');
const {
    getQaChecksFromSettings,
    isQaCheckEnabled,
    hasEnabledAiQaChecks,
    hasEnabledQaChecks,
    filterAiIssuesByEnabledChecks
} = require('./ai-qa-checks');

const pushIssue = (issues, issue, source = 'structural') => {
    const normalized = normalizeIssue(issue, source);
    if (!normalized.title || !normalized.message)
        return;
    issues.push(normalized);
};

const runStructuralChecks = (audit = {}) => {
    const issues = [];

    if (!String(audit.name || '').trim()) {
        pushIssue(issues, {
            severity: 'error',
            category: 'completeness',
            title: 'Missing audit name',
            message: 'The audit name is required for report generation.',
            location: 'general'
        });
    }

    const findings = audit.findings || [];
    if (findings.length === 0) {
        pushIssue(issues, {
            severity: 'error',
            category: 'completeness',
            title: 'No findings',
            message: 'The report must include at least one finding.',
            location: 'report'
        });
    }

    findings.forEach((finding) => {
        const location = formatFindingLocation(finding);

        if (!String(finding.title || '').trim()) {
            pushIssue(issues, {
                severity: 'error',
                category: 'completeness',
                title: 'Missing finding title',
                message: 'A finding is missing its title.',
                location: location
            });
        }

        if (finding.status === 1) {
            pushIssue(issues, {
                severity: 'warning',
                category: 'completeness',
                title: 'Finding still in redaction',
                message: `"${finding.title || 'Untitled finding'}" is marked as still being redacted.`,
                location: location
            });
        }
    });

    return issues;
};

const buildAuditSnapshot = (audit = {}) => {
    const company = audit.company || {};
    const client = audit.client || {};

    return {
        name: String(audit.name || '').trim(),
        auditType: String(audit.auditType || '').trim(),
        type: String(audit.type || 'default').trim(),
        language: String(audit.language || '').trim(),
        date: String(audit.date || '').trim(),
        date_start: String(audit.date_start || '').trim(),
        date_end: String(audit.date_end || '').trim(),
        state: String(audit.state || '').trim(),
        company: {
            name: String(company.name || '').trim(),
            shortName: String(company.shortName || '').trim()
        },
        client: {
            firstname: String(client.firstname || '').trim(),
            lastname: String(client.lastname || '').trim(),
            email: String(client.email || '').trim(),
            title: String(client.title || '').trim(),
            companyName: String(client.company?.name || '').trim()
        },
        scope: (audit.scope || [])
            .map((entry) => String(entry?.name || '').trim())
            .filter(Boolean),
        customFields: summarizeCustomFields(audit.customFields),
        sections: (audit.sections || []).map((section) => ({
            name: String(section?.name || section?.field || '').trim(),
            field: String(section?.field || '').trim(),
            text: stripHtml(section?.text).slice(0, 8000),
            customFields: summarizeCustomFields(section?.customFields)
        })),
        findings: (audit.findings || []).map((finding) => ({
            location: formatFindingLocation(finding),
            title: String(finding.title || '').trim(),
            vulnType: String(finding.vulnType || '').trim(),
            category: String(finding.category || '').trim(),
            status: finding.status === 1 ? 'redacting' : 'done',
            description: stripHtml(finding.description).slice(0, 4000),
            observation: stripHtml(finding.observation).slice(0, 4000),
            remediation: stripHtml(finding.remediation).slice(0, 4000),
            poc: stripHtml(finding.poc).slice(0, 4000),
            references: Array.isArray(finding.references) ? finding.references : [],
            affected: String(finding.scope || '').trim(),
            cvssv3: String(finding.cvssv3 || '').trim(),
            cvssv4: String(finding.cvssv4 || '').trim(),
            retestStatus: String(finding.retestStatus || '').trim(),
            retestDescription: stripHtml(finding.retestDescription).slice(0, 4000),
            customFields: summarizeCustomFields(finding.customFields)
        }))
    };
};

const dedupeIssues = (issues = []) => {
    const seen = new Set();
    return issues.filter((issue) => {
        const key = `${issue.severity}|${issue.category}|${issue.location}|${issue.title}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
};

const sortIssues = (issues = []) => {
    const severityRank = { error: 0, warning: 1, info: 2 };
    return [...issues].sort((a, b) => {
        const severityDiff = (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
        if (severityDiff !== 0)
            return severityDiff;
        return `${a.location}:${a.title}`.localeCompare(`${b.location}:${b.title}`);
    });
};

const buildSummary = (issues = [], aiSummary = '') => {
    const errors = issues.filter((issue) => issue.severity === 'error').length;
    const warnings = issues.filter((issue) => issue.severity === 'warning').length;
    const infos = issues.filter((issue) => issue.severity === 'info').length;

    if (issues.length === 0)
        return aiSummary || 'No issues were flagged. The report appears ready for generation.';

    const parts = [`${issues.length} issue(s) flagged`];
    if (errors)
        parts.push(`${errors} error(s)`);
    if (warnings)
        parts.push(`${warnings} warning(s)`);
    if (infos)
        parts.push(`${infos} info(s)`);

    if (aiSummary)
        return `${parts.join(', ')}. ${aiSummary}`;

    return `${parts.join(', ')}.`;
};

const runAuditQa = async ({ audit, settings, provider }) => {
    const qaChecks = getQaChecksFromSettings(settings);

    if (!hasEnabledQaChecks(qaChecks)) {
        return {
            issues: [],
            summary: 'No QA checks are enabled in organization settings.',
            aiAnalysis: false,
            provider: null,
            model: null,
            counts: {
                total: 0,
                error: 0,
                warning: 0,
                info: 0
            }
        };
    }

    const structuralIssues = isQaCheckEnabled(qaChecks, 'completeness') ?
        runStructuralChecks(audit) :
        [];
    let referenceLinkIssues = [];

    if (isQaCheckEnabled(qaChecks, 'references')) {
        try {
            referenceLinkIssues = await runReferenceLinkChecks(audit);
        } catch (err) {
            pushIssue(structuralIssues, {
                severity: 'info',
                category: 'references',
                title: 'Reference link check skipped',
                message: `Automated reference URL validation could not run: ${err?.message || String(err)}`,
                location: 'report'
            });
        }
    }

    const imageCaptionIssues = isQaCheckEnabled(qaChecks, 'imageCaptions') ?
        runImageCaptionChecks(audit) :
        [];

    const auditSnapshot = buildAuditSnapshot(audit);
    const redactionGuidelines = resolveRedactionGuidelinesForRequest(settings);
    const qaInstructions = resolveQaInstructionsForRequest(settings);
    const redactionGuidelinesText = isQaCheckEnabled(qaChecks, 'redaction') ?
        getRedactionGuidelinesText(redactionGuidelines) :
        '';
    const qaInstructionsText = isQaCheckEnabled(qaChecks, 'instructions') ?
        getQaInstructionsText(qaInstructions) :
        '';
    const selectedProvider = String(provider || settings?.ai?.public?.defaultProvider || AI_DEFAULT_PROVIDER).trim().toLowerCase();
    const aiChecksEnabled = hasEnabledAiQaChecks(qaChecks);

    let aiResult = null;
    let aiSkippedReason = '';

    if (aiChecksEnabled) {
        try {
            aiResult = await runQaWithProvider({
                provider: selectedProvider,
                settings: settings,
                auditSnapshot: auditSnapshot,
                qaChecks: qaChecks,
                redactionGuidelines: redactionGuidelines,
                redactionGuidelinesText: redactionGuidelinesText,
                qaInstructions: qaInstructions,
                qaInstructionsText: qaInstructionsText
            });
        } catch (err) {
            aiSkippedReason = err?.message || String(err);
        }
    }

    const aiIssues = filterAiIssuesByEnabledChecks(
        (aiResult?.issues || []).map((issue) => normalizeIssue({
            ...issue,
            location: normalizeAiIssueLocation(issue.location, {
                entityPrefix: 'finding'
            })
        }, 'ai')),
        qaChecks
    );
    const issues = sortIssues(dedupeIssues([
        ...structuralIssues,
        ...referenceLinkIssues,
        ...imageCaptionIssues,
        ...aiIssues
    ]));
    const summary = buildSummary(issues, aiResult?.summary || '');

    if (aiChecksEnabled && !aiResult && aiSkippedReason) {
        pushIssue(issues, {
            severity: 'info',
            category: 'other',
            title: 'AI review skipped',
            message: `Automated content review could not run: ${aiSkippedReason}`,
            location: 'report'
        }, 'structural');
    }

    const finalIssues = normalizeIssueLocations(
        sortIssues(dedupeIssues(issues)),
        audit.findings || []
    );

    return {
        issues: finalIssues,
        summary: summary,
        aiAnalysis: Boolean(aiResult),
        provider: aiResult ? selectedProvider : null,
        model: aiResult?.model || null,
        counts: {
            total: finalIssues.length,
            error: finalIssues.filter((issue) => issue.severity === 'error').length,
            warning: finalIssues.filter((issue) => issue.severity === 'warning').length,
            info: finalIssues.filter((issue) => issue.severity === 'info').length
        }
    };
};

module.exports = {
    stripHtml,
    isEmptyContent,
    summarizeCustomFields,
    runStructuralChecks,
    buildAuditSnapshot,
    runAuditQa,
    normalizeIssue
};
