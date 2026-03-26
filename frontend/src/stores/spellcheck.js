import { defineStore } from 'pinia'

export const ALL_CATEGORIES = [
  { id: 'CASING' },
  { id: 'COMPOUNDING' },
  { id: 'GRAMMAR' },
  { id: 'TYPOS' },
  { id: 'PUNCTUATION' },
  { id: 'TYPOGRAPHY' },
  { id: 'CONFUSED_WORDS' },
  { id: 'REPETITIONS' },
  { id: 'REDUNDANCY' },
  { id: 'STYLE' },
  { id: 'SEMANTICS' },
  { id: 'COLLOQUIALISMS' },
  { id: 'MISC' },
]

const STORAGE_KEY_ENABLED = 'spellcheckEnabled'
const STORAGE_KEY_DISABLED_CATS = 'spellcheckDisabledCategories'

export const useSpellcheckStore = defineStore('spellcheck', {
  state: () => ({
    enabled: null,
    disabledCategories: [],
  }),

  getters: {
    isActive: (state) => (globalEnabled) => {
      if (!globalEnabled) return false
      if (state.enabled === null) return globalEnabled
      return state.enabled
    },

    disabledCategoriesString: (state) => {
      return state.disabledCategories.join(',')
    },

    isCategoryEnabled: (state) => (categoryId) => {
      return !state.disabledCategories.includes(categoryId)
    },
  },

  actions: {
    loadFromStorage() {
      const stored = localStorage.getItem(STORAGE_KEY_ENABLED)
      if (stored === 'true') this.enabled = true
      else if (stored === 'false') this.enabled = false
      else this.enabled = null

      const cats = localStorage.getItem(STORAGE_KEY_DISABLED_CATS)
      this.disabledCategories = cats ? cats.split(',').filter(Boolean) : []

    },

    saveToStorage() {
      if (this.enabled === null) localStorage.removeItem(STORAGE_KEY_ENABLED)
      else localStorage.setItem(STORAGE_KEY_ENABLED, String(this.enabled))

      if (this.disabledCategories.length === 0) localStorage.removeItem(STORAGE_KEY_DISABLED_CATS)
      else localStorage.setItem(STORAGE_KEY_DISABLED_CATS, this.disabledCategories.join(','))
    },

    setEnabled(value) {
      this.enabled = value
      this.saveToStorage()
    },

    toggleCategory(categoryId) {
      const idx = this.disabledCategories.indexOf(categoryId)
      if (idx === -1) this.disabledCategories.push(categoryId)
      else this.disabledCategories.splice(idx, 1)
      this.saveToStorage()
    },
  },
})
