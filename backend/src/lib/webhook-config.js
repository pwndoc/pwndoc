const DEFAULT_EVENTS = ['audit.updated', 'audit.state.changed'];
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 60000;

function parseEvents(value) {
    const events = (value || DEFAULT_EVENTS.join(','))
        .split(',')
        .map(event => event.trim())
        .filter(Boolean);

    return new Set(events);
}

function parseTimeout(value) {
    if (value === undefined || value === '') return DEFAULT_TIMEOUT_MS;

    const timeoutMs = Number(value);
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT_MS) {
        throw new Error(`PWNDOC_WEBHOOK_TIMEOUT_MS must be between 1 and ${MAX_TIMEOUT_MS}`);
    }

    return timeoutMs;
}

function getWebhookConfig(environment = process.env) {
    const rawUrl = (environment.PWNDOC_WEBHOOK_URL || '').trim();
    if (!rawUrl) {
        return {
            enabled: false,
            events: parseEvents(environment.PWNDOC_WEBHOOK_EVENTS),
            timeoutMs: parseTimeout(environment.PWNDOC_WEBHOOK_TIMEOUT_MS)
        };
    }

    let url;
    try {
        url = new URL(rawUrl);
    } catch (err) {
        throw new Error('PWNDOC_WEBHOOK_URL must be a valid URL');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('PWNDOC_WEBHOOK_URL must use HTTP or HTTPS');
    }
    if (url.username || url.password) {
        throw new Error('PWNDOC_WEBHOOK_URL must not contain credentials');
    }

    const secret = environment.PWNDOC_WEBHOOK_SECRET || '';
    if (!secret) {
        throw new Error('PWNDOC_WEBHOOK_SECRET is required when PWNDOC_WEBHOOK_URL is configured');
    }

    return {
        enabled: true,
        url: url.toString(),
        secret: secret,
        events: parseEvents(environment.PWNDOC_WEBHOOK_EVENTS),
        timeoutMs: parseTimeout(environment.PWNDOC_WEBHOOK_TIMEOUT_MS)
    };
}

module.exports = {
    DEFAULT_EVENTS,
    DEFAULT_TIMEOUT_MS,
    getWebhookConfig,
    parseEvents,
    parseTimeout
};
