const crypto = require('crypto');
const {
    buildQaReportCache,
    formatQaReportResponse
} = require('./ai-qa-cache');
const {
    buildVulnerabilitySnapshot,
    getVulnerabilityDetail
} = require('./ai-vuln-qa');

const computeVulnerabilityQaFingerprint = (vulnerability = {}, locale = '') => {
    const detail = getVulnerabilityDetail(vulnerability, locale);
    if (!detail)
        return '';

    const snapshot = buildVulnerabilitySnapshot(vulnerability, detail);
    return crypto
        .createHash('sha256')
        .update(JSON.stringify({ locale: String(locale || '').trim(), snapshot }))
        .digest('hex');
};

const computeAllVulnerabilitiesQaFingerprint = (vulnerabilities = [], locale = '') => {
    const snapshots = vulnerabilities
        .map((vulnerability) => {
            const detail = getVulnerabilityDetail(vulnerability, locale);
            if (!detail)
                return null;

            return {
                id: String(vulnerability._id || vulnerability.id || ''),
                snapshot: buildVulnerabilitySnapshot(vulnerability, detail)
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.id.localeCompare(right.id));

    return crypto
        .createHash('sha256')
        .update(JSON.stringify({ locale: String(locale || '').trim(), snapshots }))
        .digest('hex');
};

const normalizeLocaleQaReport = (reports = [], locale = '') => {
    if (!Array.isArray(reports))
        return null;

    return reports.find((report) => report?.locale === locale) || null;
};

const getStoredAllVulnerabilitiesQaReport = (settings = {}, locale = '') => {
    const reports = settings?.vulnerabilityQaReports;
    if (!reports || typeof reports !== 'object')
        return null;

    return reports[locale] || null;
};

const formatVulnerabilityQaReportResponse = (stored = {}, options = {}) => {
    const base = formatQaReportResponse(stored, options);
    if (!base)
        return null;

    return {
        ...base,
        mode: stored.mode || 'single',
        locale: stored.locale || '',
        vulnerabilityId: stored.vulnerabilityId || null,
        title: stored.title || '',
        vulnerabilityCount: stored.vulnerabilityCount || 0
    };
};

const isVulnerabilityQaReportCurrent = (vulnerability = {}, locale = '') => {
    const stored = normalizeLocaleQaReport(vulnerability.qaReports, locale);
    if (!stored?.fingerprint)
        return false;

    return stored.fingerprint === computeVulnerabilityQaFingerprint(vulnerability, locale);
};

const getCachedVulnerabilityQaReport = (vulnerability = {}, locale = '') => {
    if (!isVulnerabilityQaReportCurrent(vulnerability, locale))
        return null;

    const stored = normalizeLocaleQaReport(vulnerability.qaReports, locale);
    if (!stored)
        return null;

    return formatVulnerabilityQaReportResponse(stored, {
        cached: true,
        outdated: false
    });
};

const isAllVulnerabilitiesQaReportCurrent = (settings = {}, vulnerabilities = [], locale = '') => {
    const stored = getStoredAllVulnerabilitiesQaReport(settings, locale);
    if (!stored?.fingerprint)
        return false;

    return stored.fingerprint === computeAllVulnerabilitiesQaFingerprint(vulnerabilities, locale);
};

const getCachedAllVulnerabilitiesQaReport = (settings = {}, vulnerabilities = [], locale = '') => {
    if (!isAllVulnerabilitiesQaReportCurrent(settings, vulnerabilities, locale))
        return null;

    const stored = getStoredAllVulnerabilitiesQaReport(settings, locale);
    if (!stored)
        return null;

    return formatVulnerabilityQaReportResponse(stored, {
        cached: true,
        outdated: false
    });
};

const buildVulnerabilityQaReportCache = (fingerprint, result = {}, meta = {}) => {
    return {
        ...buildQaReportCache(fingerprint, result),
        locale: String(meta.locale || '').trim(),
        mode: meta.mode || 'single',
        vulnerabilityId: meta.vulnerabilityId || null,
        title: meta.title || '',
        vulnerabilityCount: meta.vulnerabilityCount || 0
    };
};

module.exports = {
    computeVulnerabilityQaFingerprint,
    computeAllVulnerabilitiesQaFingerprint,
    getCachedVulnerabilityQaReport,
    getCachedAllVulnerabilitiesQaReport,
    buildVulnerabilityQaReportCache,
    formatVulnerabilityQaReportResponse
};
