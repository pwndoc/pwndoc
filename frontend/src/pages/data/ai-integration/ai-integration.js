import { Notify } from 'quasar'
import DataService from '@/services/data'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const defaultMarkdownInstructions = () => ({
    delivery: 'inline',
    content: '',
    bedrockPromptCache: {
        cacheReference: '',
        region: ''
    }
})

const defaultQaChecks = () => ({
    completeness: true,
    references: true,
    imageCaptions: true,
    duplicates: true,
    aiDuplicates: true,
    redaction: true,
    customer: true,
    instructions: true
})

const QA_CHECK_OPTIONS = [
    {
        key: 'completeness',
        label: 'Report completeness',
        description: 'Minimum report requirements only: audit name, at least one finding, and finding titles. Findings still in redaction are flagged as warnings.'
    },
    {
        key: 'references',
        label: 'Reference links',
        description: 'Validate that HTTP(S) URLs listed in finding references are reachable.'
    },
    {
        key: 'imageCaptions',
        label: 'Image captions',
        description: 'Flag images and figure captions that still use the imported filename (for example screenshot.png).'
    },
    {
        key: 'duplicates',
        label: 'Duplicate templates',
        description: 'Fast structural checks for templates in the same language with the same title or identical description, observation, and remediation content.'
    },
    {
        key: 'aiDuplicates',
        label: 'AI duplicate templates',
        description: 'AI review to identify templates that describe the same underlying vulnerability even when titles differ or content is paraphrased. Uses additional tokens.'
    },
    {
        key: 'redaction',
        label: 'Redaction guidelines',
        description: 'AI review of report content against organization redaction guidelines.'
    },
    {
        key: 'customer',
        label: 'Customer alignment',
        description: 'AI review that the report content matches the expected customer and company.'
    },
    {
        key: 'instructions',
        label: 'QA instructions',
        description: 'AI review against organization QA instructions below, including any additional required sections or fields you define.'
    }
]

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

const serializeMarkdownInstructions = (guidelines = {}) => ({
    delivery: String(guidelines.delivery || 'inline'),
    content: String(guidelines.content || ''),
    bedrockPromptCache: {
        cacheReference: String(guidelines.bedrockPromptCache?.cacheReference || ''),
        region: String(guidelines.bedrockPromptCache?.region || '')
    }
})

const serializeQaChecks = (checks = {}) => ({
    completeness: checks.completeness !== false,
    references: checks.references !== false,
    imageCaptions: checks.imageCaptions !== false,
    duplicates: checks.duplicates !== false,
    aiDuplicates: checks.aiDuplicates !== false,
    redaction: checks.redaction !== false,
    customer: checks.customer !== false,
    instructions: checks.instructions !== false
})

