<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-card>
                <q-card-section class="bg-blue-grey-5 text-white">
                    <div class="text-h6">AI Integration</div>
                </q-card-section>

                <q-card-section v-if="loading">
                    <q-spinner color="primary" size="2em" />
                </q-card-section>

                <template v-else-if="!aiEnabled">
                    <q-card-section>
                        <q-banner dense class="bg-orange-1 text-orange-10">
                            AI integration is disabled in organization settings. Enable it from <b>Settings</b> to manage prompts and redaction guidelines.
                        </q-banner>
                    </q-card-section>
                </template>

                <template v-else>
                    <q-card-section v-if="visibleTabs.length === 0">
                        <q-banner dense class="bg-orange-1 text-orange-10">
                            You do not have permission to view AI integration settings.
                        </q-banner>
                    </q-card-section>

                    <q-tabs
                    v-if="visibleTabs.length > 0"
                    v-model="selectedTab"
                    dense
                    class="text-grey-8"
                    active-color="primary"
                    indicator-color="primary"
                    align="left"
                    >
                        <q-tab v-if="canReadPrompts" name="prompts" label="Prompts" />
                        <q-tab v-if="canReadGuidelines" name="guidelines" label="Redaction guidelines" />
                        <q-tab v-if="canReadQa" name="qa" label="QA" />
                    </q-tabs>

                    <q-separator v-if="visibleTabs.length > 0" />

                    <q-tab-panels v-if="visibleTabs.length > 0" v-model="selectedTab" animated>
                        <q-tab-panel v-if="canReadPrompts" name="prompts" class="q-pa-none">
                            <q-card-section>
                                <div class="text-grey-8">
                                    Configure generation prompts mapped to report fields.
                                    Provider and model settings are managed in <b>Settings</b>.
                                    Placeholders supported: <code>{title}</code>, <code>{vulnType}</code>,
                                    <code>{description}</code>, <code>{observation}</code>, <code>{remediation}</code>,
                                    <code>{references}</code>, <code>{poc}</code>, <code>{customFieldLabel}</code>, <code>{customFieldValue}</code>.
                                </div>
                                <div v-if="!canEditPrompts" class="text-orange q-mt-sm">
                                    Read-only: you do not have permission to update prompts.
                                </div>
                            </q-card-section>

                            <q-separator />

                            <q-card-section class="q-gutter-md">
                                <q-card
                                v-for="mapping in promptMappings"
                                :key="`${mapping.entityType}:${mapping.fieldKey}`"
                                bordered
                                flat
                                class="q-pa-md"
                                >
                                    <div class="row items-center q-col-gutter-md q-mb-sm">
                                        <div class="col">
                                            <div class="text-subtitle2">{{ mapping.fieldLabel }}</div>
                                            <div class="text-caption text-grey-7">
                                                Entity: {{ mapping.entityType }} | Field key: {{ mapping.fieldKey }} | Output: {{ mapping.outputType }}
                                            </div>
                                        </div>
                                        <div class="col-auto">
                                            <q-toggle
                                            v-model="mapping.enabled"
                                            label="Enable AI"
                                            :disable="!canEditPrompts"
                                            />
                                        </div>
                                    </div>
                                    <q-input
                                    outlined
                                    type="textarea"
                                    autogrow
                                    :label="`${mapping.fieldLabel} Prompt`"
                                    v-model="mapping.prompt"
                                    :readonly="!canEditPrompts"
                                    :disable="!mapping.enabled"
                                    />
                                </q-card>
                            </q-card-section>

                            <q-card-actions align="right">
                                <q-btn
                                color="secondary"
                                unelevated
                                no-caps
                                label="Save Prompts"
                                :disable="!canEditPrompts || !hasPromptChanges"
                                :loading="savingPrompts"
                                @click="savePrompts()"
                                />
                            </q-card-actions>
                        </q-tab-panel>

                        <q-tab-panel v-if="canReadGuidelines" name="guidelines" class="q-pa-none">
                            <q-card-section>
                                <div class="text-grey-8">
                                    Organization-wide redaction and writing rules provided to every AI request as additional context.
                                    Use plain text or Markdown (similar to a <code>CLAUDE.md</code> project guide).
                                </div>
                                <div v-if="!canEditGuidelines" class="text-orange q-mt-sm">
                                    Read-only: you do not have permission to update redaction guidelines.
                                </div>
                            </q-card-section>

                            <q-separator />

                            <q-card-section class="q-gutter-md">
                                <q-input
                                outlined
                                type="textarea"
                                class="redaction-guidelines-editor"
                                :input-style="{ fontFamily: 'monospace', minHeight: '360px' }"
                                label="Redaction guidelines"
                                v-model="redactionGuidelines.content"
                                :readonly="!canEditGuidelines || redactionGuidelines.delivery !== 'inline'"
                                hint="Examples: tone, terminology, data redaction rules, forbidden disclosures, report structure conventions."
                                />
                                <q-banner
                                v-if="redactionGuidelines.delivery === 'bedrock_prompt_cache'"
                                dense
                                class="bg-blue-1 text-blue-10"
                                >
                                    Delivery is configured as AWS Bedrock prompt cache.
                                    Cache reference: <code>{{ redactionGuidelines.bedrockPromptCache.cacheReference || 'not set' }}</code>
                                    <span v-if="redactionGuidelines.bedrockPromptCache.region">
                                        ({{ redactionGuidelines.bedrockPromptCache.region }})
                                    </span>
                                </q-banner>
                            </q-card-section>

                            <q-card-actions align="right">
                                <q-btn
                                color="secondary"
                                unelevated
                                no-caps
                                label="Save guidelines"
                                :disable="!canEditGuidelines || !hasGuidelineChanges || redactionGuidelines.delivery !== 'inline'"
                                :loading="savingGuidelines"
                                @click="saveRedactionGuidelines()"
                                />
                            </q-card-actions>
                        </q-tab-panel>

                        <q-tab-panel v-if="canReadQa" name="qa" class="q-pa-none">
                            <q-card-section>
                                <div class="text-grey-8">
                                    Configure which automated checks run when validating an audit report before generation.
                                </div>
                                <div v-if="!canEditQa" class="text-orange q-mt-sm">
                                    Read-only: you do not have permission to update QA settings.
                                </div>
                            </q-card-section>

                            <q-separator />

                            <q-card-section class="q-gutter-sm">
                                <q-card
                                v-for="check in qaCheckOptions"
                                :key="check.key"
                                bordered
                                flat
                                class="q-pa-md"
                                >
                                    <div class="row items-center q-col-gutter-md">
                                        <div class="col">
                                            <div class="text-subtitle2">{{ check.label }}</div>
                                            <div class="text-caption text-grey-7">{{ check.description }}</div>
                                        </div>
                                        <div class="col-auto">
                                            <q-toggle
                                            v-model="qaChecks[check.key]"
                                            label="Enabled"
                                            :disable="!canEditQa"
                                            />
                                        </div>
                                    </div>
                                </q-card>
                            </q-card-section>

                            <q-separator />

                            <q-card-section>
                                <div class="text-subtitle2 q-mb-sm">QA instructions</div>
                                <div class="text-grey-8 q-mb-md">
                                    Organization-wide QA checklist provided to the AI reviewer.
                                    Use plain text or Markdown to define additional required sections, fields, and report rules beyond the minimum completeness check.
                                </div>
                            </q-card-section>

                            <q-card-section class="q-gutter-md q-pt-none">
                                <q-input
                                outlined
                                type="textarea"
                                class="qa-instructions-editor"
                                :input-style="{ fontFamily: 'monospace', minHeight: '360px' }"
                                label="QA instructions"
                                v-model="qaInstructions.content"
                                :readonly="!canEditQa || qaInstructions.delivery !== 'inline'"
                                hint="Examples: require executive summary and scope sections, mandate remediation text, verify customer naming, retest wording."
                                />
                                <q-banner
                                v-if="qaInstructions.delivery === 'bedrock_prompt_cache'"
                                dense
                                class="bg-blue-1 text-blue-10"
                                >
                                    Delivery is configured as AWS Bedrock prompt cache.
                                    Cache reference: <code>{{ qaInstructions.bedrockPromptCache.cacheReference || 'not set' }}</code>
                                    <span v-if="qaInstructions.bedrockPromptCache.region">
                                        ({{ qaInstructions.bedrockPromptCache.region }})
                                    </span>
                                </q-banner>
                            </q-card-section>

                            <q-card-actions align="right">
                                <q-btn
                                color="secondary"
                                unelevated
                                no-caps
                                label="Save QA settings"
                                :disable="!canEditQa || !hasQaChanges || (hasQaInstructionChanges && qaInstructions.delivery !== 'inline')"
                                :loading="savingQaSettings"
                                @click="saveQaSettings()"
                                />
                            </q-card-actions>
                        </q-tab-panel>
                    </q-tab-panels>
                </template>
            </q-card>
        </div>
    </div>
</template>

<script src="./ai-integration.js"></script>

<style scoped>
.redaction-guidelines-editor :deep(textarea),
.qa-instructions-editor :deep(textarea) {
    line-height: 1.5;
}
</style>
