const {
    MASKED_SECRET,
    sanitizeSettingsForClient,
    mergeSettingsSecrets
} = require('../src/lib/settings-secrets');

module.exports = function() {
    describe('Settings secrets', () => {
        // Pinned to the literal value, not just re-imported, so a drift from the frontend's
        // independent copy in ai-provider-settings.vue is caught here rather than silently
        // breaking secret masking (see the comment on MASKED_SECRET in settings-secrets.js).
        it('MASKED_SECRET matches the frontend sentinel', () => {
            expect(MASKED_SECRET).toBe('••••••••••••••••');
        });

        const buildSettings = (openaiApiKey) => ({
            ai: {
                private: {
                    openaiApiKey: openaiApiKey,
                    anthropicApiKey: ''
                },
                public: { enabled: true }
            }
        });

        describe('sanitizeSettingsForClient', () => {
            it('masks the OrcaRouter API key and flags it as configured', () => {
                const sanitized = sanitizeSettingsForClient({
                    ai: { private: { orcarouterApiKey: 'sk-orca-test-value' }, public: {} }
                });

                expect(sanitized.ai.private.orcarouterApiKey).toBe('');
                expect(sanitized.ai.private.orcarouterApiKeyConfigured).toBe(true);
            });

            it('masks a configured secret and flags it as configured', () => {
                const sanitized = sanitizeSettingsForClient(buildSettings('super-secret-key'));

                expect(sanitized.ai.private.openaiApiKey).toBe('');
                expect(sanitized.ai.private.openaiApiKeyConfigured).toBe(true);
            });

            it('flags an unconfigured secret as not configured', () => {
                const sanitized = sanitizeSettingsForClient(buildSettings(''));

                expect(sanitized.ai.private.openaiApiKey).toBe('');
                expect(sanitized.ai.private.openaiApiKeyConfigured).toBe(false);
            });
        });

        describe('mergeSettingsSecrets', () => {
            it('keeps a stored OrcaRouter key when the client resends the masked sentinel', () => {
                const merged = mergeSettingsSecrets(
                    { ai: { private: { orcarouterApiKey: MASKED_SECRET } } },
                    { ai: { private: { orcarouterApiKey: 'persisted-orca-key' } } }
                );

                expect(merged.ai.private.orcarouterApiKey).toBe('persisted-orca-key');
            });

            it('keeps the existing secret when the client resends the masked sentinel', () => {
                const existing = buildSettings('persisted-key');
                const incoming = buildSettings(MASKED_SECRET);

                const merged = mergeSettingsSecrets(incoming, existing);

                expect(merged.ai.private.openaiApiKey).toBe('persisted-key');
            });

            it('clears the stored secret when the client submits an empty value', () => {
                const existing = buildSettings('persisted-key');
                const incoming = buildSettings('');

                const merged = mergeSettingsSecrets(incoming, existing);

                expect(merged.ai.private.openaiApiKey).toBe('');
            });

            // Regression guard for "API key lost after disabling AI".
            it('preserves stored secrets when the payload omits the private branch', () => {
                const existing = buildSettings('persisted-key');
                const incoming = { ai: { public: { enabled: false } } };

                const merged = mergeSettingsSecrets(incoming, existing);

                expect(merged.ai.private).toBeUndefined();
                expect(existing.ai.private.openaiApiKey).toBe('persisted-key');
            });

            it('sets a new secret when the client submits a different value', () => {
                const existing = buildSettings('old-key');
                const incoming = buildSettings('new-key');

                const merged = mergeSettingsSecrets(incoming, existing);

                expect(merged.ai.private.openaiApiKey).toBe('new-key');
            });
        });
    });
};