export default {
    data: () => {
        return {
            loading: true,
            savingPrompts: false,
            savingGuidelines: false,
            savingQaSettings: false,
            selectedTab: 'prompts',
            canEdit: userStore.isAllowed('settings:update'),
            aiEnabled: true,
            promptMappings: [],
            redactionGuidelines: defaultMarkdownInstructions(),
            qaInstructions: defaultMarkdownInstructions(),
            qaChecks: defaultQaChecks(),
            qaCheckOptions: QA_CHECK_OPTIONS,
            orig: {
                promptMappings: [],
                redactionGuidelines: serializeMarkdownInstructions(),
                qaInstructions: serializeMarkdownInstructions(),
                qaChecks: serializeQaChecks()
            }
        }
    },

    mounted: function() {
        this.getAiIntegration()
    },

    computed: {
        hasPromptChanges: function() {
            return JSON.stringify({
                promptMappings: serializePromptMappings(this.promptMappings)
            }) !== JSON.stringify({
                promptMappings: this.orig.promptMappings
            })
        },

        hasGuidelineChanges: function() {
            return JSON.stringify(
                serializeMarkdownInstructions(this.redactionGuidelines)
            ) !== JSON.stringify(this.orig.redactionGuidelines)
        },

        hasQaInstructionChanges: function() {
            return JSON.stringify(
                serializeMarkdownInstructions(this.qaInstructions)
            ) !== JSON.stringify(this.orig.qaInstructions)
        },

        hasQaCheckChanges: function() {
            return JSON.stringify(
                serializeQaChecks(this.qaChecks)
            ) !== JSON.stringify(this.orig.qaChecks)
        },

        hasQaChanges: function() {
            return this.hasQaInstructionChanges || this.hasQaCheckChanges
        }
    },

    methods: {
        applyPayload: function(payload) {
            this.aiEnabled = payload.aiEnabled !== false
            this.promptMappings = (payload.promptMappings || []).map((mapping) => ({
                ...mapping,
                entityType: String(mapping.entityType || ''),
                enabled: mapping.enabled !== false,
                prompt: String(mapping.prompt || '')
            }))

            const guidelines = payload.redactionGuidelines || {}
            this.redactionGuidelines = {
                delivery: guidelines.delivery || 'inline',
                content: String(guidelines.content || ''),
                bedrockPromptCache: {
                    cacheReference: String(guidelines.bedrockPromptCache?.cacheReference || ''),
                    region: String(guidelines.bedrockPromptCache?.region || '')
                }
            }

            const qaInstructions = payload.qaInstructions || {}
            this.qaInstructions = {
                delivery: qaInstructions.delivery || 'inline',
                content: String(qaInstructions.content || ''),
                bedrockPromptCache: {
                    cacheReference: String(qaInstructions.bedrockPromptCache?.cacheReference || ''),
                    region: String(qaInstructions.bedrockPromptCache?.region || '')
                }
            }

            const qaChecks = payload.qaChecks || {}
            this.qaChecks = {
                completeness: qaChecks.completeness !== false,
                references: qaChecks.references !== false,
                imageCaptions: qaChecks.imageCaptions !== false,
                duplicates: qaChecks.duplicates !== false,
                aiDuplicates: qaChecks.aiDuplicates !== false,
                redaction: qaChecks.redaction !== false,
                customer: qaChecks.customer !== false,
                instructions: qaChecks.instructions !== false
            }

            this.orig = {
                promptMappings: serializePromptMappings(this.promptMappings),
                redactionGuidelines: serializeMarkdownInstructions(this.redactionGuidelines),
                qaInstructions: serializeMarkdownInstructions(this.qaInstructions),
                qaChecks: serializeQaChecks(this.qaChecks)
            }
        },

        getAiIntegration: function() {
            this.loading = true
            DataService.getAiIntegration()
            .then((data) => {
                this.applyPayload(data.data.datas || {})
            })
            .catch((err) => {
                Notify.create({
                    message: err.response?.data?.datas || 'Failed to load AI integration settings',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
            .finally(() => {
                this.loading = false
            })
        },

        savePrompts: function() {
            if (!this.canEdit || this.savingPrompts)
                return

            this.savingPrompts = true
            DataService.updateAiIntegration({
                promptMappings: this.promptMappings.map((mapping) => ({
                    entityType: mapping.entityType,
                    fieldKey: mapping.fieldKey,
                    enabled: mapping.enabled !== false,
                    prompt: mapping.prompt
                }))
            })
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
                this.savingPrompts = false
            })
        },

        saveRedactionGuidelines: function() {
            if (!this.canEdit || this.savingGuidelines)
                return

            this.savingGuidelines = true
            DataService.updateAiIntegration({
                redactionGuidelines: serializeMarkdownInstructions(this.redactionGuidelines)
            })
            .then((data) => {
                this.applyPayload(data.data.datas || {})
                Notify.create({
                    message: 'Redaction guidelines updated successfully',
                    color: 'positive',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response?.data?.datas || 'Failed to update redaction guidelines',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
            .finally(() => {
                this.savingGuidelines = false
            })
        },

        saveQaSettings: function() {
            if (!this.canEdit || this.savingQaSettings || !this.hasQaChanges)
                return

            this.savingQaSettings = true
            const payload = {}

            if (this.hasQaCheckChanges)
                payload.qaChecks = serializeQaChecks(this.qaChecks)

            if (this.hasQaInstructionChanges)
                payload.qaInstructions = serializeMarkdownInstructions(this.qaInstructions)

            DataService.updateAiIntegration(payload)
            .then((data) => {
                this.applyPayload(data.data.datas || {})
                Notify.create({
                    message: 'QA settings updated successfully',
                    color: 'positive',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response?.data?.datas || 'Failed to update QA settings',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
            .finally(() => {
                this.savingQaSettings = false
            })
        }
    }
}
