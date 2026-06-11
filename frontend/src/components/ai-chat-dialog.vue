<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="ai-chat-dialog" style="width: 700px; max-width: 95vw;">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="auto_awesome" size="sm" class="q-mr-sm" />
        <span class="text-h6">{{ title }}</span>
        <q-space />
        <q-btn icon="close" flat round dense @click="onDialogCancel" />
      </q-card-section>

      <q-card-section v-if="!isFieldMode" class="q-pt-sm">
        <div class="text-caption text-grey-7 q-mb-xs">{{ $t('aiChat.selectedText') }}</div>
        <div class="ai-chat-context text-body2">{{ selectedText }}</div>
      </q-card-section>

      <q-separator v-if="!isFieldMode" />

      <q-card-section class="ai-chat-messages q-pa-sm">
        <div v-if="messages.length === 0" class="text-grey-6 text-center q-pa-md">
          {{ isFieldMode ? $t('aiChat.reviewDefaultPrompt') : $t('aiChat.startPrompt') }}
        </div>
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="q-mb-sm"
          :class="message.role === 'user' ? 'text-right' : 'text-left'"
        >
          <q-chat-message
          :name="message.role === 'user' ? $t('aiChat.you') : $t('aiChat.assistant')"
          :text="[message.content]"
          :sent="message.role === 'user'"
          :bg-color="message.role === 'user' ? 'primary' : 'grey-3'"
          :text-color="message.role === 'user' ? 'white' : 'black'"
          />
          <div
          v-if="message.role === 'assistant' && message.draftPreview"
          class="q-mt-xs q-pa-sm bg-blue-grey-1 rounded-borders text-body2 ai-chat-draft-preview"
          v-html="message.draftPreview"
          />
        </div>
        <div v-if="loading" class="text-center q-pa-sm">
          <q-spinner-dots color="primary" size="2em" />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pt-sm">
        <q-input
        v-model="userInput"
        type="textarea"
        autogrow
        outlined
        dense
        :placeholder="isFieldMode ? $t('aiChat.defaultPromptPlaceholder') : $t('aiChat.inputPlaceholder')"
        :disable="loading"
        @keydown.ctrl.enter.prevent="sendMessage"
        @keydown.meta.enter.prevent="sendMessage"
        />
        <div class="text-caption text-grey-6 q-mt-xs">{{ $t('aiChat.sendHint') }}</div>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat :label="$t('btn.cancel')" @click="onDialogCancel" />
        <q-btn flat :label="$t('aiChat.send')" color="primary" :disable="!canSend" :loading="loading" @click="sendMessage" />
        <q-btn
        unelevated
        :label="isFieldMode ? $t('aiChat.applyField') : $t('aiChat.apply')"
        color="primary"
        :disable="!latestDraft || loading"
        @click="applyDraft"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { useDialogPluginComponent } from 'quasar'
import AiService from '@/services/ai'
import Utils from '@/services/utils'

export default {
  name: 'AiChatDialog',

  props: {
    title: {
      type: String,
      required: true
    },
    selectedText: {
      type: String,
      default: ''
    },
    defaultPrompt: {
      type: String,
      default: ''
    },
    outputType: {
      type: String,
      default: 'html'
    },
    requestParams: {
      type: Object,
      required: true
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

  data() {
    return {
      messages: [],
      userInput: '',
      loading: false,
      latestDraft: null,
      confirmedPromptInstruction: ''
    }
  },

  mounted() {
    if (this.isFieldMode && this.defaultPrompt)
      this.userInput = this.defaultPrompt
  },

  computed: {
    isFieldMode() {
      return !String(this.selectedText || '').trim()
    },

    canSend() {
      return !this.loading && !!String(this.userInput || '').trim()
    }
  },

  methods: {
    formatDraftPreview(draft) {
      if (this.outputType === 'array') {
        const entries = Array.isArray(draft) ? draft : String(draft || '').split('\n')
        return entries
          .map((line) => String(line || '').trim())
          .filter(Boolean)
          .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
          .join('<br/>')
      }

      if (this.outputType === 'html')
        return Utils.htmlEncode(String(draft || ''))

      return String(draft || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    },

    async sendMessage() {
      const prompt = String(this.userInput || '').trim()
      if (!prompt || this.loading)
        return

      this.messages.push({ role: 'user', content: prompt })
      this.userInput = ''
      this.loading = true

      try {
        const context = { ...(this.requestParams.context || {}) }
        if (this.isFieldMode) {
          delete context.selectedText
          delete context.selectedHtml
        }

        if (this.isFieldMode && !this.confirmedPromptInstruction)
          this.confirmedPromptInstruction = prompt

        const payload = {
          ...this.requestParams,
          context,
          messages: this.messages
            .filter((message) => message.role === 'user' || message.role === 'assistant')
            .slice(0, -1)
            .map((message) => ({
              role: message.role,
              content: message.content
            }))
        }

        if (this.isFieldMode) {
          payload.promptInstruction = this.confirmedPromptInstruction
          payload.userPrompt = this.messages.length > 1 ? prompt : ''
        } else {
          payload.userPrompt = prompt
        }

        const response = await AiService.generateFieldDraft(payload)

        const draft = response.data?.datas?.draft
        const reply = String(response.data?.datas?.reply || '').trim()
        if (draft === null || draft === undefined || (typeof draft === 'string' && !draft.trim()) || (Array.isArray(draft) && draft.length === 0))
          throw new Error(this.$t('aiChat.emptyDraft'))

        this.latestDraft = draft
        this.messages.push({
          role: 'assistant',
          content: reply || this.$t('aiChat.updatedDraft'),
          draftPreview: this.formatDraftPreview(draft)
        })
      } catch (err) {
        this.messages.pop()
        this.userInput = prompt
        this.$q.notify({
          message: err.response?.data?.datas || err.message || this.$t('aiChat.requestFailed'),
          color: 'negative',
          textColor: 'white',
          position: 'top-right'
        })
      } finally {
        this.loading = false
      }
    },

    applyDraft() {
      if (!this.latestDraft)
        return
      this.onDialogOK(this.latestDraft)
    }
  }
}
</script>

<style scoped>
.ai-chat-dialog {
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.ai-chat-context {
  max-height: 120px;
  overflow: auto;
  border: 1px solid #d7d7d7;
  border-radius: 4px;
  padding: 8px;
  white-space: pre-wrap;
  background: #fafafa;
}

.ai-chat-messages {
  min-height: 200px;
  max-height: 40vh;
  overflow-y: auto;
}

.ai-chat-draft-preview {
  max-height: 120px;
  overflow: auto;
}
</style>
