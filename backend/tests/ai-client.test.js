const {
    extractJsonObjectFromText,
    getQaIssuesFromParsed,
    getDraftFromParsed,
    normalizeChatMessages,
    mapLlmError,
    buildLlmConfig,
    configureChatTemperature
} = require('../src/lib/ai-client');

const { normalizeAiDuplicateIssues } = require('../src/lib/ai-vuln-duplicate-ai');

module.exports = function() {
    describe('LLM JSON extraction', () => {
        it('should parse a bare JSON object', () => {
            expect(extractJsonObjectFromText('{"draft":"hello"}')).toEqual({ draft: 'hello' });
        });

        it('should strip markdown fences around the object', () => {
            expect(extractJsonObjectFromText('```json\n{"draft":"hello"}\n```')).toEqual({ draft: 'hello' });
            expect(extractJsonObjectFromText('```\n{"draft":"hello"}\n```')).toEqual({ draft: 'hello' });
        });

        it('should salvage an object wrapped in model prose', () => {
            const parsed = extractJsonObjectFromText('Sure, here you go:\n{"draft":"hello"}\nHope that helps!');
            expect(parsed).toEqual({ draft: 'hello' });
        });

        it('should return null for empty or non-JSON content', () => {
            expect(extractJsonObjectFromText('')).toBeNull();
            expect(extractJsonObjectFromText('   ')).toBeNull();
            expect(extractJsonObjectFromText(undefined)).toBeNull();
            expect(extractJsonObjectFromText('I cannot help with that request.')).toBeNull();
        });

        it('should return null for JSON truncated mid-object', () => {
            expect(extractJsonObjectFromText('{"draft":"hello wor')).toBeNull();
        });
    });

    describe('QA issue parsing', () => {
        it('should keep the template link fields the catalog prompts ask for', () => {
            const { issues } = getQaIssuesFromParsed({
                summary: 'found duplicates',
                issues: [{
                    severity: 'warning',
                    category: 'aiDuplicates',
                    title: 'Likely duplicate',
                    message: 'Two XSS templates overlap',
                    location: 'finding:Reflected XSS',
                    vulnerabilityId: 'vuln-1',
                    templateTitle: 'Reflected XSS',
                    locale: 'en',
                    relatedTemplates: [{ vulnerabilityId: 'vuln-2', title: 'XSS Reflected', reason: 'same issue' }]
                }]
            });

            expect(issues).toHaveLength(1);
            expect(issues[0].vulnerabilityId).toBe('vuln-1');
            expect(issues[0].templateTitle).toBe('Reflected XSS');
            expect(issues[0].locale).toBe('en');
            expect(issues[0].relatedTemplates).toEqual([
                { vulnerabilityId: 'vuln-2', title: 'XSS Reflected', reason: 'same issue' }
            ]);
        });

        // The duplicate suite mocks ai-client, so only this covers the real producer/consumer seam.
        it('should preserve duplicate pairing end to end into the catalog normalizer', () => {
            const parsed = getQaIssuesFromParsed({
                summary: '',
                issues: [{
                    severity: 'warning',
                    category: 'aiDuplicates',
                    title: 'Likely duplicate vulnerability',
                    message: 'Both describe the same SQLi',
                    vulnerabilityId: 'vuln-1',
                    templateTitle: 'SQL Injection',
                    relatedTemplates: [{ vulnerabilityId: 'vuln-2', title: 'SQLi' }]
                }]
            });

            const normalized = normalizeAiDuplicateIssues(parsed.issues, {
                catalogById: new Map([
                    ['vuln-1', { vulnerabilityId: 'vuln-1', title: 'SQL Injection' }],
                    ['vuln-2', { vulnerabilityId: 'vuln-2', title: 'SQLi' }]
                ]),
                catalogByTitle: new Map([
                    ['sql injection', { vulnerabilityId: 'vuln-1', title: 'SQL Injection' }],
                    ['sqli', { vulnerabilityId: 'vuln-2', title: 'SQLi' }]
                ])
            });

            expect(normalized).toHaveLength(1);
            expect(normalized[0].vulnerabilityIds.sort()).toEqual(['vuln-1', 'vuln-2']);
        });

        it('should default unknown severity and category to warning/other', () => {
            const { issues } = getQaIssuesFromParsed({
                issues: [{ severity: 'catastrophic', category: 'invented', title: 'T', message: 'M' }]
            });

            expect(issues[0].severity).toBe('warning');
            expect(issues[0].category).toBe('other');
            expect(issues[0].source).toBe('ai');
            expect(issues[0].location).toBe('report');
        });

        it('should drop issues missing a title or message', () => {
            const { issues } = getQaIssuesFromParsed({
                summary: 'ok',
                issues: [
                    { title: 'Has title', message: '' },
                    { title: 'Kept', message: 'Real finding' }
                ]
            });

            expect(issues).toHaveLength(1);
            expect(issues[0].title).toBe('Kept');
        });

        it('should throw when the response has neither issues nor a summary', () => {
            expect(() => getQaIssuesFromParsed({}, 'OpenAI')).toThrow(
                expect.objectContaining({ fn: 'BadRequest' })
            );
        });

        it('should accept an empty issue list when a summary is present', () => {
            expect(getQaIssuesFromParsed({ summary: 'All good', issues: [] })).toEqual({
                summary: 'All good',
                issues: []
            });
        });
    });

    describe('draft parsing', () => {
        it('should trim a text draft', () => {
            expect(getDraftFromParsed('text', { draft: '  hello  ' })).toBe('hello');
        });

        it('should split a newline-delimited string into an array draft', () => {
            expect(getDraftFromParsed('array', { draft: 'one\n\ntwo\n' })).toEqual(['one', 'two']);
        });

        it('should throw on a blank or missing draft', () => {
            expect(() => getDraftFromParsed('text', { draft: '   ' }, 'OpenAI')).toThrow(
                expect.objectContaining({ fn: 'BadRequest' })
            );
            expect(() => getDraftFromParsed('array', { draft: [] }, 'OpenAI')).toThrow(
                expect.objectContaining({ fn: 'BadRequest' })
            );
        });
    });

    describe('chat message normalization', () => {
        it('should keep only user and assistant turns with content', () => {
            expect(normalizeChatMessages([
                { role: 'User', content: ' hi ' },
                { role: 'assistant', content: 'hello' },
                { role: 'system', content: 'ignored' },
                { role: 'user', content: '   ' }
            ])).toEqual([
                { role: 'user', content: 'hi' },
                { role: 'assistant', content: 'hello' }
            ]);
        });

        it('should return an empty array for non-array input', () => {
            expect(normalizeChatMessages(undefined)).toEqual([]);
            expect(normalizeChatMessages('nope')).toEqual([]);
        });
    });

    describe('provider error mapping', () => {
        it('should map an abort to a timeout message', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            expect(mapLlmError(err, 'OpenAI', 5000)).toEqual({
                fn: 'BadRequest',
                message: 'OpenAI request timed out after 5000ms'
            });
        });

        it('should map a configuration error to BadParameters', () => {
            const err = new Error('nope');
            err.name = 'ConfigurationError';
            expect(mapLlmError(err, 'Ollama', 1000).fn).toBe('BadParameters');
        });

        it('should redact an API key echoed back in a provider error body', () => {
            const err = new Error('Unauthorized');
            err.status = 401;
            err.body = 'Incorrect API key provided: sk-proj-abcdef1234567890. Check your key.';

            const mapped = mapLlmError(err, 'OpenAI', 5000);

            expect(mapped.message).not.toContain('sk-proj-abcdef1234567890');
            expect(mapped.message).toContain('sk-[redacted]');
            expect(mapped.message).toContain('HTTP 401');
        });

        it('should redact AWS access key ids and URL credentials', () => {
            const bedrock = new Error('denied');
            bedrock.status = 403;
            bedrock.body = { message: 'AKIAIOSFODNN7EXAMPLE is not authorized' };
            expect(mapLlmError(bedrock, 'AWS Bedrock', 5000).message).not.toContain('AKIAIOSFODNN7EXAMPLE');

            const urlErr = new Error('connect failed for https://user:hunter2@llm.internal/v1');
            expect(mapLlmError(urlErr, 'Ollama', 5000).message).not.toContain('hunter2');
        });

        it('should surface a blocked empty response hint', () => {
            const err = new Error("Cannot read properties of undefined (reading 'message')");
            expect(mapLlmError(err, 'AWS Bedrock', 5000).message).toContain('empty or blocked response');
        });
    });

    describe('provider config assembly', () => {
        it('should prefer a bedrock api key and fall back to IAM credentials', () => {
            const withKey = buildLlmConfig('bedrock', {
                timeoutMs: 1000, region: 'us-east-1', apiKey: 'key', accessKeyId: 'AK', secretAccessKey: 'SK'
            });
            expect(withKey.bedrockApiKey).toBe('key');
            expect(withKey.bedrockAccessKeyId).toBeUndefined();

            const withIam = buildLlmConfig('bedrock', {
                timeoutMs: 1000, region: 'us-east-1', apiKey: '', accessKeyId: 'AK', secretAccessKey: 'SK', sessionToken: 'ST'
            });
            expect(withIam.bedrockAccessKeyId).toBe('AK');
            expect(withIam.bedrockSecretAccessKey).toBe('SK');
            expect(withIam.bedrockSessionToken).toBe('ST');
            expect(withIam.bedrockApiKey).toBeUndefined();
        });

        it('should never send an api key for ollama', () => {
            const config = buildLlmConfig('ollama', { timeoutMs: 1000, baseUrl: 'http://ollama:11434', apiKey: 'secret' });
            expect(config.ollamaApiBase).toBe('http://ollama:11434');
            expect(JSON.stringify(config)).not.toContain('secret');
        });

        it('should disable retries so the request timeout stays bounded', () => {
            expect(buildLlmConfig('openai', { timeoutMs: 9000, baseUrl: 'x', apiKey: 'k' })).toMatchObject({
                maxRetries: 0,
                requestTimeout: 9000
            });
        });

        it('should route OrcaRouter through the OpenAI wire transport with its own base URL', () => {
            const config = buildLlmConfig('orcarouter', {
                timeoutMs: 8000,
                apiKey: 'sk-orca-test-value',
                baseUrl: 'https://api.orcarouter.ai/v1'
            });

            expect(config).toMatchObject({
                provider: 'openai',
                openaiApiKey: 'sk-orca-test-value',
                openaiApiBase: 'https://api.orcarouter.ai/v1',
                requestTimeout: 8000,
                maxRetries: 0
            });
        });

        it('should redact an sk-orca key echoed back in a provider error body', () => {
            const err = new Error('Unauthorized');
            err.status = 401;
            err.body = 'Invalid key sk-orca-abcdef1234567890';

            const mapped = mapLlmError(err, 'OrcaRouter Cyber Inference', 5000);

            expect(mapped.message).not.toContain('sk-orca-abcdef1234567890');
            expect(mapped.message).toContain('[redacted]');
            expect(mapped.message).toContain('OrcaRouter Cyber Inference returned HTTP 401');
        });

        it('should skip temperature for bedrock only', () => {
            const chat = { withTemperature: jest.fn().mockReturnValue('with-temp') };

            expect(configureChatTemperature(chat, 'bedrock', 0.1)).toBe(chat);
            expect(chat.withTemperature).not.toHaveBeenCalled();

            expect(configureChatTemperature(chat, 'openai', 0.1)).toBe('with-temp');
            expect(chat.withTemperature).toHaveBeenCalledWith(0.1);
        });
    });
};
