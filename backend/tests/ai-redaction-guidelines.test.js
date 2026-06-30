const {
    normalizeRedactionGuidelines,
    resolveRedactionGuidelinesForRequest,
    getRedactionGuidelinesText,
    appendRedactionGuidelinesToSystemPrompt,
    validateRedactionGuidelinesPayload
} = require('../src/lib/ai-redaction-guidelines');

module.exports = function() {
    describe('AI redaction guidelines', () => {
        it('should normalize inline delivery by default', () => {
            const normalized = normalizeRedactionGuidelines({ content: 'Never include client names.' });
            expect(normalized.delivery).toBe('inline');
            expect(normalized.content).toBe('Never include client names.');
        });

        it('should resolve inline guidelines for AI requests', () => {
            const resolved = resolveRedactionGuidelinesForRequest({
                ai: {
                    public: {
                        redactionGuidelines: {
                            delivery: 'inline',
                            content: 'Use neutral wording.'
                        }
                    }
                }
            });

            expect(getRedactionGuidelinesText(resolved)).toBe('Use neutral wording.');
        });

        it('should append inline guidelines to the system prompt', () => {
            const resolved = resolveRedactionGuidelinesForRequest({
                ai: {
                    public: {
                        redactionGuidelines: {
                            delivery: 'inline',
                            content: 'Redact credentials.'
                        }
                    }
                }
            });

            const systemPrompt = appendRedactionGuidelinesToSystemPrompt('Base prompt.', resolved);
            expect(systemPrompt).toContain('Base prompt.');
            expect(systemPrompt).toContain('Redact credentials.');
        });

        it('should validate bedrock cache delivery payloads', () => {
            const validation = validateRedactionGuidelinesPayload({
                delivery: 'bedrock_prompt_cache',
                content: '',
                bedrockPromptCache: {
                    cacheReference: 'cache-123',
                    region: 'us-east-1'
                }
            });

            expect(validation.valid).toBe(true);
        });
    });
};
