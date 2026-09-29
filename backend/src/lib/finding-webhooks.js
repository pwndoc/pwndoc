const { emitWebhook } = require('./webhook');

function buildFindingUpdateEvent({auditId, actorId, findingId, changedFields = []}) {
    return {
        type: 'finding.updated',
        data: {
            auditId: String(auditId),
            findingId: String(findingId),
            actorId: String(actorId),
            changedFields: [...new Set(changedFields)]
                .filter(Boolean)
                .sort()
        }
    };
}

function emitFindingUpdateWebhook(context, emitter = emitWebhook) {
    const event = buildFindingUpdateEvent(context);
    emitter(event.type, event.data);
    return event;
}

module.exports = {
    buildFindingUpdateEvent,
    emitFindingUpdateWebhook
};
