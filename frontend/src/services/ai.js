import { api } from 'boot/axios'

export default {
  generateFieldDraft: function(params) {
    return api.post('ai/generate', params)
  },
}
