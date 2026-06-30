<template>
  <div class="qa-results-panel column full-height">
    <q-toolbar class="bg-grey-3" @mousedown.prevent>
      <q-icon name="auto_awesome" size="sm" class="q-mr-sm" />
      <q-toolbar-title class="text-subtitle1">{{ title }}</q-toolbar-title>
      <q-btn icon="close" flat round dense @click="$emit('close')" />
    </q-toolbar>

    <q-card-section v-if="loading" class="text-center q-py-xl col" @mousedown.prevent>
      <q-spinner color="primary" size="3em" />
      <div class="q-mt-md text-grey-7">{{ runningLabel }}</div>
    </q-card-section>

    <q-card-section v-else-if="errorMessage" class="text-negative col" @mousedown.prevent>
      {{ errorMessage }}
      <div class="q-mt-md">
        <q-btn flat color="primary" :label="retryLabel" @click="$emit('retry')" />
      </div>
    </q-card-section>

    <template v-else>
      <q-card-section class="col-auto q-pb-none" @mousedown.prevent>
        <q-banner v-if="topBanner" dense rounded class="bg-blue-grey-1 text-grey-9 q-mb-md">
          {{ topBanner }}
        </q-banner>

        <q-banner v-if="cached" dense rounded class="bg-blue-grey-1 text-grey-9 q-mb-md">
          {{ cachedAtLabel }}
        </q-banner>

        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-4">
            <div
            class="qa-stat qa-stat--error"
            :class="{ 'qa-stat--active': severityFilter === 'error' }"
            @click="setSeverityFilter('error')"
            >
              <div class="qa-stat__value">{{ counts.error }}</div>
              <div class="qa-stat__label">{{ $t('auditQa.errors') }}</div>
            </div>
          </div>
          <div class="col-4">
            <div
            class="qa-stat qa-stat--warning"
            :class="{ 'qa-stat--active': severityFilter === 'warning' }"
            @click="setSeverityFilter('warning')"
            >
              <div class="qa-stat__value">{{ counts.warning }}</div>
              <div class="qa-stat__label">{{ $t('auditQa.warnings') }}</div>
            </div>
          </div>
          <div class="col-4">
            <div
            class="qa-stat qa-stat--total"
            :class="{ 'qa-stat--active': severityFilter === 'all' }"
            @click="setSeverityFilter('all')"
            >
              <div class="qa-stat__value">{{ counts.total }}</div>
              <div class="qa-stat__label">{{ $t('auditQa.total') }}</div>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="qa-groups col q-pa-none" @mousedown.prevent>
        <div v-if="!groupedIssues.length" class="text-center text-grey-6 q-pa-lg">
          {{ $t('auditQa.noIssues') }}
        </div>

        <q-list v-else separator>
          <q-expansion-item
          v-for="group in groupedIssues"
          :key="group.label"
          default-opened
          header-class="qa-group__header"
          expand-icon-class="text-grey-7"
          >
            <template v-slot:header>
              <q-item-section>
                <q-item-label>{{ group.label }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="grey-4" text-color="grey-9">{{ group.issues.length }}</q-badge>
              </q-item-section>
            </template>
            <q-card flat bordered class="q-ma-sm">
              <q-list separator>
                <q-item
                v-for="(issue, index) in group.issues"
                :key="`${issue.location}:${issue.title}:${index}`"
                class="qa-issue"
                >
                  <q-item-section avatar top>
                    <q-icon :name="severityIcon(issue.severity)" :color="severityColor(issue.severity)" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ issue.title }}</q-item-label>
                    <q-item-label caption>{{ issue.message }}</q-item-label>
                    <q-item-label caption class="q-mt-xs text-grey-7">
                      {{ categoryLabel(issue.category) }}
                      <span v-if="issue.source === 'ai'"> · {{ $t('auditQa.aiReview') }}</span>
                    </q-item-label>
                  </q-item-section>
                  <q-item-section v-if="showNavigation" side top>
                    <q-btn
                    outline
                    dense
                    no-caps
                    color="primary"
                    :label="navigationLabel(issue)"
                    icon-right="chevron_right"
                    @click="$emit('navigate', issue)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card>
          </q-expansion-item>
        </q-list>
      </q-card-section>
    </template>
  </div>
</template>

<script>
import { $t } from '@/boot/i18n'

export default {
  name: 'QaResultsPanel',

  props: {
    title: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    errorMessage: {
      type: String,
      default: ''
    },
    runningLabel: {
      type: String,
      default: () => $t('auditQa.running')
    },
    retryLabel: {
      type: String,
      default: () => $t('auditQa.retry')
    },
    counts: {
      type: Object,
      default: () => ({
        total: 0,
        error: 0,
        warning: 0,
        info: 0
      })
    },
    severityFilter: {
      type: String,
      default: 'all'
    },
    groupedIssues: {
      type: Array,
      default: () => []
    },
    cached: {
      type: Boolean,
      default: false
    },
    cachedAtLabel: {
      type: String,
      default: ''
    },
    topBanner: {
      type: String,
      default: ''
    },
    showNavigation: {
      type: Boolean,
      default: false
    },
    navigationLabel: {
      type: Function,
      default: () => ''
    }
  },

  emits: ['close', 'retry', 'update:severityFilter', 'navigate'],

  methods: {
    setSeverityFilter(filter) {
      this.$emit('update:severityFilter', filter)
    },

    severityColor(severity) {
      if (severity === 'error')
        return 'negative'
      if (severity === 'warning')
        return 'warning'
      return 'info'
    },

    severityIcon(severity) {
      if (severity === 'error')
        return 'error'
      if (severity === 'warning')
        return 'warning'
      return 'info'
    },

    categoryLabel(category) {
      const labels = {
        completeness: $t('auditQa.category.completeness'),
        redaction: $t('auditQa.category.redaction'),
        customer: $t('auditQa.category.customer'),
        instructions: $t('auditQa.category.instructions'),
        references: $t('auditQa.category.references'),
        imageCaptions: $t('auditQa.category.imageCaptions'),
        duplicates: $t('auditQa.category.duplicates'),
        aiDuplicates: $t('auditQa.category.aiDuplicates'),
        other: $t('auditQa.category.other')
      }
      return labels[category] || labels.other
    }
  }
}
</script>

<style scoped>
.qa-results-panel {
  min-width: 0;
  height: 100%;
  user-select: none;
  caret-color: transparent;
}

.qa-stat {
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
  background: #f5f5f5;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.15s, background 0.15s;
}

.qa-stat:hover {
  background: #eee;
}

.qa-stat--active {
  border-color: currentColor;
  background: #fff;
}

.qa-stat--error.qa-stat--active {
  border-color: #c10015;
}

.qa-stat--warning.qa-stat--active {
  border-color: #f2c037;
}

.qa-stat--total.qa-stat--active {
  border-color: #1976d2;
}

.qa-stat__value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.qa-stat__label {
  font-size: 0.75rem;
  color: #666;
  margin-top: 4px;
}

.qa-stat--error .qa-stat__value {
  color: #c10015;
}

.qa-stat--warning .qa-stat__value {
  color: #f2c037;
}

.qa-stat--total .qa-stat__value {
  color: #1976d2;
}

.qa-groups {
  min-height: 0;
  overflow-y: auto;
}

.qa-group__header {
  background: #f7f7f7;
}

.qa-issue {
  align-items: flex-start;
}
</style>
