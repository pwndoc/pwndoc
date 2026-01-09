import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createWebHistory } from 'vue-router'

/**
 * Helper function to create a test wrapper with Quasar, Pinia, and i18n
 */
export function createTestWrapper(component, options = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createWebHistory(),
    routes: options.routes || []
  })

  const i18n = createI18n({
    legacy: false,
    locale: options.locale || 'en-US',
    fallbackLocale: 'en-US',
    messages: options.messages || {
      'en-US': {}
    }
  })

  // Use global plugins from config (set up in setup.js and installQuasarPlugin)
  // Only add instance-specific plugins that aren't already global
  const defaultOptions = {
    global: {
      plugins: [
        pinia,
        router,
        i18n
      ],
      stubs: {
        'router-link': true,
        'router-view': true
      }
    }
  }

  // Merge options - plugins will be merged with global plugins
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    global: {
      ...defaultOptions.global,
      ...(options.global || {}),
      plugins: [
        ...defaultOptions.global.plugins,
        ...(options.global?.plugins || [])
      ],
      stubs: {
        ...defaultOptions.global.stubs,
        ...(options.global?.stubs || {})
      },
      mocks: {
        ...(options.global?.mocks || {})
      }
    }
  }

  return mount(component, mergedOptions)
}

/**
 * Helper to wait for next tick
 */
export function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0))
}
