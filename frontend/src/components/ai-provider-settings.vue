<template>
<div>
    <q-select
    outlined
    emit-value
    map-options
    options-sanitize
    label="Default Provider"
    class="col-md-4 col-12"
    v-model="settings.ai.public.defaultProvider"
    :options="providerOptions"
    :readonly="!canEdit"
    />

    <q-card-section v-if="canEdit && settings.ai.public.defaultProvider === 'openai'" class="q-gutter-md q-px-none">
        <q-input
        outlined
        label="OpenAI Base URL"
        v-model="settings.ai.private.openaiBaseUrl"
        :readonly="!canEdit"
        />
        <q-input
        outlined
        label="OpenAI Model"
        v-model="settings.ai.private.openaiModel"
        :readonly="!canEdit"
        />
        <q-input
        outlined
        :type="showOpenAIApiKey ? 'text' : 'password'"
        label="OpenAI API Key"
        v-model="openaiApiKeyInput"
        :readonly="!canEdit"
        >
            <template v-slot:append>
                <q-icon
                :name="showOpenAIApiKey ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showOpenAIApiKey = !showOpenAIApiKey"
                />
            </template>
        </q-input>
    </q-card-section>

    <q-card-section v-if="canEdit && settings.ai.public.defaultProvider === 'anthropic'" class="q-gutter-md q-px-none">
        <q-input outlined label="Anthropic Base URL" v-model="settings.ai.private.anthropicBaseUrl" :readonly="!canEdit" />
        <q-input outlined label="Anthropic Model" v-model="settings.ai.private.anthropicModel" :readonly="!canEdit" />
        <q-input outlined label="Anthropic Version" v-model="settings.ai.private.anthropicVersion" :readonly="!canEdit" />
        <q-input
        outlined
        :type="showAnthropicApiKey ? 'text' : 'password'"
        label="Anthropic API Key"
        v-model="anthropicApiKeyInput"
        :readonly="!canEdit"
        >
            <template v-slot:append>
                <q-icon
                :name="showAnthropicApiKey ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showAnthropicApiKey = !showAnthropicApiKey"
                />
            </template>
        </q-input>
    </q-card-section>

    <q-card-section v-if="canEdit && settings.ai.public.defaultProvider === 'deepseek'" class="q-gutter-md q-px-none">
        <q-input outlined label="DeepSeek Base URL" v-model="settings.ai.private.deepseekBaseUrl" :readonly="!canEdit" />
        <q-input outlined label="DeepSeek Model" v-model="settings.ai.private.deepseekModel" :readonly="!canEdit" />
        <q-input
        outlined
        :type="showDeepseekApiKey ? 'text' : 'password'"
        label="DeepSeek API Key"
        v-model="deepseekApiKeyInput"
        :readonly="!canEdit"
        >
            <template v-slot:append>
                <q-icon
                :name="showDeepseekApiKey ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showDeepseekApiKey = !showDeepseekApiKey"
                />
            </template>
        </q-input>
    </q-card-section>

    <q-card-section v-if="canEdit && settings.ai.public.defaultProvider === 'ollama'" class="q-gutter-md q-px-none">
        <q-input outlined label="Ollama Base URL" v-model="settings.ai.private.ollamaBaseUrl" :readonly="!canEdit" />
        <q-input outlined label="Ollama Model" v-model="settings.ai.private.ollamaModel" :readonly="!canEdit" />
        <q-input
        outlined
        :type="showOllamaApiKey ? 'text' : 'password'"
        label="Ollama API Key"
        v-model="ollamaApiKeyInput"
        :readonly="!canEdit"
        >
            <template v-slot:append>
                <q-icon
                :name="showOllamaApiKey ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showOllamaApiKey = !showOllamaApiKey"
                />
            </template>
        </q-input>
    </q-card-section>

    <q-card-section v-if="canEdit && settings.ai.public.defaultProvider === 'bedrock'" class="q-gutter-md q-px-none">
        <q-input outlined label="AWS Region" v-model="settings.ai.private.bedrockRegion" :readonly="!canEdit" />
        <q-input outlined label="Bedrock Model ID" v-model="settings.ai.private.bedrockModel" :readonly="!canEdit" />
        <div v-if="!hasBedrockApiKey && !hasBedrockIamCredentials" class="text-caption text-grey-7">
            Configure either a Bedrock API key or IAM credentials.
        </div>
        <q-input
        outlined
        :type="showBedrockApiKey ? 'text' : 'password'"
        label="Bedrock API Key"
        v-model="bedrockApiKeyInput"
        :readonly="!canEdit"
        >
            <template v-slot:append>
                <q-icon
                :name="showBedrockApiKey ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showBedrockApiKey = !showBedrockApiKey"
                />
            </template>
        </q-input>
        <q-input
        outlined
        :type="showBedrockAccessKeyId ? 'text' : 'password'"
        label="AWS Access Key ID"
        v-model="bedrockAccessKeyIdInput"
        :readonly="!canEdit"
        >
            <template v-slot:append>
                <q-icon
                :name="showBedrockAccessKeyId ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showBedrockAccessKeyId = !showBedrockAccessKeyId"
                />
            </template>
        </q-input>
        <q-input
        outlined
        :type="showBedrockSecretAccessKey ? 'text' : 'password'"
        label="AWS Secret Access Key"
        v-model="bedrockSecretAccessKeyInput"
        :readonly="!canEdit"
        >
            <template v-slot:append>
                <q-icon
                :name="showBedrockSecretAccessKey ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showBedrockSecretAccessKey = !showBedrockSecretAccessKey"
                />
            </template>
        </q-input>
        <q-input
        outlined
        :type="showBedrockSessionToken ? 'text' : 'password'"
        label="AWS Session Token (optional)"
        v-model="bedrockSessionTokenInput"
        :readonly="!canEdit"
        >
            <template v-slot:append>
                <q-icon
                :name="showBedrockSessionToken ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showBedrockSessionToken = !showBedrockSessionToken"
                />
            </template>
        </q-input>
    </q-card-section>
