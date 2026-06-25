<template>
  <q-drawer
  :model-value="drawerOpen"
  @update:model-value="onDrawerOpenChange"
  side="right"
  bordered
  :width="drawerWidth"
  :breakpoint="1024"
  :behavior="isDesktopLayout ? 'desktop' : 'mobile'"
  :overlay="!isDesktopLayout"
  class="audit-qa-sidebar"
  >
    <div class="audit-qa-sidebar__panel column full-height">
      <q-toolbar class="bg-grey-3" @mousedown.prevent>
        <q-icon name="fact_check" size="sm" class="q-mr-sm" />
        <q-toolbar-title class="text-subtitle1">{{ $t('auditQa.title') }}</q-toolbar-title>
        <q-btn icon="close" flat round dense @click="closeDrawer" />
      </q-toolbar>

      <q-card-section v-if="loading" class="text-center q-py-xl col" @mousedown.prevent>
        <q-spinner color="primary" size="3em" />
        <div class="q-mt-md text-grey-7">{{ $t('auditQa.running') }}</div>
      </q-card-section>

      <q-card-section v-else-if="errorMessage" class="text-negative col" @mousedown.prevent>
        {{ errorMessage }}
        <div class="q-mt-md">
          <q-btn flat color="primary" :label="$t('auditQa.retry')" @click="retry" />
        </div>
      </q-card-section>

      <template v-else>
        <q-card-section class="col-auto q-pb-none" @mousedown.prevent>
          <q-banner v-if="cached" dense rounded class="bg-blue-grey-1 text-grey-9 q-mb-md">
            {{ cachedAtLabel }}
          </q-banner>

          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-4">
              <div
              class="audit-qa-stat audit-qa-stat--error"
              :class="{ 'audit-qa-stat--active': severityFilter === 'error' }"
              @click="setSeverityFilter('error')"
              >
                <div class="audit-qa-stat__value">{{ counts.error }}</div>
                <div class="audit-qa-stat__label">{{ $t('auditQa.errors') }}</div>
              </div>
            </div>
            <div class="col-4">
              <div
              class="audit-qa-stat audit-qa-stat--warning"
              :class="{ 'audit-qa-stat--active': severityFilter === 'warning' }"
              @click="setSeverityFilter('warning')"
              >
                <div class="audit-qa-stat__value">{{ counts.warning }}</div>
                <div class="audit-qa-stat__label">{{ $t('auditQa.warnings') }}</div>
              </div>
            </div>
            <div class="col-4">
              <div
              class="audit-qa-stat audit-qa-stat--total"
              :class="{ 'audit-qa-stat--active': severityFilter === 'all' }"
              @click="setSeverityFilter('all')"
              >
                <div class="audit-qa-stat__value">{{ counts.total }}</div>
                <div class="audit-qa-stat__label">{{ $t('auditQa.total') }}</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="audit-qa-groups col q-pa-none" @mousedown.prevent>
          <div v-if="!groupedIssues.length" class="text-center text-grey-6 q-pa-lg">
            {{ $t('auditQa.noIssues') }}
          </div>

          <q-list v-else separator>
            <q-expansion-item
            v-for="group in groupedIssues"
            :key="group.label"
            default-opened
            header-class="audit-qa-group__header"
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
                  class="audit-qa-issue"
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
                    <q-item-section side top>
                      <q-btn
                      outline
                      dense
                      no-caps
                      color="primary"
                      :label="navigationLabel(issue)"
                      icon-right="chevron_right"
                      @click="navigateToIssue(issue)"
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
  </q-drawer>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import { useAuditQaStore, QA_DRAWER_WIDTH } from '@/stores/audit-qa'
import { $t } from '@/boot/i18n'
import {
  parseIssueLocation,
  buildIssueRoute,
  issueNavigationType,
  isGeneralInformationLocation
} from '@/services/audit-qa-navigation'

