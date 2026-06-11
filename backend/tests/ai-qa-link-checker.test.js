const dns = require('dns').promises;
const {
    extractUrlsFromReferences,
    isBlockedReferenceUrl,
    isAllowedReferenceUrl,
    validateReferenceUrl,
    runReferenceLinkChecks
} = require('../src/lib/ai-qa-link-checker');

module.exports = function() {
    describe('AI QA reference link checker', () => {
        const originalFetch = global.fetch;
        let lookupSpy = null;

        beforeEach(() => {
            lookupSpy = jest.spyOn(dns, 'lookup').mockImplementation(async (hostname, options = {}) => {
                if (hostname === 'example.com') {
                    const entries = [{ address: '93.184.216.34', family: 4 }];
                    return options.all ? entries : entries[0];
                }
                throw new Error(`Unexpected DNS lookup for ${hostname}`);
            });
        });

        afterEach(() => {
            global.fetch = originalFetch;
            if (lookupSpy)
                lookupSpy.mockRestore();
        });

        it('should extract HTTP(S) URLs from reference strings', () => {
            const urls = extractUrlsFromReferences([
                'CWE-79: https://cwe.mitre.org/data/definitions/79.html',
                'OWASP https://owasp.org/www-project-top-ten/'
            ]);

            expect(urls).toEqual([
                'https://cwe.mitre.org/data/definitions/79.html',
                'https://owasp.org/www-project-top-ten/'
            ]);
        });

        it('should block private and local URLs', () => {
            expect(isBlockedReferenceUrl('http://localhost/test')).toBe(true);
            expect(isBlockedReferenceUrl('http://127.0.0.1/test')).toBe(true);
            expect(isBlockedReferenceUrl('http://192.168.1.10/test')).toBe(true);
            expect(isBlockedReferenceUrl('ftp://example.com/test')).toBe(true);
            expect(isBlockedReferenceUrl('https://example.com/test')).toBe(false);
        });

        it('should block hostnames that resolve to private addresses', async () => {
            lookupSpy.mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);

            expect(await isAllowedReferenceUrl('https://evil.example/test')).toBe(false);
        });

        it('should allow hostnames that resolve to public addresses', async () => {
            expect(await isAllowedReferenceUrl('https://example.com/test')).toBe(true);
        });

        it('should flag unreachable reference URLs', async () => {
            global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

            const result = await validateReferenceUrl('https://example.com/missing');
            expect(result.valid).toBe(false);
            expect(result.severity).toBe('error');
            expect(result.message).toContain('could not be reached');
        });

        it('should treat HTTP 404 as an invalid reference', async () => {
            global.fetch = jest.fn().mockResolvedValue({ status: 404 });

            const result = await validateReferenceUrl('https://example.com/missing');
            expect(result.valid).toBe(false);
            expect(result.severity).toBe('error');
            expect(result.message).toContain('404');
        });

        it('should treat HTTP 400 with the same severity as 404', async () => {
            global.fetch = jest.fn().mockResolvedValue({ status: 400 });

            const result = await validateReferenceUrl('https://example.com/bad-request');
            expect(result.valid).toBe(false);
            expect(result.severity).toBe('error');
            expect(result.message).toContain('400');
            expect(result.message).toContain('unavailable');
        });

        it('should accept healthy reference URLs', async () => {
            global.fetch = jest.fn().mockResolvedValue({ status: 200 });

            const result = await validateReferenceUrl('https://example.com/ok');
            expect(result.valid).toBe(true);
        });

        it('should block redirects to private URLs', async () => {
            global.fetch = jest.fn()
                .mockResolvedValueOnce({
                    status: 302,
                    headers: {
                        get: (name) => name.toLowerCase() === 'location' ? 'http://127.0.0.1/internal' : null
                    }
                });

            const result = await validateReferenceUrl('https://example.com/redirect');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('not allowed');
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should create issues for invalid finding reference links', async () => {
            global.fetch = jest.fn().mockResolvedValue({ status: 404 });

            const issues = await runReferenceLinkChecks({
                findings: [{
                    identifier: 3,
                    title: 'XSS',
                    references: ['https://example.com/broken-link']
                }]
            });

            expect(issues).toHaveLength(1);
            expect(issues[0].category).toBe('references');
            expect(issues[0].location).toBe('finding:XSS/references');
            expect(issues[0].message).toContain('https://example.com/broken-link');
        });
    });
};
