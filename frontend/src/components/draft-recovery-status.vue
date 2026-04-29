<template>
  <q-btn-dropdown
    v-if="status"
    outline no-caps dense
    class="q-ml-sm"
    :color="status.type === 'local_draft' ? 'orange' : 'primary'"
    :class="status.type === 'local_draft' ? 'bg-orange-1': 'bg-grey-3'"
    dropdown-icon="keyboard_arrow_down"
  >
    <template v-slot:label>
      <div class="row items-center no-wrap status-label">
        <q-icon left name="mdi-database-outline" />
        <span class="status-main-label">{{ mainLabel }}</span>
        <span 
          class="status-meta-label q-ml-sm"
          :class="status.type === 'local_draft' ? 'text-brown-6' : 'primary'"
        >
          {{ metaLabel }}
        </span>
      </div>
    </template>

    <div class="draft-panel">
      <!-- Info banner -->
      <div class="draft-banner" :class="bannerClass">
        <q-icon name="info" size="16px" class="draft-icon-fixed" />
        <div class="q-ml-sm">
          <div class="draft-action-title">{{ bannerLine1 }}</div>
          <div class="text-caption text-grey-8 q-mt-xs">{{ bannerLine2 }}</div>
        </div>
      </div>

      <!-- Expiry -->
      <div class="draft-info-row">
        <q-icon name="schedule" size="16px" color="grey-6" class="draft-icon-fixed" />
        <div class="q-ml-sm">
          <div class="draft-action-title text-dark">{{ expiryLabel }}</div>
          <div class="text-caption text-grey-6">{{ $t('draftRecovery.clearedAfterInactivity') }}</div>
        </div>
      </div>

      <q-separator />

      <!-- Actions -->
      <template v-for="(action, index) in actionConfigs" :key="action.id">
        <q-separator v-if="index > 0" />
        <div class="draft-action" v-close-popup @click="action.handler && action.handler()">
          <q-icon :name="action.icon" size="18px" :color="action.iconColor" class="draft-icon-fixed" />
          <div class="q-ml-sm">
            <div class="draft-action-title" :class="`text-${action.labelColor}`">{{ action.label }}</div>
            <div class="text-caption text-grey-6">{{ action.description }}</div>
          </div>
        </div>
      </template>

      <!-- Footer hint for local draft -->
      <template v-if="status.type === 'local_draft'">
        <q-separator />
        <div class="draft-hint">
          <q-icon name="lightbulb_outline" size="14px" color="grey-5" />
          <span class="text-caption text-grey-6 q-ml-xs">{{ $t('draftRecovery.saveHint') }}</span>
        </div>
      </template>
    </div>
  </q-btn-dropdown>
</template>

<script>
import DraftRecoveryService from '@/services/draft-recovery'

const TTL_DAYS = 7

const ACTION_ICON_MAP = {
  discard:          { icon: 'delete',      iconColor: 'negative', labelColor: 'negative' },
  restore:          { icon: 'restore',     iconColor: 'primary',  labelColor: 'primary'  },
  delete_permanently: { icon: 'delete',    iconColor: 'negative', labelColor: 'negative' },
  view_changes:     { icon: 'difference',  iconColor: 'grey-7',   labelColor: 'grey-8'   }
}

