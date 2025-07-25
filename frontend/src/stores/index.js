import { defineStore } from '#q-app/wrappers'
import { createPinia } from 'pinia'

export default defineStore(() => {
  const pinia = createPinia()

  return pinia
})