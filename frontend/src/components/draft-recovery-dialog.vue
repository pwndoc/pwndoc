<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="draft-recovery-dialog">
      <q-card-section>
        <div class="text-h6">{{ $t('draftRecovery.title') }}</div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          {{ $t('draftRecovery.message') }}
        </div>
        <div class="text-caption text-grey-7 q-mt-sm">
          {{ $t('draftRecovery.savedAt') }} {{ savedAt }}
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <draft-diff
          :current="current"
          :draft="draft.data"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps color="negative" :label="$t('draftRecovery.discard')" @click="discard" />
        <q-btn unelevated no-caps color="primary" :label="$t('draftRecovery.restore')" @click="restore" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { useDialogPluginComponent } from 'quasar'
import DraftDiff from 'components/draft-diff.vue'

export default {
  name: 'DraftRecoveryDialog',

  components: {
    DraftDiff
  },

  props: {
    draft: {
      type: Object,
      required: true
    },
    current: {
      type: Object,
      default: () => ({})
    }
  },

  emits: [
    ...useDialogPluginComponent.emits
  ],

  setup() {
    return {
      ...useDialogPluginComponent()
    }
  },

  computed: {
    savedAt() {
      return new Date(this.draft.updatedAt).toLocaleString()
    }
  },

  methods: {
    restore() {
      this.onDialogOK('restore')
    },

    discard() {
      this.onDialogOK('discard')
    }
  }
}
</script>

<style scoped>
.draft-recovery-dialog {
  width: 900px;
  max-width: 95vw;
}
</style>
