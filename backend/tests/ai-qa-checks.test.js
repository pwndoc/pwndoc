const {
    normalizeQaChecks,
    isQaCheckEnabled,
    hasEnabledAiQaChecks,
    hasEnabledQaChecks,
    validateQaChecksPayload,
    filterAiIssuesByEnabledChecks
} = require('../src/lib/ai-qa-checks');

module.exports = function() {
    describe('AI QA check toggles', () => {
        it('should default all QA checks to enabled', () => {
            const checks = normalizeQaChecks({});
            expect(checks.completeness).toBe(true);
            expect(checks.references).toBe(true);
            expect(checks.imageCaptions).toBe(true);
            expect(checks.redaction).toBe(true);
            expect(checks.customer).toBe(true);
            expect(checks.instructions).toBe(true);
        });

        it('should normalize disabled QA checks', () => {
            const checks = normalizeQaChecks({
                completeness: false,
                references: false
            });

            expect(checks.completeness).toBe(false);
            expect(checks.references).toBe(false);
            expect(checks.redaction).toBe(true);
        });

        it('should detect whether AI QA checks are enabled', () => {
            expect(hasEnabledAiQaChecks({
                completeness: true,
                references: true,
                redaction: false,
                customer: false,
                instructions: false
            })).toBe(false);

            expect(hasEnabledAiQaChecks({
                redaction: true
            })).toBe(true);
        });

        it('should validate QA check payloads', () => {
            expect(validateQaChecksPayload({ completeness: false }).valid).toBe(true);
            expect(validateQaChecksPayload({ unknown: true }).valid).toBe(false);
            expect(validateQaChecksPayload({ customer: 'yes' }).valid).toBe(false);
        });

        it('should filter AI issues by enabled checks', () => {
            const issues = filterAiIssuesByEnabledChecks([
                { category: 'customer', title: 'A', message: 'B', location: 'general' },
                { category: 'redaction', title: 'C', message: 'D', location: 'general' }
            ], {
                customer: true,
                redaction: false
            });

            expect(issues).toHaveLength(1);
            expect(issues[0].category).toBe('customer');
        });

        it('should report when no QA checks are enabled', () => {
            expect(hasEnabledQaChecks({
                completeness: false,
                references: false,
                imageCaptions: false,
                redaction: false,
                customer: false,
                instructions: false
            })).toBe(false);
            expect(isQaCheckEnabled({ completeness: false }, 'completeness')).toBe(false);
        });
    });
};