export default {
  name: 'DraftRecoveryStatus',

  computed: {
    status() {
      return DraftRecoveryService.state.current
    },

    mainLabel() {
      if (!this.status) return ''
      return this.status.type === 'local_draft'
        ? this.$t('draftRecovery.localDraftLabel')
        : this.$t('draftRecovery.serverVersionLabel')
    },

    metaLabel() {
      if (!this.status?.draft) return ''
      if (this.status.type === 'server_version')
        return this.$t('draftRecovery.localDraftExists')
      return this.formatRelativeTime(this.status.draft.updatedAt)
    },

    bannerClass() {
      return this.status?.type === 'local_draft'
        ? 'draft-banner--warning'
        : 'draft-banner--neutral'
    },

    bannerLine1() {
      if (!this.status) return ''
      return this.status.type === 'local_draft'
        ? this.$t('draftRecovery.viewingLocalDraft')
        : this.$t('draftRecovery.viewingServerVersion')
    },

    bannerLine2() {
      if (!this.status) return ''
      return this.status.type === 'local_draft'
        ? this.$t('draftRecovery.notSavedToServer')
        : this.$t('draftRecovery.localDraftNotApplied')
    },

    expiryLabel() {
      if (!this.status?.draft) return ''
      const expiresAt = this.status.draft.updatedAt + TTL_DAYS * 24 * 60 * 60 * 1000
      const remaining = expiresAt - Date.now()
      if (remaining <= 0) return this.$t('draftRecovery.draftExpired')
      const days = Math.floor(remaining / 86400000)
      const hours = Math.floor((remaining % 86400000) / 3600000)
      const mins = Math.floor((remaining % 3600000) / 60000)
      const parts = []
      if (days) parts.push(`${days}d`)
      if (hours) parts.push(`${hours}h`)
      if (mins || !parts.length) parts.push(`${mins}m`)
      return `${this.$t('draftRecovery.draftExpiresIn')} ${parts.join(' ')}`
    },

    actionConfigs() {
      if (!this.status?.actions) return []
      const changeCount = this.status.changeCount || 0
      const isLocalDraft = this.status.type === 'local_draft'

      return this.status.actions.map(action => {
        const conf = ACTION_ICON_MAP[action.id] || { icon: 'circle', iconColor: 'grey', labelColor: 'dark' }
        let label = ''
        let description = ''

        if (action.id === 'discard') {
          label = this.$t('draftRecovery.discardDraft')
          description = this.$t('draftRecovery.discardLocalChanges')
        } else if (action.id === 'restore') {
          label = this.$t('draftRecovery.restoreDraftLabel')
          description = this.$t('draftRecovery.replaceWithDraft')
        } else if (action.id === 'delete_permanently') {
          label = this.$t('draftRecovery.deletePermanently')
          description = this.$t('draftRecovery.actionCannotBeUndone')
        } else if (action.id === 'view_changes') {
          label = `${this.$t('draftRecovery.viewChangesLabel')} (${changeCount})`
          description = isLocalDraft
            ? this.$t('draftRecovery.reviewChangesInDraft')
            : this.$t('draftRecovery.compareWithDraft')
        }

        return {
          id: action.id,
          icon: conf.icon,
          iconColor: conf.iconColor,
          labelColor: conf.labelColor,
          label,
          description,
          handler: action.handler
        }
      })
    }
  },

  methods: {
    formatRelativeTime(ts) {
      const mins = Math.floor((Date.now() - ts) / 60000)
      if (mins < 1) return this.$t('draftRecovery.editedJustNow')
      const edited = this.$t('draftRecovery.edited')
      if (mins < 60) return `${edited} ${mins} min ago`
      const hours = Math.floor(mins / 60)
      if (hours < 24) return `${edited} ${hours}h ago`
      return `${edited} ${Math.floor(hours / 24)}d ago`
    }
  }
}
</script>

<style scoped>
.draft-recovery-status {
  font-size: 12px;
}

.status-main-label {
  font-weight: bold;
  font-size: 13px;
  
}

.status-meta-label {
  font-size: 11px;
}

.draft-panel {
  width: 310px;
}

.draft-banner {
  display: flex;
  align-items: flex-start;
  padding: 12px 14px;
}

.draft-banner--warning {
  background: #fff8e1;
}

.draft-banner--neutral {
  background: #f5f5f5;
}

.draft-info-row {
  display: flex;
  align-items: flex-start;
  padding: 12px 14px;
}

.draft-action {
  display: flex;
  align-items: flex-start;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.draft-action:hover {
  background: #f5f5f5;
}

.draft-hint {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  gap: 4px;
}

.draft-icon-fixed {
  flex-shrink: 0;
  margin-top: 1px;
}

.draft-action-title {
  font-size: 13px;
  font-weight: 500;
}
</style>
