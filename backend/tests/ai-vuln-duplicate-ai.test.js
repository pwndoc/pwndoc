const {
    buildVulnerabilityCatalog,
    normalizeAiDuplicateIssues
} = require('../src/lib/ai-vuln-duplicate-ai');

module.exports = function() {
    describe('AI vulnerability duplicate detection', () => {
        const vulnerabilities = [
            {
                _id: 'vuln-1',
                details: [{
                    locale: 'en',
                    title: 'Blind SQL Injection in Authentication',
                    vulnType: 'Injection',
                    description: '<p>SQL injection in login form.</p>',
                    observation: '<p>Found during testing.</p>',
                    remediation: '<p>Use parameterized queries.</p>'
                }]
            },
            {
                _id: 'vuln-2',
                details: [{
                    locale: 'en',
                    title: 'SQLi on Login Page',
                    vulnType: 'Injection',
                    description: '<p>SQL injection in login form.</p>',
                    observation: '<p>Found during testing.</p>',
                    remediation: '<p>Use parameterized queries.</p>'
                }]
            }
        ];

        it('should build a vulnerability catalog for a locale', () => {
            const catalog = buildVulnerabilityCatalog(vulnerabilities, 'en');
            expect(catalog).toHaveLength(2);
            expect(catalog[0].title).toBe('Blind SQL Injection in Authentication');
        });

        it('should normalize AI duplicate issues with related templates', () => {
            const catalog = buildVulnerabilityCatalog(vulnerabilities, 'en');
            const catalogById = new Map(catalog.map((entry) => [entry.vulnerabilityId, entry]));
            const catalogByTitle = new Map(catalog.map((entry) => [entry.title.toLowerCase(), entry]));

            const issues = normalizeAiDuplicateIssues([
                {
                    severity: 'warning',
                    title: 'Likely duplicate vulnerability',
                    message: 'Both templates describe SQL injection in the login form.',
                    vulnerabilityId: 'vuln-1',
                    templateTitle: 'Blind SQL Injection in Authentication',
                    relatedTemplates: [{
                        vulnerabilityId: 'vuln-2',
                        title: 'SQLi on Login Page',
                        reason: 'Both describe SQL injection in the login form.'
                    }]
                }
            ], {
                catalogById: catalogById,
                catalogByTitle: catalogByTitle
            });

            expect(issues).toHaveLength(1);
            expect(issues[0].category).toBe('aiDuplicates');
            expect(issues[0].source).toBe('ai');
            expect(issues[0].message).toContain('SQLi on Login Page');
        });

        it('should filter AI duplicate issues to a target vulnerability', () => {
            const catalog = buildVulnerabilityCatalog(vulnerabilities, 'en');
            const catalogById = new Map(catalog.map((entry) => [entry.vulnerabilityId, entry]));
            const catalogByTitle = new Map(catalog.map((entry) => [entry.title.toLowerCase(), entry]));

            const issues = normalizeAiDuplicateIssues([
                {
                    severity: 'warning',
                    title: 'Likely duplicate vulnerability',
                    vulnerabilityId: 'vuln-1',
                    templateTitle: 'Blind SQL Injection in Authentication',
                    relatedTemplates: [{
                        vulnerabilityId: 'vuln-2',
                        title: 'SQLi on Login Page'
                    }]
                }
            ], {
                targetVulnerabilityId: 'vuln-2',
                catalogById: catalogById,
                catalogByTitle: catalogByTitle
            });

            expect(issues).toHaveLength(1);
            expect(issues[0].location).toBe('vulnerability:SQLi on Login Page');
        });
    });
};
