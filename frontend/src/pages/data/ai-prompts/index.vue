<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-card>
                <q-card-section class="bg-blue-grey-5 text-white">
                    <div class="text-h6">AI Prompts</div>
                </q-card-section>
                <q-card-section v-if="loading">
                    <q-spinner color="primary" size="2em" />
                </q-card-section>
                <template v-else>
                    <q-card-section>
                        <div class="text-grey-8">
                            Configure generation prompts used by AI for finding fields.
                            Placeholders supported: <code>{title}</code>, <code>{vulnType}</code>,
                            <code>{description}</code>, <code>{observation}</code>, <code>{remediation}</code>, <code>{references}</code>.
                        </div>
                        <div v-if="!canEdit" class="text-orange q-mt-sm">
                            Read-only: only admins can update prompts.
                        </div>
                    </q-card-section>

                    <q-separator />

                    <q-card-section>
                        <q-select
                        outlined
                        emit-value
                        map-options
                        options-sanitize
                        label="Default Provider"
                        class="col-md-4 col-12"
                        v-model="defaultProvider"
                        :options="providerOptions"
                        :readonly="!canEdit"
                        />
                    </q-card-section>

                    <q-card-section v-if="canEdit && defaultProvider === 'openai'">
                        <q-input
                        v-if="!hasOpenAIApiKey"
                        outlined
                        :type="showOpenAIApiKey ? 'text' : 'password'"
                        label="OpenAI API Key"
                        v-model="openaiApiKey"
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
                        <q-checkbox
                        v-if="canEdit && hasOpenAIApiKey"
                        class="q-mt-xs"
                        v-model="clearOpenAIApiKey"
                        label="Clear stored OpenAI API key"
                        />
                    </q-card-section>

                    <q-card-section v-if="canEdit && defaultProvider === 'anthropic'">
                        <q-input
                        v-if="!hasAnthropicApiKey"
                        outlined
                        :type="showAnthropicApiKey ? 'text' : 'password'"
                        label="Anthropic API Key"
                        v-model="anthropicApiKey"
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
                        <q-checkbox
                        v-if="canEdit && hasAnthropicApiKey"
                        class="q-mt-xs"
                        v-model="clearAnthropicApiKey"
                        label="Clear stored Anthropic API key"
                        />
                    </q-card-section>

                    <q-card-section v-if="canEdit && defaultProvider === 'deepseek'">
                        <q-input
                        v-if="!hasDeepseekApiKey"
                        outlined
                        :type="showDeepseekApiKey ? 'text' : 'password'"
                        label="DeepSeek API Key"
                        v-model="deepseekApiKey"
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
                        <q-checkbox
                        v-if="canEdit && hasDeepseekApiKey"
                        class="q-mt-xs"
                        v-model="clearDeepseekApiKey"
                        label="Clear stored DeepSeek API key"
                        />
                    </q-card-section>

                    <q-card-section v-if="canEdit && defaultProvider === 'ollama'" class="q-gutter-md">
                        <q-input
                        outlined
                        label="Ollama Base URL"
                        v-model="ollamaBaseUrl"
                        :readonly="!canEdit"
                        />
                        <q-input
                        outlined
                        label="Ollama Model"
                        v-model="ollamaModel"
                        :readonly="!canEdit"
                        />
                        <q-input
                        v-if="!hasOllamaApiKey"
                        outlined
                        :type="showOllamaApiKey ? 'text' : 'password'"
                        label="Ollama API Key"
                        v-model="ollamaApiKey"
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
                        <q-checkbox
                        v-if="canEdit && hasOllamaApiKey"
                        class="q-mt-xs"
                        v-model="clearOllamaApiKey"
                        label="Clear stored Ollama API key"
                        />
                    </q-card-section>

                    <q-card-section class="q-gutter-md">
                        <q-input
                        outlined
                        type="textarea"
                        autogrow
                        label="Description Prompt"
                        v-model="prompts.description"
                        :readonly="!canEdit"
                        />
                        <q-input
                        outlined
                        type="textarea"
                        autogrow
                        label="Observation Prompt"
                        v-model="prompts.observation"
                        :readonly="!canEdit"
                        />
                        <q-input
                        outlined
                        type="textarea"
                        autogrow
                        label="Remediation Prompt"
                        v-model="prompts.remediation"
                        :readonly="!canEdit"
                        />
                        <q-input
                        outlined
                        type="textarea"
                        autogrow
                        label="References Prompt"
                        v-model="prompts.references"
                        :readonly="!canEdit"
                        />
                    </q-card-section>

                    <q-card-actions align="right">
                        <q-btn
                        color="secondary"
                        unelevated
                        no-caps
                        label="Save Prompts"
                        :disable="!canEdit || !hasChanges"
                        :loading="saving"
                        @click="saveAiPrompts()"
                        />
                    </q-card-actions>
                </template>
            </q-card>
        </div>
    </div>
</template>

<script src="./ai-prompts.js"></script>
