const {
    computeVulnerabilityQaFingerprint,
    computeAllVulnerabilitiesQaFingerprint,
    getCachedVulnerabilityQaReport,
    getCachedAllVulnerabilitiesQaReport,
    buildVulnerabilityQaReportCache
} = require('../src/lib/ai-vuln-qa-cache');

module.exports = function() {
    describe('AI vulnerability QA cache', () => {
        const locale = 'en-US';
        const vulnerability = {
            _id: 'vuln-1',
            category: 'Web',
            cvssv3: '5.0',
            details: [{
                locale: locale,
                title: 'Missing HSTS',
                description: '<p>No HSTS header</p>',
                observation: '<p>Observed on login</p>',
                remediation: '<p>Enable HSTS</p>',
                references: ['https://example.com']
            }]
        };

        const buildStoredReport = (fingerprint, summary = 'Cached summary') => {
            return buildVulnerabilityQaReportCache(fingerprint, {
                summary: summary,
                issues: [{
                    severity: 'warning',
                    category: 'completeness',
                    title: 'Cached issue',
                    message: 'Still valid',
                    location: 'vulnerability:Missing HSTS',
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
            }, {
                locale: locale,
                mode: 'single',
                vulnerabilityId: 'vuln-1',
                title: 'Missing HSTS'
            });
        };

        it('should return cached single-vulnerability QA when the fingerprint matches', () => {
            const fingerprint = computeVulnerabilityQaFingerprint(vulnerability, locale);
            const cached = getCachedVulnerabilityQaReport({
                ...vulnerability,
                qaReports: [buildStoredReport(fingerprint)]
            }, locale);

            expect(cached).toEqual(expect.objectContaining({
                cached: true,
                mode: 'single',
                title: 'Missing HSTS',
                summary: 'Cached summary'
            }));
        });

        it('should invalidate single-vulnerability QA when content changes', () => {
            const fingerprint = computeVulnerabilityQaFingerprint(vulnerability, locale);
            const changed = {
                ...vulnerability,
                details: [{
                    ...vulnerability.details[0],
                    remediation: '<p>Enable HSTS with preload</p>'
                }],
                qaReports: [buildStoredReport(fingerprint)]
            };

            expect(getCachedVulnerabilityQaReport(changed, locale)).toBeNull();
        });

        it('should return cached all-vulnerabilities QA when the fingerprint matches', () => {
            const fingerprint = computeAllVulnerabilitiesQaFingerprint([vulnerability], locale);
            const cached = getCachedAllVulnerabilitiesQaReport({
                vulnerabilityQaReports: {
                    [locale]: buildVulnerabilityQaReportCache(fingerprint, {
                        summary: 'All cached',
                        issues: [],
                        counts: { total: 0, error: 0, warning: 0, info: 0 }
                    }, {
                        locale: locale,
                        mode: 'all',
                        vulnerabilityCount: 1
                    })
                }
            }, [vulnerability], locale);

            expect(cached).toEqual(expect.objectContaining({
                cached: true,
                mode: 'all',
                vulnerabilityCount: 1,
                summary: 'All cached'
            }));
        });
    });
};
