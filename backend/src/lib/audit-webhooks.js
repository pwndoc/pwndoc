const { emitWebhook } = require('./webhook');

function buildAuditUpdateEvents({auditId, actorId, previousState, update}) {
    const changedFields = Object.keys(update).sort();
    if (!changedFields.length) return [];

    const events = [{
        type: 'audit.updated',
        data: {
            auditId: auditId,
            actorId: actorId,
            changedFields: changedFields
        }
    }];

    if (update.state && update.state !== previousState) {
        events.push({
            type: 'audit.state.changed',
            data: {
                auditId: auditId,
                actorId: actorId,
                previousState: previousState,
                state: update.state
            }
        });
    }

    return events;
}

function emitAuditUpdateWebhooks(context, emitter = emitWebhook) {
    const events = buildAuditUpdateEvents(context);
    events.forEach(event => emitter(event.type, event.data));
    return events;
}

module.exports = {
    buildAuditUpdateEvents,
    emitAuditUpdateWebhooks
};
