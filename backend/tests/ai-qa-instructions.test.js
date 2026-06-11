const {
    normalizeQaInstructions,
    resolveQaInstructionsForRequest,
    getQaInstructionsText,
    validateQaInstructionsPayload
} = require('../src/lib/ai-qa-instructions');

module.exports = function() {
    describe('AI QA instructions', () => {
        it('should normalize inline delivery by default', () => {
            const normalized = normalizeQaInstructions({ content: 'Verify executive summary tone.' });
            expect(normalized.delivery).toBe('inline');
            expect(normalized.content).toBe('Verify executive summary tone.');
        });

        it('should resolve inline instructions for AI requests', () => {
            const resolved = resolveQaInstructionsForRequest({
                ai: {
                    public: {
                        qaInstructions: {
                            delivery: 'inline',
                            content: 'Check customer naming consistency.'
                        }
                    }
                }
            });

            expect(getQaInstructionsText(resolved)).toBe('Check customer naming consistency.');
        });

        it('should validate bedrock cache delivery payloads', () => {
            const validation = validateQaInstructionsPayload({
                delivery: 'bedrock_prompt_cache',
                content: '',
                bedrockPromptCache: {
                    cacheReference: 'qa-cache-123',
                    region: 'us-east-1'
                }
            });

            expect(validation.valid).toBe(true);
        });
    });
};
