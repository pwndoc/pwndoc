const crypto = require('crypto');
const {
    createWebhookEvent,
    dispatchWebhook,
    signWebhookPayload
} = require('../src/lib/webhook');
const {
    DEFAULT_EVENTS,
    DEFAULT_TIMEOUT_MS,
    getWebhookConfig
} = require('../src/lib/webhook-config');
const {
    buildAuditUpdateEvents,
    emitAuditUpdateWebhooks
} = require('../src/lib/audit-webhooks');

describe('Generic webhooks', () => {
    const enabledConfig = {
        enabled: true,
        url: 'https://integrations.example.test/pwndoc',
        secret: 'test-webhook-secret',
        events: new Set(DEFAULT_EVENTS),
        timeoutMs: DEFAULT_TIMEOUT_MS
    };

    describe('configuration', () => {
        it('is disabled when no endpoint is configured', () => {
            const config = getWebhookConfig({});

            expect(config.enabled).toBe(false);
            expect(config.events).toEqual(new Set(DEFAULT_EVENTS));
        });

        it('requires a secret when an endpoint is configured', () => {
            expect(() => getWebhookConfig({
                PWNDOC_WEBHOOK_URL: 'https://integrations.example.test/pwndoc'
            })).toThrow('PWNDOC_WEBHOOK_SECRET is required');
        });

        it('rejects unsupported URL protocols and embedded credentials', () => {
            expect(() => getWebhookConfig({
                PWNDOC_WEBHOOK_URL: 'file:///tmp/webhook',
                PWNDOC_WEBHOOK_SECRET: 'secret'
            })).toThrow('must use HTTP or HTTPS');

            expect(() => getWebhookConfig({
                PWNDOC_WEBHOOK_URL: 'https://user:password@example.test/webhook',
                PWNDOC_WEBHOOK_SECRET: 'secret'
            })).toThrow('must not contain credentials');
        });

        it('parses an event allowlist and timeout', () => {
            const config = getWebhookConfig({
                PWNDOC_WEBHOOK_URL: 'https://integrations.example.test/pwndoc',
                PWNDOC_WEBHOOK_SECRET: 'secret',
                PWNDOC_WEBHOOK_EVENTS: 'audit.updated, audit.state.changed',
                PWNDOC_WEBHOOK_TIMEOUT_MS: '2500'
            });

            expect(config.events).toEqual(new Set(['audit.updated', 'audit.state.changed']));
            expect(config.timeoutMs).toBe(2500);
        });

        it('rejects malformed or excessive timeouts', () => {
            expect(() => getWebhookConfig({
                PWNDOC_WEBHOOK_TIMEOUT_MS: '2500ms'
            })).toThrow('PWNDOC_WEBHOOK_TIMEOUT_MS must be between');

            expect(() => getWebhookConfig({
                PWNDOC_WEBHOOK_TIMEOUT_MS: '60001'
            })).toThrow('PWNDOC_WEBHOOK_TIMEOUT_MS must be between');
        });
    });

    it('creates a versioned event envelope', () => {
        const event = createWebhookEvent('audit.updated', {auditId: 'audit-1'}, {
            idGenerator: () => 'delivery-1',
            now: () => new Date('2026-09-10T12:00:00.000Z')
        });

        expect(event).toEqual({
            version: 1,
            id: 'delivery-1',
            type: 'audit.updated',
            createdAt: '2026-09-10T12:00:00.000Z',
            data: {auditId: 'audit-1'}
        });
    });

    it('signs the exact JSON request body and sends delivery metadata', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({ok: true, status: 204});

        const result = await dispatchWebhook('audit.updated', {
            auditId: 'audit-1',
            actorId: 'user-1',
            changedFields: ['customFields']
        }, {
            config: enabledConfig,
            fetchImpl: fetchImpl,
            idGenerator: () => 'delivery-1',
            now: () => new Date('2026-09-10T12:00:00.000Z')
        });

        expect(result.delivered).toBe(true);
        expect(fetchImpl).toHaveBeenCalledTimes(1);

        const [url, request] = fetchImpl.mock.calls[0];
        const expectedSignature = `sha256=${crypto
            .createHmac('sha256', enabledConfig.secret)
            .update(request.body)
            .digest('hex')}`;

        expect(url).toBe(enabledConfig.url);
        expect(request.method).toBe('POST');
        expect(request.redirect).toBe('error');
        expect(request.headers['X-PwnDoc-Event']).toBe('audit.updated');
        expect(request.headers['X-PwnDoc-Delivery']).toBe('delivery-1');
        expect(request.headers['X-PwnDoc-Signature']).toBe(expectedSignature);
        expect(JSON.parse(request.body)).toEqual(result.event);
        expect(request.signal).toBeInstanceOf(AbortSignal);
    });

    it('skips disabled and non-subscribed events', async () => {
        const fetchImpl = jest.fn();

        const disabled = await dispatchWebhook('audit.updated', {}, {
            config: {...enabledConfig, enabled: false},
            fetchImpl: fetchImpl
        });
        const filtered = await dispatchWebhook('audit.state.changed', {}, {
            config: {...enabledConfig, events: new Set(['audit.updated'])},
            fetchImpl: fetchImpl
        });

        expect(disabled).toEqual({delivered: false, skipped: true});
        expect(filtered).toEqual({delivered: false, skipped: true});
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('reports non-successful HTTP responses', async () => {
        await expect(dispatchWebhook('audit.updated', {}, {
            config: enabledConfig,
            fetchImpl: jest.fn().mockResolvedValue({ok: false, status: 503})
        })).rejects.toThrow('Webhook endpoint returned HTTP 503');
    });

    it('aborts deliveries that exceed the configured timeout', async () => {
        const fetchImpl = jest.fn((url, request) => new Promise((resolve, reject) => {
            request.signal.addEventListener('abort', () => reject(new Error('request aborted')));
        }));

        await expect(dispatchWebhook('audit.updated', {}, {
            config: {...enabledConfig, timeoutMs: 5},
            fetchImpl: fetchImpl
        })).rejects.toThrow('request aborted');
    });

    it('exposes a reusable HMAC helper', () => {
        expect(signWebhookPayload('{"test":true}', 'secret'))
            .toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    describe('audit events', () => {
        it('reports changed fields without exposing their values', () => {
            const events = buildAuditUpdateEvents({
                auditId: 'audit-1',
                actorId: 'user-1',
                previousState: 'EDIT',
                update: {
                    name: 'Confidential audit name',
                    customFields: [{text: 'external-reference'}]
                }
            });

            expect(events).toEqual([{
                type: 'audit.updated',
                data: {
                    auditId: 'audit-1',
                    actorId: 'user-1',
                    changedFields: ['customFields', 'name']
                }
            }]);
            expect(JSON.stringify(events)).not.toContain('Confidential audit name');
            expect(JSON.stringify(events)).not.toContain('external-reference');
        });

        it('adds a specific event when the audit state changes', () => {
            const events = buildAuditUpdateEvents({
                auditId: 'audit-1',
                actorId: 'user-1',
                previousState: 'REVIEW',
                update: {approvals: ['user-1'], state: 'APPROVED'}
            });

            expect(events).toHaveLength(2);
            expect(events[1]).toEqual({
                type: 'audit.state.changed',
                data: {
                    auditId: 'audit-1',
                    actorId: 'user-1',
                    previousState: 'REVIEW',
                    state: 'APPROVED'
                }
            });
        });

        it('does not emit a state event when the state is unchanged', () => {
            const emitter = jest.fn();

            const events = emitAuditUpdateWebhooks({
                auditId: 'audit-1',
                actorId: 'user-1',
                previousState: 'REVIEW',
                update: {state: 'REVIEW'}
            }, emitter);

            expect(events).toHaveLength(1);
            expect(emitter).toHaveBeenCalledTimes(1);
            expect(emitter).toHaveBeenCalledWith('audit.updated', expect.any(Object));
        });
    });
});
