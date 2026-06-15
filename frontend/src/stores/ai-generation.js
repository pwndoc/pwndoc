import { defineStore } from 'pinia'

const emptyConversation = () => ({
  messages: [],
  userInput: '',
  latestDraft: null,
  confirmedPromptInstruction: ''
})

export const useAiGenerationStore = defineStore('aiGeneration', {
  state: () => ({
    drawerOpen: false,
    loading: false,
    lockKey: null,
    sessionConfig: null,
    sessionId: 0,
    conversation: emptyConversation(),
    layoutRightInset: 0,
    _resolve: null,
    _reject: null
  }),

  getters: {
    isActive(state) {
      return Boolean(state.sessionConfig)
    },

    isGenerating(state) {
      return state.loading
    },

    isFieldGenerating(state) {
      return (lockKey) => {
        if (!lockKey || !state.sessionConfig)
          return false
        return state.loading && state.lockKey === lockKey
      }
    },

    isFieldLocked(state) {
      return (lockKey) => {
        if (!lockKey || !state.sessionConfig || !state.drawerOpen)
          return false
        return state.lockKey === lockKey
      }
    }
  },

  actions: {
    clearConversation() {
      this.conversation = emptyConversation()
    },

    closeDrawer() {
      if (this.loading) {
        this.drawerOpen = false
        return
      }

      if (!this.sessionConfig) {
        this.drawerOpen = false
        return
      }

      if (this._reject)
        this._reject(new Error('cancelled'))
      this.endSession()
    },

    openSession(config = {}) {
      const lockKey = config.lockKey || null

      if (this.sessionConfig) {
        if (this._reject)
          this._reject(new Error('cancelled'))
        this._resolve = null
        this._reject = null
      }

      return new Promise((resolve, reject) => {
        this._resolve = resolve
        this._reject = reject
        this.lockKey = lockKey
        this.sessionConfig = {
          title: config.title,
          selectedText: config.selectedText || '',
          defaultPrompt: config.defaultPrompt || '',
          outputType: config.outputType || 'html',
          requestParams: config.requestParams || {}
        }
        this.loading = false
        this.clearConversation()

        const isFieldMode = !String(config.selectedText || '').trim()
        if (isFieldMode)
          this.conversation.userInput = String(config.defaultPrompt || '')

        this.sessionId += 1
        this.drawerOpen = true
      })
    },

    setLoading(loading) {
      this.loading = Boolean(loading)
    },

    setLayoutRightInset(px) {
      const inset = Number(px) || 0
      this.layoutRightInset = inset > 0 ? inset : 0
      document.documentElement.style.setProperty('--layout-right-inset', `${this.layoutRightInset}px`)
    },

    completeSession(draft) {
      if (this._resolve)
        this._resolve(draft)
      this.endSession()
    },

    cancelSession({ force = false } = {}) {
      if (this.loading && !force)
        return false

      if (this._reject)
        this._reject(new Error('cancelled'))
      this.endSession()
      return true
    },

    endSession() {
      this.drawerOpen = false
      this.loading = false
      this.lockKey = null
      this.sessionConfig = null
      this.clearConversation()
      this._resolve = null
      this._reject = null
      this.setLayoutRightInset(0)
    }
  }
})
