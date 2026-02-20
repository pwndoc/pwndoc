import { Notify } from 'quasar'
import DataService from '@/services/data'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const defaultPrompts = () => ({
    description: '',
    observation: '',
    remediation: '',
    references: ''
})

export default {
    data: () => {
        return {
            loading: true,
            saving: false,
            canEdit: userStore.isAllowed('settings:update'),
            defaultProvider: 'mock',
            openaiApiKey: '',
            showOpenAIApiKey: false,
            hasOpenAIApiKey: false,
            clearOpenAIApiKey: false,
            anthropicApiKey: '',
            showAnthropicApiKey: false,
            hasAnthropicApiKey: false,
            clearAnthropicApiKey: false,
            deepseekApiKey: '',
            showDeepseekApiKey: false,
            hasDeepseekApiKey: false,
            clearDeepseekApiKey: false,
            ollamaApiKey: '',
            showOllamaApiKey: false,
            hasOllamaApiKey: false,
            clearOllamaApiKey: false,
            ollamaBaseUrl: 'http://localhost:11434/v1',
            ollamaModel: 'llama3.1',
            providerOptions: [
                {label: 'Mock (Built-in)', value: 'mock'},
                {label: 'OpenAI', value: 'openai'},
                {label: 'Anthropic', value: 'anthropic'},
                {label: 'DeepSeek', value: 'deepseek'},
                {label: 'Ollama', value: 'ollama'}
            ],
            prompts: defaultPrompts(),
            promptsOrig: {
                defaultProvider: 'mock',
                prompts: defaultPrompts(),
                ollamaBaseUrl: 'http://localhost:11434/v1',
                ollamaModel: 'llama3.1'
            }
        }
    },

    mounted: function() {
        this.getAiPrompts()
    },

    computed: {
        hasChanges: function() {
            return JSON.stringify({
                defaultProvider: this.defaultProvider,
                prompts: this.prompts,
                ollamaBaseUrl: this.ollamaBaseUrl,
                ollamaModel: this.ollamaModel
            }) !== JSON.stringify({
                defaultProvider: this.promptsOrig.defaultProvider || 'mock',
                prompts: this.promptsOrig.prompts || defaultPrompts(),
                ollamaBaseUrl: this.promptsOrig.ollamaBaseUrl || 'http://localhost:11434/v1',
                ollamaModel: this.promptsOrig.ollamaModel || 'llama3.1'
            }) ||
            Boolean(this.openaiApiKey.trim()) || this.clearOpenAIApiKey ||
            Boolean(this.anthropicApiKey.trim()) || this.clearAnthropicApiKey ||
            Boolean(this.deepseekApiKey.trim()) || this.clearDeepseekApiKey ||
            Boolean(this.ollamaApiKey.trim()) || this.clearOllamaApiKey
        }
    },

    methods: {
        getAiPrompts: function() {
            this.loading = true
            DataService.getAiPrompts()
            .then((data) => {
                this.prompts = {...defaultPrompts(), ...(data.data.datas.prompts || {})}
                this.defaultProvider = data.data.datas.defaultProvider || 'mock'
                this.hasOpenAIApiKey = !!data.data.datas.hasOpenAIApiKey
                this.clearOpenAIApiKey = false
                this.openaiApiKey = ''
                this.hasAnthropicApiKey = !!data.data.datas.hasAnthropicApiKey
                this.clearAnthropicApiKey = false
                this.anthropicApiKey = ''
                this.hasDeepseekApiKey = !!data.data.datas.hasDeepseekApiKey
                this.clearDeepseekApiKey = false
                this.deepseekApiKey = ''
                this.hasOllamaApiKey = !!data.data.datas.hasOllamaApiKey
                this.clearOllamaApiKey = false
                this.ollamaApiKey = ''
                this.ollamaBaseUrl = data.data.datas.ollamaBaseUrl || 'http://localhost:11434/v1'
                this.ollamaModel = data.data.datas.ollamaModel || 'llama3.1'
                this.promptsOrig = {
                    defaultProvider: this.defaultProvider,
                    prompts: {...this.prompts},
                    ollamaBaseUrl: this.ollamaBaseUrl,
                    ollamaModel: this.ollamaModel
                }
            })
            .catch((err) => {
                Notify.create({
                    message: err.response?.data?.datas || 'Failed to load AI prompts',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
            .finally(() => {
                this.loading = false
            })
        },

        saveAiPrompts: function() {
            if (!this.canEdit || this.saving)
                return

            this.saving = true
            const payload = {
                defaultProvider: this.defaultProvider,
                prompts: this.prompts,
                ollamaBaseUrl: this.ollamaBaseUrl,
                ollamaModel: this.ollamaModel
            }
            if (this.clearOpenAIApiKey)
                payload.openaiApiKey = ''
            else if (this.openaiApiKey.trim())
                payload.openaiApiKey = this.openaiApiKey.trim()
            if (this.clearAnthropicApiKey)
                payload.anthropicApiKey = ''
            else if (this.anthropicApiKey.trim())
                payload.anthropicApiKey = this.anthropicApiKey.trim()
            if (this.clearDeepseekApiKey)
                payload.deepseekApiKey = ''
            else if (this.deepseekApiKey.trim())
                payload.deepseekApiKey = this.deepseekApiKey.trim()
            if (this.clearOllamaApiKey)
                payload.ollamaApiKey = ''
            else if (this.ollamaApiKey.trim())
                payload.ollamaApiKey = this.ollamaApiKey.trim()

            DataService.updateAiPrompts(payload)
            .then((data) => {
                this.prompts = {...defaultPrompts(), ...(data.data.datas.prompts || {})}
                this.defaultProvider = data.data.datas.defaultProvider || 'mock'
                this.hasOpenAIApiKey = !!data.data.datas.hasOpenAIApiKey
                this.clearOpenAIApiKey = false
                this.openaiApiKey = ''
                this.hasAnthropicApiKey = !!data.data.datas.hasAnthropicApiKey
                this.clearAnthropicApiKey = false
                this.anthropicApiKey = ''
                this.hasDeepseekApiKey = !!data.data.datas.hasDeepseekApiKey
                this.clearDeepseekApiKey = false
                this.deepseekApiKey = ''
                this.hasOllamaApiKey = !!data.data.datas.hasOllamaApiKey
                this.clearOllamaApiKey = false
                this.ollamaApiKey = ''
                this.ollamaBaseUrl = data.data.datas.ollamaBaseUrl || 'http://localhost:11434/v1'
                this.ollamaModel = data.data.datas.ollamaModel || 'llama3.1'
                this.promptsOrig = {
                    defaultProvider: this.defaultProvider,
                    prompts: {...this.prompts},
                    ollamaBaseUrl: this.ollamaBaseUrl,
                    ollamaModel: this.ollamaModel
                }
                Notify.create({
                    message: 'AI prompts updated successfully',
                    color: 'positive',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response?.data?.datas || 'Failed to update AI prompts',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
            .finally(() => {
                this.saving = false
            })
        }
    }
}
