<template>
  <q-drawer
  :model-value="drawerOpen"
  @update:model-value="onDrawerOpenChange"
  side="right"
  bordered
  :width="drawerWidth"
  :breakpoint="1024"
  behavior="desktop"
  :overlay="false"
  class="ai-chat-drawer"
  >
    <div class="ai-chat-drawer__panel column full-height" v-if="sessionConfig">
      <q-toolbar class="bg-grey-3">
        <q-icon name="auto_awesome" size="sm" class="q-mr-sm" />
        <q-toolbar-title class="text-subtitle1">{{ sessionConfig.title }}</q-toolbar-title>
        <q-btn icon="close" flat round dense @click="requestClose" />
      </q-toolbar>

      <q-separator v-if="!isFieldMode" />

      <div ref="messagesContainer" class="ai-chat-conversation col q-pa-sm">
        <q-card-section v-if="!isFieldMode" class="q-pa-none q-pb-sm">
          <div class="text-caption text-grey-7 q-mb-xs">{{ $t('aiChat.selectedText') }}</div>
          <div class="ai-chat-context text-body2">{{ sessionConfig.selectedText }}</div>
        </q-card-section>

        <div v-if="!conversation.messages.length" class="text-grey-6 text-center q-pa-md">
          {{ isFieldMode ? $t('aiChat.reviewDefaultPrompt') : $t('aiChat.startPrompt') }}
        </div>
        <div
        v-for="(message, index) in conversation.messages"
        :key="`${sessionId}:${index}`"
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
          <div class="text-caption text-grey-7 q-mt-sm">{{ $t('aiChat.generating') }}</div>
        </div>
      </div>

      <q-separator />

      <q-card-section class="q-pt-sm col-auto">
        <q-input
        v-model="conversation.userInput"
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

      <q-card-actions align="right" class="q-px-md q-pb-md col-auto">
        <q-btn flat :label="$t('btn.cancel')" @click="discardSession" />
        <q-btn flat :label="$t('aiChat.send')" color="primary" :disable="!canSend" :loading="loading" @click="sendMessage" />
        <q-btn
        unelevated
        :label="isFieldMode ? $t('aiChat.applyField') : $t('aiChat.apply')"
        color="primary"
        :disable="!conversation.latestDraft || loading"
        @click="applyDraft"
        />
      </q-card-actions>
    </div>
  </q-drawer>
</template>

<script>
import { Dialog } from 'quasar'
import { mapState, mapActions } from 'pinia'
import { useAiGenerationStore } from '@/stores/ai-generation'
import { useAuditQaStore } from '@/stores/audit-qa'
import AiService from '@/services/ai'
import Utils from '@/services/utils'
import { $t } from '@/boot/i18n'

const AI_DRAWER_WIDTH_DESKTOP = 480