export default {
  name: 'AuditQaSidebar',

  props: {
    auditId: {
      type: String,
      required: true
    },
    findings: {
      type: Array,
      default: () => []
    },
    sections: {
      type: Array,
      default: () => []
    }
  },

  emits: ['highlight-field'],

  computed: {
    ...mapState(useAuditQaStore, [
      'drawerOpen',
      'loading',
      'issues',
      'cached',
      'ranAt',
      'errorMessage',
      'severityFilter',
      'counts'
    ]),

    drawerWidth() {
      return this.$q.screen.gt.md ? QA_DRAWER_WIDTH : Math.min(this.$q.screen.width - 24, QA_DRAWER_WIDTH)
    },

    isDesktopLayout() {
      return this.$q.screen.width >= 1024
    },

    filteredIssues() {
      return useAuditQaStore().filteredIssues
    },

    groupedIssues() {
      const groups = new Map()

      this.filteredIssues.forEach((issue) => {
        const label = this.formatLocationLabel(issue.location)
        if (!groups.has(label))
          groups.set(label, [])
        groups.get(label).push(issue)
      })

      return Array.from(groups.entries()).map(([label, issues]) => ({ label, issues }))
    },

    cachedAtLabel() {
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

  watch: {
    drawerOpen: {
      immediate: true,
      handler() {
        this.syncLayoutInset()
      }
    },

    drawerWidth() {
      this.syncLayoutInset()
    },

    isDesktopLayout() {
      this.syncLayoutInset()
    }
  },

  mounted() {
    window.addEventListener('resize', this.syncLayoutInset)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.syncLayoutInset)
    useAuditQaStore().close()
  },

  methods: {
    ...mapActions(useAuditQaStore, {
      closeStore: 'close',
      runQa: 'runQa',
      setSeverityFilter: 'setSeverityFilter'
    }),

    syncLayoutInset() {
      const inset = this.drawerOpen && this.isDesktopLayout ? this.drawerWidth : 0
      useAuditQaStore().syncLayoutInset(inset)
    },

    closeDrawer() {
      this.closeStore()
    },

    onDrawerOpenChange(value) {
      if (!value)
        this.closeDrawer()
    },

    retry() {
      if (this.auditId)
        this.runQa(this.auditId)
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
    },

    formatLocationLabel(location) {
      const value = String(location || '').trim()
      if (!value)
        return $t('auditQa.location.report')

      if (isGeneralInformationLocation(value))
        return $t('generalInformation')

      const staticLabels = {
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
    },

    navigationLabel(issue) {
      return issueNavigationType(issue.location) === 'field'
        ? this.$t('auditQa.goToField')
        : this.$t('auditQa.goToSection')
    },

    navigateToIssue(issue) {
      const parsed = parseIssueLocation(issue.location)
      const route = buildIssueRoute(this.auditId, parsed, {
        findings: this.findings,
        sections: this.sections
      })

      if (!route?.path)
        return

      if (route.fieldName)
        this.$emit('highlight-field', route.fieldName)

      this.$router.push(route.path).catch(() => {})
    }
  }
}
</script>

<style scoped>
.audit-qa-sidebar {
  z-index: 3000;
}

.audit-qa-sidebar__panel {
  min-width: 0;
  height: 100%;
  user-select: none;
  caret-color: transparent;
}

.audit-qa-stat {
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
  background: #f5f5f5;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.15s, background 0.15s;
}

.audit-qa-stat:hover {
  background: #eee;
}

.audit-qa-stat--active {
  border-color: currentColor;
  background: #fff;
}

.audit-qa-stat--error.audit-qa-stat--active {
  border-color: #c10015;
}

.audit-qa-stat--warning.audit-qa-stat--active {
  border-color: #f2c037;
}

.audit-qa-stat--total.audit-qa-stat--active {
  border-color: #1976d2;
}

.audit-qa-stat__value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.audit-qa-stat__label {
  font-size: 0.75rem;
  color: #666;
  margin-top: 4px;
}

.audit-qa-stat--error .audit-qa-stat__value {
  color: #c10015;
}

.audit-qa-stat--warning .audit-qa-stat__value {
  color: #f2c037;
}

.audit-qa-stat--total .audit-qa-stat__value {
  color: #1976d2;
}

.audit-qa-groups {
  min-height: 0;
  overflow-y: auto;
}

.audit-qa-group__header {
  background: #f7f7f7;
}

.audit-qa-issue {
  align-items: flex-start;
}
</style>
