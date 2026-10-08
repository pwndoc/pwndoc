const { emitWebhook } = require('./webhook');

function buildSectionUpdateEvent({auditId, actorId, sectionId, changedFields = []}) {
    return {
        type: 'section.updated',
        data: {
            auditId: String(auditId),
            sectionId: String(sectionId),
            actorId: String(actorId),
            changedFields: [...new Set(changedFields)].filter(Boolean).sort()
        }
    };
}

function emitSectionUpdateWebhook(context, emitter = emitWebhook) {
    const event = buildSectionUpdateEvent(context);
    emitter(event.type, event.data);
    return event;
}

module.exports = { buildSectionUpdateEvent, emitSectionUpdateWebhook };
