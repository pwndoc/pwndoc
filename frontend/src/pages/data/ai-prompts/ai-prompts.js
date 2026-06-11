import { Notify } from 'quasar'
import DataService from '@/services/data'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const defaults = {
    defaultProvider: 'openai',
    openaiBaseUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-4.1-mini',
    anthropicBaseUrl: 'https://api.anthropic.com/v1',
    anthropicModel: 'claude-3-5-sonnet-latest',
    anthropicVersion: '2023-06-01',
    deepseekBaseUrl: 'https://api.deepseek.com/v1',
    deepseekModel: 'deepseek-chat',
    ollamaBaseUrl: 'http://localhost:11434/v1',
    ollamaModel: 'llama3.1'
}

const serializePromptMappings = (mappings = []) => {
    return mappings
    .map((mapping) => ({
        entityType: String(mapping.entityType || ''),
        fieldKey: String(mapping.fieldKey || ''),
        enabled: mapping.enabled !== false,
        prompt: String(mapping.prompt || '')
    }))
    .sort((a, b) => `${a.entityType}:${a.fieldKey}`.localeCompare(`${b.entityType}:${b.fieldKey}`))
}

export default {
    data: () => {
        return {
            loading: true,
            saving: false,
            canEdit: userStore.isAllowed('settings:update'),
            aiEnabled: true,
            defaultProvider: defaults.defaultProvider,
            openaiApiKey: '',
            showOpenAIApiKey: false,
            hasOpenAIApiKey: false,
            clearOpenAIApiKey: false,
            openaiBaseUrl: defaults.openaiBaseUrl,
            openaiModel: defaults.openaiModel,
            anthropicApiKey: '',
            showAnthropicApiKey: false,
            hasAnthropicApiKey: false,
            clearAnthropicApiKey: false,
            anthropicBaseUrl: defaults.anthropicBaseUrl,
            anthropicModel: defaults.anthropicModel,
            anthropicVersion: defaults.anthropicVersion,
            deepseekApiKey: '',
            showDeepseekApiKey: false,
            hasDeepseekApiKey: false,
            clearDeepseekApiKey: false,
            deepseekBaseUrl: defaults.deepseekBaseUrl,
            deepseekModel: defaults.deepseekModel,
            ollamaApiKey: '',
            showOllamaApiKey: false,
            hasOllamaApiKey: false,
            clearOllamaApiKey: false,
            ollamaBaseUrl: defaults.ollamaBaseUrl,
            ollamaModel: defaults.ollamaModel,
            providerOptions: [
                {label: 'OpenAI', value: 'openai'},
                {label: 'Anthropic', value: 'anthropic'},
                {label: 'DeepSeek', value: 'deepseek'},
                {label: 'Ollama', value: 'ollama'}
            ],
            promptMappings: [],
            promptsOrig: {
                defaultProvider: defaults.defaultProvider,
                promptMappings: [],
                openaiBaseUrl: defaults.openaiBaseUrl,
                openaiModel: defaults.openaiModel,
                anthropicBaseUrl: defaults.anthropicBaseUrl,
                anthropicModel: defaults.anthropicModel,
                anthropicVersion: defaults.anthropicVersion,
                deepseekBaseUrl: defaults.deepseekBaseUrl,
                deepseekModel: defaults.deepseekModel,
                ollamaBaseUrl: defaults.ollamaBaseUrl,
                ollamaModel: defaults.ollamaModel
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
                promptMappings: serializePromptMappings(this.promptMappings),
                openaiBaseUrl: this.openaiBaseUrl,
                openaiModel: this.openaiModel,
                anthropicBaseUrl: this.anthropicBaseUrl,
                anthropicModel: this.anthropicModel,
                anthropicVersion: this.anthropicVersion,
                deepseekBaseUrl: this.deepseekBaseUrl,
                deepseekModel: this.deepseekModel,
                ollamaBaseUrl: this.ollamaBaseUrl,
                ollamaModel: this.ollamaModel
            }) !== JSON.stringify({
                defaultProvider: this.promptsOrig.defaultProvider,
                promptMappings: this.promptsOrig.promptMappings,
                openaiBaseUrl: this.promptsOrig.openaiBaseUrl,
                openaiModel: this.promptsOrig.openaiModel,
                anthropicBaseUrl: this.promptsOrig.anthropicBaseUrl,
                anthropicModel: this.promptsOrig.anthropicModel,
                anthropicVersion: this.promptsOrig.anthropicVersion,
                deepseekBaseUrl: this.promptsOrig.deepseekBaseUrl,
                deepseekModel: this.promptsOrig.deepseekModel,
                ollamaBaseUrl: this.promptsOrig.ollamaBaseUrl,
                ollamaModel: this.promptsOrig.ollamaModel
            }) ||
            Boolean(this.openaiApiKey.trim()) || this.clearOpenAIApiKey ||
            Boolean(this.anthropicApiKey.trim()) || this.clearAnthropicApiKey ||
            Boolean(this.deepseekApiKey.trim()) || this.clearDeepseekApiKey ||
            Boolean(this.ollamaApiKey.trim()) || this.clearOllamaApiKey
        }
    },

    methods: {
        applyPayload: function(payload) {
            this.aiEnabled = payload.aiEnabled !== false
            this.defaultProvider = payload.defaultProvider || defaults.defaultProvider
            this.promptMappings = (payload.promptMappings || []).map((mapping) => ({
                ...mapping,
                entityType: String(mapping.entityType || ''),
                enabled: mapping.enabled !== false,
                prompt: String(mapping.prompt || '')
            }))

            this.hasOpenAIApiKey = !!payload.hasOpenAIApiKey
            this.clearOpenAIApiKey = false
            this.openaiApiKey = ''
            this.openaiBaseUrl = payload.openaiBaseUrl || defaults.openaiBaseUrl
            this.openaiModel = payload.openaiModel || defaults.openaiModel

            this.hasAnthropicApiKey = !!payload.hasAnthropicApiKey
            this.clearAnthropicApiKey = false
            this.anthropicApiKey = ''
            this.anthropicBaseUrl = payload.anthropicBaseUrl || defaults.anthropicBaseUrl
            this.anthropicModel = payload.anthropicModel || defaults.anthropicModel
            this.anthropicVersion = payload.anthropicVersion || defaults.anthropicVersion

            this.hasDeepseekApiKey = !!payload.hasDeepseekApiKey
            this.clearDeepseekApiKey = false
            this.deepseekApiKey = ''
            this.deepseekBaseUrl = payload.deepseekBaseUrl || defaults.deepseekBaseUrl
            this.deepseekModel = payload.deepseekModel || defaults.deepseekModel

            this.hasOllamaApiKey = !!payload.hasOllamaApiKey
            this.clearOllamaApiKey = false
            this.ollamaApiKey = ''
            this.ollamaBaseUrl = payload.ollamaBaseUrl || defaults.ollamaBaseUrl
            this.ollamaModel = payload.ollamaModel || defaults.ollamaModel

            this.promptsOrig = {
                defaultProvider: this.defaultProvider,
                promptMappings: serializePromptMappings(this.promptMappings),
                openaiBaseUrl: this.openaiBaseUrl,
                openaiModel: this.openaiModel,
                anthropicBaseUrl: this.anthropicBaseUrl,
                anthropicModel: this.anthropicModel,
                anthropicVersion: this.anthropicVersion,
                deepseekBaseUrl: this.deepseekBaseUrl,
                deepseekModel: this.deepseekModel,
                ollamaBaseUrl: this.ollamaBaseUrl,
                ollamaModel: this.ollamaModel
            }
        },

        getAiPrompts: function() {
            this.loading = true
            DataService.getAiPrompts()
            .then((data) => {
                this.applyPayload(data.data.datas || {})
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
                promptMappings: this.promptMappings.map((mapping) => ({
                    entityType: mapping.entityType,
                    fieldKey: mapping.fieldKey,
                    enabled: mapping.enabled !== false,
                    prompt: mapping.prompt
                })),
                openaiBaseUrl: this.openaiBaseUrl,
                openaiModel: this.openaiModel,
                anthropicBaseUrl: this.anthropicBaseUrl,
                anthropicModel: this.anthropicModel,
                anthropicVersion: this.anthropicVersion,
                deepseekBaseUrl: this.deepseekBaseUrl,
                deepseekModel: this.deepseekModel,
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
                this.applyPayload(data.data.datas || {})
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
