const {
    computeAuditQaFingerprint,
    getCachedQaReport,
    getLatestQaReport,
    getOutdatedQaReport,
    isQaReportCurrent,
    buildQaReportCache
} = require('../src/lib/ai-qa-cache');

module.exports = function() {
    describe('AI QA cache', () => {
        const baseAudit = {
            name: 'Web App Pentest',
            findings: [{
                identifier: 1,
                title: 'SQL Injection',
                description: '<p>Initial description</p>'
            }],
            sections: []
        };

        const buildStoredReport = (audit, summary = 'Cached summary') => {
            const fingerprint = computeAuditQaFingerprint(audit);
            return buildQaReportCache(fingerprint, {
                summary: summary,
                issues: [{
                    severity: 'warning',
                    category: 'completeness',
                    title: 'Cached issue',
                    message: 'Still valid',
                    location: 'report',
                    source: 'structural'
                }],
                aiAnalysis: false,
                provider: null,
                model: null,
                counts: {
                    total: 1,
                    error: 0,
                    warning: 1,
                    info: 0
                }
            });
        };

        it('should compute a stable fingerprint for the same audit snapshot', () => {
            const first = computeAuditQaFingerprint(baseAudit);
            const second = computeAuditQaFingerprint({
                ...baseAudit,
                qaReport: {
                    fingerprint: 'stale',
                    summary: 'old'
                }
            });

            expect(first).toBe(second);
        });

        it('should change the fingerprint when report content changes', () => {
            const before = computeAuditQaFingerprint(baseAudit);
            const after = computeAuditQaFingerprint({
                ...baseAudit,
                findings: [{
                    identifier: 1,
                    title: 'SQL Injection',
                    description: '<p>Updated description</p>'
                }]
            });

            expect(before).not.toBe(after);
        });

        it('should return cached QA results when the fingerprint matches', () => {
            const cached = getCachedQaReport({
                ...baseAudit,
                qaReport: buildStoredReport(baseAudit)
            });

            expect(cached).toEqual(expect.objectContaining({
                cached: true,
                outdated: false,
                summary: 'Cached summary',
                issues: [expect.objectContaining({ title: 'Cached issue' })]
            }));
        });

        it('should return the latest stored QA report even when outdated', () => {
            const outdated = getOutdatedQaReport({
                ...baseAudit,
                findings: [{
                    identifier: 1,
                    title: 'SQL Injection',
                    description: '<p>Changed after QA</p>'
                }],
                qaReport: buildStoredReport(baseAudit)
            });

            expect(outdated).toEqual(expect.objectContaining({
                cached: true,
                outdated: true,
                summary: 'Cached summary'
            }));
            expect(isQaReportCurrent({
                ...baseAudit,
                findings: [{
                    identifier: 1,
                    title: 'SQL Injection',
                    description: '<p>Changed after QA</p>'
                }],
                qaReport: buildStoredReport(baseAudit)
            })).toBe(false);
        });

        it('should keep only the latest QA report when legacy array storage exists', () => {
            const latest = getLatestQaReport({
                ...baseAudit,
                qaReport: [
                    buildStoredReport(baseAudit, 'Old report'),
                    buildStoredReport(baseAudit, 'Latest report')
                ]
            });

            expect(latest.summary).toBe('Latest report');
        });

        it('should not return cached or outdated QA results when no report exists', () => {
            expect(getCachedQaReport(baseAudit)).toBeNull();
            expect(getOutdatedQaReport(baseAudit)).toBeNull();
            expect(getLatestQaReport(baseAudit)).toBeNull();
        });
    });
};
