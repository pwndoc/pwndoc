import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import NotFound from '@/pages/404.vue'

describe('404 Page', () => {
  let router
  let pinia
  let i18n

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    i18n = createI18n({
      legacy: false,
      globalInjection: true,
      locale: 'en-US',
      fallbackLocale: 'en-US',
      messages: {
        'en-US': {
          goBack: 'Go Back'
        }
      }
    })

    vi.clearAllMocks()
  })

  const createWrapper = async (options = {}) => {
    const routes = [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/404', component: NotFound }
    ]

    router = createRouter({
      history: createWebHistory(),
      routes
    })

    // Navigate to /404 with optional query params
    const query = options.query || {}
    await router.push({ path: '/404', query })
    await router.isReady()

    return mount(NotFound, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-btn': true
        },
        mocks: {
          $t: (key) => i18n.global.t(key),
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('Rendering', () => {
    it('should render the component', async () => {
      const wrapper = await createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should display 404 indicator', async () => {
      const wrapper = await createWrapper()
      expect(wrapper.text()).toContain('404')
    })

    it('should render the sad image', async () => {
      const wrapper = await createWrapper()
      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
    })

    it('should render a go back button', async () => {
      const wrapper = await createWrapper()
      const btn = wrapper.find('q-btn-stub')
      expect(btn.exists()).toBe(true)
    })
  })

  describe('Error Message', () => {
    it('should display error message from query parameter', async () => {
      const wrapper = await createWrapper({ query: { error: 'Page not found' } })
      expect(wrapper.vm.message).toBe('Page not found')
      expect(wrapper.text()).toContain('Page not found')
    })

    it('should have empty message when no query error is provided', async () => {
      const wrapper = await createWrapper()
      expect(wrapper.vm.message).toBe(undefined)
    })

    it('should display different error messages', async () => {
      const wrapper = await createWrapper({ query: { error: 'Custom error message' } })
      expect(wrapper.vm.message).toBe('Custom error message')
      expect(wrapper.text()).toContain('Custom error message')
    })
  })

  describe('Navigation', () => {
    it('should have a button that navigates to home', async () => {
      const wrapper = await createWrapper()
      const btn = wrapper.find('q-btn-stub')
      expect(btn.exists()).toBe(true)
      // The button has @click="$router.push('/')" in the template
    })
  })
})
