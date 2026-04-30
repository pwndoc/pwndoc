<template>
  <q-btn-dropdown
    v-if="status"
    outline no-caps dense
    class="q-ml-sm"
    :color="status.type === 'local_draft' ? 'orange' : 'primary'"
    :class="status.type === 'local_draft' ? 'bg-orange-1' : 'bg-grey-3'"
    dropdown-icon="keyboard_arrow_down"
  >
    <template #label>
      <q-icon left name="mdi-database-outline" />
      <span class="text-weight-bold">{{ mainLabel }}</span>
      <span
        class="status-meta-label q-ml-sm"
        :class="status.type === 'local_draft' ? 'text-brown-6' : 'text-primary'"
      >
        {{ metaLabel }}
      </span>
    </template>

    <q-list class="draft-panel">
      <!-- Info banner -->
      <q-item >
        <q-item-section side top class="q-py-sm" :class="status.type === 'local_draft' ? 'bg-amber-1' : 'bg-grey-3'">
          <q-icon
            name="o_info"
            size="xs"
            :color="status.type === 'local_draft' ? 'brown-6' : 'primary'"
          />
        </q-item-section>
        <q-item-section class="q-py-sm" :class="status.type === 'local_draft' ? 'text-brown-6 bg-amber-1' : 'bg-grey-3'">
          <q-item-label class="text-weight-medium">{{ bannerLine1 }}</q-item-label>
          <q-item-label caption>{{ bannerLine2 }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-separator inset />

      <!-- Expiry -->
      <q-item >
        <q-item-section side top>
          <q-icon name="schedule" size="xs" color="primary"/>
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ expiryLabel }}</q-item-label>
          <q-item-label caption>{{ $t('draftRecovery.clearedAfterInactivity') }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-separator inset />

      <!-- Actions -->
      <template v-for="(action, index) in actionConfigs" :key="action.id">
        <q-separator v-if="action.id === 'separator'" inset />
        <q-item v-else clickable v-close-popup @click="action.handler && action.handler()">
          <q-item-section side top>
            <q-icon :name="action.icon" size="18px" :color="action.iconColor" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium" :class="`text-${action.labelColor}`">
              {{ action.label }}
            </q-item-label>
            <q-item-label caption>{{ action.description }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>

      <!-- Footer hint for local draft -->
      <template v-if="status.type === 'local_draft'">
        <q-separator inset />
        <q-item dense>
          <q-item-section side>
            <q-icon name="lightbulb_outline" size="14px" />
          </q-item-section>
          <q-item-section>
            <q-item-label caption>{{ $t('draftRecovery.saveHint') }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-list>
  </q-btn-dropdown>
</template>

<script>
import DraftRecoveryService from '@/services/draft-recovery'

const TTL_DAYS = 7

const ACTION_ICON_MAP = {
  discard:            { icon: 'restore',      iconColor: 'blue',     labelColor: 'blue' },
  restore:            { icon: 'restore',      iconColor: 'blue',     labelColor: 'blue'  },
  delete_permanently: { icon: 'delete',       iconColor: 'negative', labelColor: 'negative' },
  view_changes:       { icon: 'o_difference', iconColor: 'primary',  labelColor: ''   }
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
        if (action.id === 'separator') return { id: 'separator' }

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

<style lang="scss" scoped>
@use "quasar/src/css/variables" as q;

.draft-panel {
  min-width: 310px;
}

.status-meta-label {
  font-size: 11px;
}
</style>
