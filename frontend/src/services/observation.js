import { api } from 'src/boot/axios'

export default {
    // Get all observations for an audit
    getObservations: (auditId) => {
        return api.get(`/audits/${auditId}/observations`)
    },

    // Get single observation
    getObservation: (auditId, observationId) => {
        return api.get(`/audits/${auditId}/observations/${observationId}`)
    },

    // Create observation
    createObservation: (auditId, observation) => {
        return api.post(`/audits/${auditId}/observations`, observation)
    },

    // Update observation
    updateObservation: (auditId, observationId, observation) => {
        return api.put(`/audits/${auditId}/observations/${observationId}`, observation)
    },

    // Delete observation
    deleteObservation: (auditId, observationId) => {
        return api.delete(`/audits/${auditId}/observations/${observationId}`)
    }
}
