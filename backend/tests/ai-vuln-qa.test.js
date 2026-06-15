const {
    runDuplicateChecks,
    runVulnerabilityStructuralChecks,
    getVulnerabilityDetail,
    formatVulnerabilityLocation
} = require('../src/lib/ai-vuln-qa');

module.exports = function() {
    describe('AI vulnerability QA', () => {
        const sampleVulnerabilities = [
            {
                _id: 'vuln-1',
                status: 0,
                category: 'Web',
                details: [{
                    locale: 'en',
                    title: 'SQL Injection',
                    description: '<p>SQLi in login form.</p>',
                    observation: '<p>Observed during testing.</p>',
                    remediation: '<p>Use parameterized queries.</p>'
                }]
            },
            {
                _id: 'vuln-2',
                status: 1,
                details: [{
                    locale: 'en',
                    title: 'sql injection',
                    description: '<p>Different content.</p>',
                    observation: '<p>Other observation.</p>',
                    remediation: '<p>Other remediation.</p>'
                }]
            },
            {
                _id: 'vuln-3',
                status: 0,
                details: [{
                    locale: 'en',
                    title: 'Stored XSS',
                    description: '<p>SQLi in login form.</p>',
                    observation: '<p>Observed during testing.</p>',
                    remediation: '<p>Use parameterized queries.</p>'
                }]
            }
        ];

        it('should format vulnerability locations', () => {
            expect(formatVulnerabilityLocation('SQL Injection')).toBe('vulnerability:SQL Injection');
            expect(formatVulnerabilityLocation('SQL Injection', 'description'))
                .toBe('vulnerability:SQL Injection/description');
        });

        it('should resolve vulnerability detail for locale', () => {
            const detail = getVulnerabilityDetail(sampleVulnerabilities[0], 'en');
            expect(detail.title).toBe('SQL Injection');
        });

        it('should flag duplicate titles and identical content', () => {
            const issues = runDuplicateChecks({
                vulnerabilities: sampleVulnerabilities,
                locale: 'en'
            });

            expect(issues.some((issue) => issue.title === 'Duplicate vulnerability title')).toBe(true);
            expect(issues.some((issue) => issue.title === 'Duplicate vulnerability content')).toBe(true);
            expect(issues.some((issue) => issue.category === 'aiDuplicates')).toBe(false);
        });

        it('should limit duplicate issues to a target vulnerability', () => {
            const issues = runDuplicateChecks({
                vulnerabilities: sampleVulnerabilities,
                locale: 'en',
                targetVulnerabilityId: 'vuln-1'
            });

            expect(issues.length).toBeGreaterThan(0);
            expect(issues.every((issue) => issue.location.includes('SQL Injection'))).toBe(true);
        });

        it('should flag missing core vulnerability fields', () => {
            const issues = runVulnerabilityStructuralChecks({
                status: 2,
                details: [{
                    locale: 'en',
                    title: 'Incomplete Template'
                }]
            }, {
                locale: 'en',
                title: 'Incomplete Template'
            });

            expect(issues.some((issue) => issue.title === 'Missing description')).toBe(true);
            expect(issues.some((issue) => issue.title === 'Pending vulnerability updates')).toBe(true);
        });
    });
};