</div>
</template>

<script>
const MASKED_SECRET = '••••••••••••••••'

export default {
    name: 'AiProviderSettings',

    props: {
        settings: {
            type: Object,
            required: true
        },
        canEdit: {
            type: Boolean,
            default: false
        }
    },

    data() {
        return {
            providerOptions: [
                {label: 'OpenAI', value: 'openai'},
                {label: 'Anthropic', value: 'anthropic'},
                {label: 'DeepSeek', value: 'deepseek'},
                {label: 'Ollama', value: 'ollama'},
                {label: 'AWS Bedrock', value: 'bedrock'}
            ],
            openaiApiKeyInput: '',
            showOpenAIApiKey: false,
            anthropicApiKeyInput: '',
            showAnthropicApiKey: false,
            deepseekApiKeyInput: '',
            showDeepseekApiKey: false,
            ollamaApiKeyInput: '',
            showOllamaApiKey: false,
            bedrockApiKeyInput: '',
            showBedrockApiKey: false,
            bedrockAccessKeyIdInput: '',
            showBedrockAccessKeyId: false,
            bedrockSecretAccessKeyInput: '',
            showBedrockSecretAccessKey: false,
            bedrockSessionTokenInput: '',
            showBedrockSessionToken: false
        }
    },

    computed: {
        hasOpenAIApiKey() {
            return this.hasStoredSecret('openaiApiKey')
        },
        hasAnthropicApiKey() {
            return this.hasStoredSecret('anthropicApiKey')
        },
        hasDeepseekApiKey() {
            return this.hasStoredSecret('deepseekApiKey')
        },
        hasOllamaApiKey() {
            return this.hasStoredSecret('ollamaApiKey')
        },
        hasBedrockApiKey() {
            return this.hasStoredSecret('bedrockApiKey')
        },
        hasBedrockIamCredentials() {
            return this.hasStoredSecret('bedrockAccessKeyId') &&
                this.hasStoredSecret('bedrockSecretAccessKey')
        },
        hasBedrockSessionToken() {
            return this.hasStoredSecret('bedrockSessionToken')
        }
    },

    mounted() {
        this.initializeSecretFields()
    },

    methods: {
        hasStoredSecret(field) {
            return Boolean(this.settings?.ai?.private?.[`${field}Configured`])
        },

        maskedValue(stored) {
            return stored ? MASKED_SECRET : ''
        },

        initializeSecretFields() {
            this.openaiApiKeyInput = this.maskedValue(this.hasOpenAIApiKey)
            this.anthropicApiKeyInput = this.maskedValue(this.hasAnthropicApiKey)
            this.deepseekApiKeyInput = this.maskedValue(this.hasDeepseekApiKey)
            this.ollamaApiKeyInput = this.maskedValue(this.hasOllamaApiKey)
            this.bedrockApiKeyInput = this.maskedValue(this.hasBedrockApiKey)
            this.bedrockAccessKeyIdInput = this.maskedValue(this.hasStoredSecret('bedrockAccessKeyId'))
            this.bedrockSecretAccessKeyInput = this.maskedValue(this.hasStoredSecret('bedrockSecretAccessKey'))
            this.bedrockSessionTokenInput = this.maskedValue(this.hasBedrockSessionToken)
        },

        applyPendingKeyUpdates() {
            this.applyKeyUpdate('openaiApiKey', this.openaiApiKeyInput, this.hasOpenAIApiKey)
            this.applyKeyUpdate('anthropicApiKey', this.anthropicApiKeyInput, this.hasAnthropicApiKey)
            this.applyKeyUpdate('deepseekApiKey', this.deepseekApiKeyInput, this.hasDeepseekApiKey)
            this.applyKeyUpdate('ollamaApiKey', this.ollamaApiKeyInput, this.hasOllamaApiKey)
            this.applyKeyUpdate('bedrockApiKey', this.bedrockApiKeyInput, this.hasBedrockApiKey)
            this.applyKeyUpdate(
                'bedrockAccessKeyId',
                this.bedrockAccessKeyIdInput,
                this.hasStoredSecret('bedrockAccessKeyId')
            )
            this.applyKeyUpdate(
                'bedrockSecretAccessKey',
                this.bedrockSecretAccessKeyInput,
                this.hasStoredSecret('bedrockSecretAccessKey')
            )
            this.applyKeyUpdate(
                'bedrockSessionToken',
                this.bedrockSessionTokenInput,
                this.hasBedrockSessionToken
            )
        },

        applyKeyUpdate(field, inputValue, stored) {
            const value = String(inputValue || '')

            if (!stored) {
                if (value.trim())
                    this.settings.ai.private[field] = value.trim()
                return
            }

            if (value === MASKED_SECRET)
                return

            this.settings.ai.private[field] = value.trim()
        },

        resetKeyInputs() {
            this.initializeSecretFields()
        }
    }
}
</script>
