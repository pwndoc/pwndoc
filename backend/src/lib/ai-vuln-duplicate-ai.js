const { runVulnerabilityDuplicateQaWithProvider } = require('./ai-client');
const { stripHtml, normalizeIssue } = require('./ai-qa-shared');
const { AI_DEFAULT_PROVIDER } = require('./ai-prompts');
const {
    formatVulnerabilityLocation,
    getVulnerabilityDetail,
    buildDuplicatePairKey
} = require('./ai-vuln-qa');

const AI_DUPLICATE_SEVERITIES = ['error', 'warning', 'info'];
const FIELD_SLICE_LENGTH = 2500;

const pushIssue = (issues, issue, source = 'ai') => {
    const normalized = normalizeIssue({
        ...issue,
        category: 'aiDuplicates'
    }, source);
    if (!normalized.title || !normalized.message)
        return;
    issues.push(normalized);
};

const buildCatalogEntry = (vulnerability = {}, detail = {}) => {
    return {
        vulnerabilityId: String(vulnerability._id || vulnerability.id || ''),
        title: String(detail.title || '').trim(),
        vulnType: String(detail.vulnType || '').trim(),
        category: String(vulnerability.category || '').trim(),
        description: stripHtml(detail.description).slice(0, FIELD_SLICE_LENGTH),
        observation: stripHtml(detail.observation).slice(0, FIELD_SLICE_LENGTH),
        remediation: stripHtml(detail.remediation).slice(0, FIELD_SLICE_LENGTH)
    };
};

const buildVulnerabilityCatalog = (vulnerabilities = [], locale = '') => {
    return vulnerabilities
        .map((vulnerability) => {
            const detail = getVulnerabilityDetail(vulnerability, locale);
            if (!detail)
                return null;
            return buildCatalogEntry(vulnerability, detail);
        })
        .filter(Boolean);
};

const normalizeAiDuplicateLocation = (location = '', fallbackTitle = '') => {
    const value = String(location || '').trim();
    if (!value)
        return formatVulnerabilityLocation(fallbackTitle);

    if (value.startsWith('vulnerability:'))
        return value;

    if (value.startsWith('finding:'))
        return value.replace(/^finding:/, 'vulnerability:');

    return formatVulnerabilityLocation(value);
};

