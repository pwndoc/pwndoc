<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="draft-recovery-dialog">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="history" size="sm" class="q-mr-sm" />
        <span class="text-h6">{{ $t('draftRecovery.title') }}</span>
        <q-space />
        <q-btn icon="close" flat round dense @click="onDialogHide" />
      </q-card-section>
      <q-card-section>
        <div class="text-body2 text-grey-7">
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
          :languages="languages"
        />
      </q-card-section>
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
    },
    languages: {
      type: Array,
      default: () => []
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
