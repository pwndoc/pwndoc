const {
    formatFindingLocation,
    resolveIssueLocation,
    normalizeAiIssueLocation,
    normalizeIssueLocations
} = require('../src/lib/ai-qa-location');

module.exports = function() {
    describe('AI QA issue locations', () => {
        const findings = [{
            identifier: 2,
            title: 'SQL Injection'
        }];

        it('should use finding titles in locations', () => {
            expect(formatFindingLocation(findings[0])).toBe('finding:SQL Injection');
        });

        it('should remap legacy IDX locations to finding titles', () => {
            expect(resolveIssueLocation('finding:IDX-002/references', findings))
                .toBe('finding:SQL Injection/references');
        });

        it('should normalize issue locations before returning QA results', () => {
            const issues = normalizeIssueLocations([
                {
                    category: 'instructions',
                    location: 'finding:IDX-002',
                    title: 'Tone issue',
                    message: 'Executive summary wording is off.'
                }
            ], findings);

            expect(issues[0].location).toBe('finding:SQL Injection');
        });

        it('should normalize AI field path locations to canonical finding locations', () => {
            expect(normalizeAiIssueLocation('field path: finding.references', {
                entityPrefix: 'finding',
                defaultTitle: 'SQL Injection'
            })).toBe('finding:SQL Injection/references');
        });

        it('should normalize AI field path locations for vulnerability QA', () => {
            expect(normalizeAiIssueLocation('field path: finding.cvssv3', {
                entityPrefix: 'vulnerability',
                defaultTitle: 'Missing HSTS'
            })).toBe('vulnerability:Missing HSTS/cvssv3');
        });

        it('should keep field-only locations when no title is available', () => {
            expect(normalizeAiIssueLocation('field path: finding.category', {
                entityPrefix: 'finding'
            })).toBe('field:category');
        });
    });
};
