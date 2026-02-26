import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import Page403 from '@/pages/403.vue'

describe('403 Page', () => {
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
    const routeQuery = options.query || {}

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/403', component: Page403 },
        { path: '/', component: { template: '<div>Home</div>' } }
      ]
    })

    // Navigate to the 403 page with the desired query params
    await router.push({ path: '/403', query: routeQuery })
    await router.isReady()

    return mount(Page403, {
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
    it('should render the page', async () => {
      const wrapper = await createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should display (403) text', async () => {
      const wrapper = await createWrapper()
      expect(wrapper.text()).toContain('(403)')
    })

    it('should render the sad image', async () => {
      const wrapper = await createWrapper()
      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
    })
  })

  describe('Error Message', () => {
    it('should display the error message from route query', async () => {
      const wrapper = await createWrapper({ query: { error: 'Access Denied' } })

      expect(wrapper.vm.message).toBe('Access Denied')
      expect(wrapper.text()).toContain('Access Denied')
    })

    it('should have empty message when no error query param', async () => {
      const wrapper = await createWrapper()

      expect(wrapper.vm.message).toBeUndefined()
    })

    it('should display different error messages based on query param', async () => {
      const wrapper = await createWrapper({ query: { error: 'Insufficient permissions' } })

      expect(wrapper.vm.message).toBe('Insufficient permissions')
      expect(wrapper.text()).toContain('Insufficient permissions')
    })
  })

  describe('Navigation', () => {
    it('should have a go back button', async () => {
      const wrapper = await createWrapper()
      const btn = wrapper.find('q-btn-stub')
      expect(btn.exists()).toBe(true)
    })

    it('should navigate to home when go back button is clicked', async () => {
      const mockPush = vi.fn()
      const wrapper = await createWrapper({
        mocks: {
          $router: { push: mockPush }
        }
      })

      const btn = wrapper.find('q-btn-stub')
      await btn.trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})
