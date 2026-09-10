const crypto = require('crypto');
const { getWebhookConfig } = require('./webhook-config');

const WEBHOOK_VERSION = 1;

function createWebhookEvent(type, data, options = {}) {
    if (!type || typeof type !== 'string') {
        throw new Error('Webhook event type is required');
    }

    const now = options.now || (() => new Date());
    const idGenerator = options.idGenerator || crypto.randomUUID;

    return {
        version: WEBHOOK_VERSION,
        id: idGenerator(),
        type: type,
        createdAt: now().toISOString(),
        data: data
    };
}

function signWebhookPayload(payload, secret) {
    return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

async function deliverWebhook(event, options = {}) {
    const config = options.config || getWebhookConfig();
    const fetchImpl = options.fetchImpl || global.fetch;

    if (typeof fetchImpl !== 'function') {
        throw new Error('The current Node.js runtime does not provide fetch');
    }

    const payload = JSON.stringify(event);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
        const response = await fetchImpl(config.url, {
            method: 'POST',
            redirect: 'error',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PwnDoc-Webhooks/1.0',
                'X-PwnDoc-Event': event.type,
                'X-PwnDoc-Delivery': event.id,
                'X-PwnDoc-Signature': signWebhookPayload(payload, config.secret)
            },
            body: payload
        });

        if (!response.ok) {
            throw new Error(`Webhook endpoint returned HTTP ${response.status}`);
        }

        return { delivered: true, event: event };
    } finally {
        clearTimeout(timeout);
    }
}

async function dispatchWebhook(type, data, options = {}) {
    const config = options.config || getWebhookConfig();
    if (!config.enabled || (!config.events.has('*') && !config.events.has(type))) {
        return { delivered: false, skipped: true };
    }

    const event = createWebhookEvent(type, data, options);
    return deliverWebhook(event, {...options, config: config});
}

function emitWebhook(type, data) {
    return dispatchWebhook(type, data).catch(err => {
        console.warn(`[webhook] ${type} delivery failed: ${err.message}`);
        return { delivered: false, error: err.message };
    });
}

module.exports = {
    WEBHOOK_VERSION,
    createWebhookEvent,
    deliverWebhook,
    dispatchWebhook,
    emitWebhook,
    signWebhookPayload
};
