import { api } from 'boot/axios';

export default {
    getApiKeys: function() {
        return api.get('apikeys');
    },

    getAll: function() {
        return api.get('apikeys/all');
    },

    createApiKey: function(data) {
        return api.post('apikeys', data);
    },

    deleteApiKey: function(id) {
        return api.delete(`apikeys/${id}`);
    },

    toggleApiKey: function(id) {
        return api.put(`apikeys/${id}/toggle`);
    }
};
