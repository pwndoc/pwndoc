const crypto = require('crypto');
const { buildAuditSnapshot } = require('./ai-qa');

const computeAuditQaFingerprint = (audit = {}) => {
    const snapshot = buildAuditSnapshot(audit);
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(snapshot))
        .digest('hex');
};

const normalizeStoredQaReport = (audit = {}) => {
    const raw = audit.qaReport;
    if (!raw)
        return null;

    if (Array.isArray(raw))
        return raw.length ? raw[raw.length - 1] : null;

    return raw;
};

const formatQaReportResponse = (stored = {}, options = {}) => {
    if (!stored?.fingerprint || !stored?.ranAt)
        return null;

    return {
        summary: String(stored.summary || ''),
        issues: Array.isArray(stored.issues) ? stored.issues : [],
        aiAnalysis: Boolean(stored.aiAnalysis),
        provider: stored.provider || null,
        model: stored.model || null,
        counts: stored.counts || {
            total: 0,
            error: 0,
            warning: 0,
            info: 0
        },
        cached: Boolean(options.cached),
        outdated: Boolean(options.outdated),
        ranAt: stored.ranAt
    };
};

const getLatestQaReport = (audit = {}) => {
    const stored = normalizeStoredQaReport(audit);
    if (!stored)
        return null;

    return formatQaReportResponse(stored, {
        cached: false,
        outdated: false
    });
};

const isQaReportCurrent = (audit = {}) => {
    const stored = normalizeStoredQaReport(audit);
    if (!stored?.fingerprint)
        return false;

    return stored.fingerprint === computeAuditQaFingerprint(audit);
};

const getCachedQaReport = (audit = {}) => {
    if (!isQaReportCurrent(audit))
        return null;

    const stored = normalizeStoredQaReport(audit);
    if (!stored)
        return null;

    return formatQaReportResponse(stored, {
        cached: true,
        outdated: false
    });
};

const getOutdatedQaReport = (audit = {}) => {
    if (isQaReportCurrent(audit))
        return null;

    const stored = normalizeStoredQaReport(audit);
    if (!stored)
        return null;

    return formatQaReportResponse(stored, {
        cached: true,
        outdated: true
    });
};

const buildQaReportCache = (fingerprint, result = {}) => {
    return {
        fingerprint: fingerprint,
        ranAt: new Date(),
        summary: String(result.summary || ''),
        issues: Array.isArray(result.issues) ? result.issues : [],
        aiAnalysis: Boolean(result.aiAnalysis),
        provider: result.provider || null,
        model: result.model || null,
        counts: result.counts || {
            total: 0,
            error: 0,
            warning: 0,
            info: 0
        }
    };
};

module.exports = {
    computeAuditQaFingerprint,
    normalizeStoredQaReport,
    getLatestQaReport,
    isQaReportCurrent,
    getCachedQaReport,
    getOutdatedQaReport,
    buildQaReportCache,
    formatQaReportResponse
};