export default {
  name: 'AiChatDrawer',

  computed: {
    ...mapState(useAiGenerationStore, {
      drawerOpen: 'drawerOpen',
      sessionConfig: 'sessionConfig',
      sessionId: 'sessionId',
      loading: 'loading',
      conversation: 'conversation'
    }),

    drawerWidth() {
      return this.$q.screen.gt.md ? AI_DRAWER_WIDTH_DESKTOP : Math.min(this.$q.screen.width - 24, AI_DRAWER_WIDTH_DESKTOP)
    },

    isFieldMode() {
      return !String(this.sessionConfig?.selectedText || '').trim()
    },

    canSend() {
      return !this.loading && !!String(this.conversation.userInput || '').trim()
    }
  },

  watch: {
    drawerOpen: {
      immediate: true,
      handler(value) {
        if (value)
          useAuditQaStore().close()
        this.syncLayoutInset()
      }
    },

    drawerWidth() {
      this.syncLayoutInset()
    },

    'conversation.messages.length'() {
      this.scrollMessagesToBottom()
    },

    loading(value) {
      if (!value)
        this.scrollMessagesToBottom()
    }
  },

  mounted() {
    window.addEventListener('resize', this.syncLayoutInset)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.syncLayoutInset)
    useAiGenerationStore().setLayoutRightInset(0)
  },

  methods: {
    ...mapActions(useAiGenerationStore, {
      setStoreLoading: 'setLoading',
      setLayoutRightInset: 'setLayoutRightInset',
      completeSession: 'completeSession',
      cancelSession: 'cancelSession',
      closeDrawer: 'closeDrawer'
    }),

    syncLayoutInset() {
      this.setLayoutRightInset(this.drawerOpen ? this.drawerWidth : 0)
    },

    scrollMessagesToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container)
          container.scrollTop = container.scrollHeight
      })
    },

    formatDraftPreview(draft) {
      const outputType = this.sessionConfig?.outputType || 'html'

      if (outputType === 'array') {
        const entries = Array.isArray(draft) ? draft : String(draft || '').split('\n')
        return entries
          .map((line) => String(line || '').trim())
          .filter(Boolean)
          .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
          .join('<br/>')
      }

      if (outputType === 'html')
        return Utils.htmlEncode(String(draft || ''))

      return String(draft || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    },

    async sendMessage() {
      const store = useAiGenerationStore()
      const prompt = String(store.conversation.userInput || '').trim()
      if (!prompt || this.loading || !this.sessionConfig)
        return

      store.conversation.messages.push({ role: 'user', content: prompt })
      store.conversation.userInput = ''
      this.setStoreLoading(true)

      try {
        const context = { ...(this.sessionConfig.requestParams.context || {}) }
        if (this.isFieldMode) {
          delete context.selectedText
          delete context.selectedHtml
        }

        if (this.isFieldMode && !store.conversation.confirmedPromptInstruction)
          store.conversation.confirmedPromptInstruction = prompt

        const payload = {
          ...this.sessionConfig.requestParams,
          context,
          messages: store.conversation.messages
            .filter((message) => message.role === 'user' || message.role === 'assistant')
            .slice(0, -1)
            .map((message) => ({
              role: message.role,
              content: message.content
            }))
        }

        if (this.isFieldMode) {
          payload.promptInstruction = store.conversation.confirmedPromptInstruction
          payload.userPrompt = store.conversation.messages.length > 1 ? prompt : ''
        } else {
          payload.userPrompt = prompt
        }

        const response = await AiService.generateFieldDraft(payload)

        const draft = response.data?.datas?.draft
        const reply = String(response.data?.datas?.reply || '').trim()
        if (draft === null || draft === undefined || (typeof draft === 'string' && !draft.trim()) || (Array.isArray(draft) && draft.length === 0))
          throw new Error(this.$t('aiChat.emptyDraft'))

        store.conversation.latestDraft = draft
        store.conversation.messages.push({
          role: 'assistant',
          content: reply || this.$t('aiChat.updatedDraft'),
          draftPreview: this.formatDraftPreview(draft)
        })
      } catch (err) {
        store.conversation.messages.pop()
        store.conversation.userInput = prompt
        this.$q.notify({
          message: err.response?.data?.datas || err.message || this.$t('aiChat.requestFailed'),
          color: 'negative',
          textColor: 'white',
          position: 'top-right'
        })
      } finally {
        this.setStoreLoading(false)
      }
    },

    applyDraft() {
      if (!this.conversation.latestDraft)
        return
      this.completeSession(this.conversation.latestDraft)
    },

    discardSession() {
      if (this.loading) {
        this.requestClose()
        return
      }

      Dialog.create({
        title: $t('aiChat.discardAiSessionTitle'),
        message: $t('aiChat.discardAiSessionMessage'),
        ok: { label: $t('btn.discard'), color: 'negative' },
        cancel: { label: $t('btn.stay'), color: 'white' },
        focus: 'cancel'
      })
      .onOk(() => {
        this.cancelSession({ force: true })
      })
    },

    requestClose() {
      if (this.loading) {
        Dialog.create({
          title: $t('aiChat.leaveWhileGeneratingTitle'),
          message: $t('aiChat.closeWhileGeneratingMessage'),
          ok: { label: $t('btn.close'), color: 'negative' },
          cancel: { label: $t('btn.stay'), color: 'white' },
          focus: 'cancel'
        })
        .onOk(() => {
          this.cancelSession({ force: true })
        })
        return
      }

      this.closeDrawer()
    },

    onDrawerOpenChange(value) {
      if (value) {
        useAiGenerationStore().drawerOpen = true
        return
      }

      if (this.sessionConfig)
        this.requestClose()
    }
  }
}
</script>

<style scoped>
.ai-chat-drawer__panel {
  min-width: 0;
  height: 100%;
}

.ai-chat-context {
  border: 1px solid #d7d7d7;
  border-radius: 4px;
  padding: 8px;
  white-space: pre-wrap;
  background: #fafafa;
}

.ai-chat-conversation {
  min-height: 0;
  overflow-y: auto;
}

.ai-chat-draft-preview {
  word-break: break-word;
}
</style>
