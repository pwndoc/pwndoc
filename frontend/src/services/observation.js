import { http } from 'src/boot/axios'

export default {
    // Get all observations for an audit
    getObservations: (auditId) => {
        return http.get(`/audits/${auditId}/observations`)
    },

    // Get single observation
    getObservation: (auditId, observationId) => {
        return http.get(`/audits/${auditId}/observations/${observationId}`)
    },

    // Create observation
    createObservation: (auditId, observation) => {
        return http.post(`/audits/${auditId}/observations`, observation)
    },

    // Update observation
    updateObservation: (auditId, observationId, observation) => {
        return http.put(`/audits/${auditId}/observations/${observationId}`, observation)
    },

    // Delete observation
    deleteObservation: (auditId, observationId) => {
        return http.delete(`/audits/${auditId}/observations/${observationId}`)
    }
}
