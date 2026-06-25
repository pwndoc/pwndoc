import { defineStore } from 'pinia'
import AiService from '@/services/ai'
import { useAiGenerationStore } from '@/stores/ai-generation'
import { $t } from '@/boot/i18n'

export const QA_DRAWER_WIDTH = 420

export const useAuditQaStore = defineStore('auditQa', {
  state: () => ({
    drawerOpen: false,
    loading: false,
    auditId: null,
    summary: '',
    issues: [],
    cached: false,
    ranAt: null,
    errorMessage: '',
    severityFilter: 'all',
    counts: {
      total: 0,
      error: 0,
      warning: 0,
      info: 0
    }
  }),

  getters: {
    filteredIssues(state) {
      if (state.severityFilter === 'all')
        return state.issues

      return state.issues.filter((issue) => issue.severity === state.severityFilter)
    }
  },

  actions: {
    syncLayoutInset(width = QA_DRAWER_WIDTH) {
      const aiStore = useAiGenerationStore()
      const inset = this.drawerOpen ? (Number(width) || QA_DRAWER_WIDTH) : 0
      if (inset > 0 || !aiStore.drawerOpen)
        aiStore.setLayoutRightInset(inset)
    },

    open(auditId) {
      const aiStore = useAiGenerationStore()
      if (aiStore.drawerOpen)
        aiStore.closeDrawer()

      const sameAudit = this.auditId === auditId && this.issues.length && !this.errorMessage
      this.auditId = auditId
      this.drawerOpen = true
      this.severityFilter = 'all'
      this.syncLayoutInset()

      if (!sameAudit)
        this.runQa(auditId)
    },

    close() {
      this.drawerOpen = false
      const aiStore = useAiGenerationStore()
      if (!aiStore.drawerOpen)
        aiStore.setLayoutRightInset(0)
    },

    runQa(auditId) {
      this.loading = true
      this.errorMessage = ''
      this.auditId = auditId

      return AiService.runAuditQa(auditId)
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
        this.summary = ''
        this.issues = []
        this.counts = { total: 0, error: 0, warning: 0, info: 0 }
      })
      .finally(() => {
        this.loading = false
      })
    },

    setSeverityFilter(filter) {
      this.severityFilter = filter
    }
  }
})