const normalizeAiDuplicateIssues = (issues = [], {
    targetVulnerabilityId = null,
    catalogById = new Map(),
    catalogByTitle = new Map()
} = {}) => {
    const reportedPairs = new Set();
    const normalizedIssues = [];

    issues.forEach((issue) => {
        const severity = AI_DUPLICATE_SEVERITIES.includes(issue.severity) ? issue.severity : 'warning';
        const message = String(issue.message || '').trim();
        const title = String(issue.title || 'Likely duplicate vulnerability').trim();
        const location = normalizeAiDuplicateLocation(issue.location, issue.templateTitle || '');

        let focalId = String(issue.vulnerabilityId || '').trim();
        let focalTitle = String(issue.templateTitle || '').trim();

        if (!focalId && location.startsWith('vulnerability:')) {
            const locationTitle = location.slice('vulnerability:'.length).split('/')[0].trim();
            const catalogEntry = catalogByTitle.get(locationTitle.toLowerCase());
            if (catalogEntry) {
                focalId = catalogEntry.vulnerabilityId;
                focalTitle = catalogEntry.title;
            } else {
                focalTitle = locationTitle;
            }
        }

        const relatedEntries = Array.isArray(issue.relatedTemplates) ? issue.relatedTemplates :
            (Array.isArray(issue.relatedTitles) ? issue.relatedTitles.map((entry) => {
                if (typeof entry === 'string')
                    return { title: entry };
                return entry;
            }) : []);

        if (!relatedEntries.length) {
            if (!message)
                return;

            if (targetVulnerabilityId && focalId && focalId !== String(targetVulnerabilityId))
                return;

            pushIssue(normalizedIssues, {
                severity: severity,
                title: title,
                message: message,
                location: location || formatVulnerabilityLocation(focalTitle)
            });
            return;
        }

        relatedEntries.forEach((related) => {
            const relatedId = String(related?.vulnerabilityId || '').trim();
            const relatedTitle = String(related?.title || related || '').trim();
            const relatedEntry = relatedId ?
                catalogById.get(relatedId) :
                catalogByTitle.get(relatedTitle.toLowerCase());
            const resolvedRelatedId = relatedEntry?.vulnerabilityId || relatedId;
            const resolvedRelatedTitle = relatedEntry?.title || relatedTitle;

            if (!focalId || !resolvedRelatedId || focalId === resolvedRelatedId)
                return;

            if (targetVulnerabilityId) {
                const targetId = String(targetVulnerabilityId);
                if (focalId !== targetId && resolvedRelatedId !== targetId)
                    return;
            }

            const pairKey = buildDuplicatePairKey(focalId, resolvedRelatedId);
            if (reportedPairs.has(pairKey))
                return;
            reportedPairs.add(pairKey);

            const focalEntry = targetVulnerabilityId && resolvedRelatedId === String(targetVulnerabilityId) ?
                { vulnerabilityId: resolvedRelatedId, title: resolvedRelatedTitle } :
                { vulnerabilityId: focalId, title: focalTitle || catalogById.get(focalId)?.title || 'Untitled vulnerability' };
            const counterpartTitle = focalEntry.vulnerabilityId === focalId ?
                resolvedRelatedTitle :
                (focalTitle || catalogById.get(focalId)?.title || resolvedRelatedTitle);

            const reason = String(related?.reason || issue.reason || message || '').trim();
            const issueMessage = reason.includes(counterpartTitle) ?
                reason :
                `"${focalEntry.title}" appears to describe the same vulnerability as "${counterpartTitle}". ${reason}`.trim();

            pushIssue(normalizedIssues, {
                severity: severity,
                title: title,
                message: issueMessage.replace(/\s+/g, ' ').trim(),
                location: formatVulnerabilityLocation(focalEntry.title)
            });
        });
    });

    return normalizedIssues;
};

const runAiDuplicateChecks = async ({
    vulnerabilities = [],
    locale = '',
    targetVulnerabilityId = null,
    settings = {},
    provider = null
} = {}) => {
    const catalog = buildVulnerabilityCatalog(vulnerabilities, locale);
    if (catalog.length < 2)
        return { issues: [], summary: '', model: null, provider: null };

    const targetId = String(targetVulnerabilityId || '').trim();
    const targetEntry = targetId ?
        catalog.find((entry) => entry.vulnerabilityId === targetId) :
        null;

    if (targetId && !targetEntry)
        return { issues: [], summary: '', model: null, provider: null };

    const candidates = targetEntry ?
        catalog.filter((entry) => entry.vulnerabilityId !== targetEntry.vulnerabilityId) :
        catalog;

    if (targetEntry && !candidates.length)
        return { issues: [], summary: '', model: null, provider: null };

    const selectedProvider = String(provider || settings?.ai?.public?.defaultProvider || AI_DEFAULT_PROVIDER)
        .trim()
        .toLowerCase();

    const aiResult = await runVulnerabilityDuplicateQaWithProvider({
        provider: selectedProvider,
        settings: settings,
        locale: locale,
        mode: targetEntry ? 'single' : 'all',
        target: targetEntry,
        templates: targetEntry ? candidates : catalog
    });

    const catalogById = new Map(catalog.map((entry) => [entry.vulnerabilityId, entry]));
    const catalogByTitle = new Map(catalog.map((entry) => [entry.title.toLowerCase(), entry]));
    const issues = normalizeAiDuplicateIssues(aiResult.issues || [], {
        targetVulnerabilityId: targetId || null,
        catalogById: catalogById,
        catalogByTitle: catalogByTitle
    });

    return {
        issues: issues,
        summary: String(aiResult.summary || '').trim(),
        model: aiResult.model || null,
        provider: selectedProvider
    };
};

module.exports = {
    buildCatalogEntry,
    buildVulnerabilityCatalog,
    normalizeAiDuplicateIssues,
    runAiDuplicateChecks
};
