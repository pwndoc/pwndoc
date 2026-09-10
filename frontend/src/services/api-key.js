import { api } from 'boot/axios';

export default {
    getApiKeys: function(all = false) {
        return api.get('apikeys' + (all ? '?all=true' : ''));
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
