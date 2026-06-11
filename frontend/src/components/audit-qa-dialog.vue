<template>
    <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
        <q-card style="min-width: 640px; max-width: 900px; width: 90vw;">
            <q-card-section class="row items-center q-pb-none">
                <div class="text-h6">{{ $t('auditQa.title') }}</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>

            <q-card-section v-if="loading" class="text-center q-py-xl">
                <q-spinner color="primary" size="3em" />
                <div class="q-mt-md text-grey-7">{{ $t('auditQa.running') }}</div>
            </q-card-section>

            <q-card-section v-else-if="errorMessage" class="text-negative">
                {{ errorMessage }}
            </q-card-section>

            <template v-else>
                <q-card-section>
                    <q-banner v-if="cached" dense rounded class="bg-blue-grey-1 text-grey-9 q-mb-md">
                        {{ cachedAtLabel }}
                    </q-banner>
                    <div class="text-body2 q-mb-md">{{ summary }}</div>
                    <div class="row q-col-gutter-sm q-mb-md">
                        <div class="col-auto" v-if="counts.error">
                            <q-chip dense color="negative" text-color="white">
                                {{ counts.error }} {{ $t('auditQa.errors') }}
                            </q-chip>
                        </div>
                        <div class="col-auto" v-if="counts.warning">
                            <q-chip dense color="warning" text-color="dark">
                                {{ counts.warning }} {{ $t('auditQa.warnings') }}
                            </q-chip>
                        </div>
                        <div class="col-auto" v-if="counts.info">
                            <q-chip dense color="info" text-color="white">
                                {{ counts.info }} {{ $t('auditQa.infos') }}
                            </q-chip>
                        </div>
                        <div class="col-auto" v-if="!counts.total">
                            <q-chip dense color="positive" text-color="white">
                                {{ $t('auditQa.noIssues') }}
                            </q-chip>
                        </div>
                    </div>

                    <q-list bordered separator v-if="issues.length">
                        <q-item v-for="(issue, index) in issues" :key="`${issue.location}:${issue.title}:${index}`">
                            <q-item-section avatar>
                                <q-icon :name="severityIcon(issue.severity)" :color="severityColor(issue.severity)" />
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-weight-medium">{{ issue.title }}</q-item-label>
                                <q-item-label caption>{{ issue.message }}</q-item-label>
                                <q-item-label caption class="q-mt-xs text-grey-7">
                                    {{ categoryLabel(issue.category) }} · {{ formatLocationLabel(issue.location) }}
                                    <span v-if="issue.source === 'ai'"> · {{ $t('auditQa.aiReview') }}</span>
                                </q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card-section>

                <q-card-actions align="right">
                    <q-btn flat :label="$t('btn.close')" color="primary" v-close-popup />
                </q-card-actions>
            </template>
        </q-card>
    </q-dialog>
</template>

<script>
import { useDialogPluginComponent } from 'quasar'
import { $t } from '@/boot/i18n'
import AiService from '@/services/ai'

export default {
    props: {
        auditId: {
            type: String,
            required: true
        }
    },

    emits: [...useDialogPluginComponent.emits],

    data: function() {
        return {
            loading: true,
            errorMessage: '',
            summary: '',
            issues: [],
            cached: false,
            ranAt: null,
            counts: {
                total: 0,
                error: 0,
                warning: 0,
                info: 0
            }
        }
    },

    computed: {
        cachedAtLabel: function() {
            if (!this.ranAt)
                return this.$t('auditQa.cachedResult')

            const date = new Date(this.ranAt)
            if (Number.isNaN(date.getTime()))
                return this.$t('auditQa.cachedResult')

            return this.$t('auditQa.cachedResultAt', {
                date: date.toLocaleString()
            })
        }
    },

    setup() {
        return {
            ...useDialogPluginComponent()
        }
    },

    mounted: function() {
        this.runQa()
    },

    methods: {
        runQa: function() {
            this.loading = true
            this.errorMessage = ''

            AiService.runAuditQa(this.auditId)
            .then((response) => {
                const data = response.data.datas || {}
                this.summary = String(data.summary || '')
                this.issues = Array.isArray(data.issues) ? data.issues : []
                this.cached = Boolean(data.cached)
                this.ranAt = data.ranAt || null
                this.counts = data.counts || {
                    total: this.issues.length,
                    error: this.issues.filter((issue) => issue.severity === 'error').length,
                    warning: this.issues.filter((issue) => issue.severity === 'warning').length,
                    info: this.issues.filter((issue) => issue.severity === 'info').length
                }
            })
            .catch((err) => {
                this.errorMessage = err.response?.data?.datas || $t('auditQa.failed')
            })
            .finally(() => {
                this.loading = false
            })
        },

        severityColor: function(severity) {
            if (severity === 'error')
                return 'negative'
            if (severity === 'warning')
                return 'warning'
            return 'info'
        },

        severityIcon: function(severity) {
            if (severity === 'error')
                return 'error'
            if (severity === 'warning')
                return 'warning'
            return 'info'
        },

        categoryLabel: function(category) {
            const labels = {
                completeness: $t('auditQa.category.completeness'),
                redaction: $t('auditQa.category.redaction'),
                customer: $t('auditQa.category.customer'),
                instructions: $t('auditQa.category.instructions'),
                references: $t('auditQa.category.references'),
                imageCaptions: $t('auditQa.category.imageCaptions'),
                other: $t('auditQa.category.other')
            }
            return labels[category] || labels.other
        },

        formatLocationLabel: function(location) {
            const value = String(location || '').trim()
            if (!value)
                return $t('auditQa.location.report')

            const staticLabels = {
                general: $t('auditQa.location.general'),
                network: $t('auditQa.location.network'),
                report: $t('auditQa.location.report')
            }
            if (staticLabels[value])
                return staticLabels[value]

            const fieldLabels = {
                description: $t('description'),
                observation: $t('observation'),
                remediation: $t('remediation'),
                references: $t('references'),
                poc: $t('proofs'),
                affected: $t('affectedAssets'),
                cvssv3: 'CVSS v3',
                cvssv4: 'CVSS v4',
                retestDescription: $t('description')
            }

            if (value.startsWith('finding:')) {
                let title = value.slice('finding:'.length)
                let field = ''

                Object.keys(fieldLabels).forEach((fieldKey) => {
                    const suffix = `/${fieldKey}`
                    if (title.endsWith(suffix)) {
                        field = fieldKey
                        title = title.slice(0, -suffix.length)
                    }
                })

                if (/^IDX-\d+$/i.test(title))
                    title = $t('auditQa.location.untitledFinding')

                if (field)
                    return `${title} · ${fieldLabels[field]}`
                return title
            }

            const sectionMatch = value.match(/^section:(.+)$/)
            if (sectionMatch)
                return sectionMatch[1]

            return value
        }
    }
}
</script>
