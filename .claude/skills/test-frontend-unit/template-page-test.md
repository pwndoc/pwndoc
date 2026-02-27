# Page Test Template

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import PageComponent from '@/pages/{path}/index.vue'

// Mock services used by the page
vi.mock('@/services/{name}', () => ({
  default: {
    // Mock all methods the page calls
  }
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Loading: { show: vi.fn(), hide: vi.fn() },
    Notify: { create: vi.fn() }
  }
})

describe('{Page} Page', () => {
  let router, pinia, i18n

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/{route}', component: PageComponent }]
    })
    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: { 'en-US': {} }
    })
    vi.clearAllMocks()
  })

  const createWrapper = (options = {}) => {
    return mount(PageComponent, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-page': true,
          'q-card': true,
          'q-card-section': true,
          'q-input': true,
          'q-btn': true,
          'q-table': true,
          'q-dialog': true,
          'q-select': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $settings: {},
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('initialization', () => {
    it('should load data on mount', async () => {
      // Mock service to return data
      // Create wrapper
      // Assert service was called
    })
  })

  describe('CRUD operations', () => {
    // Test create, read, update, delete flows
  })

  describe('error handling', () => {
    // Test API error responses
  })
})
```

## Notes

- Pages often have a companion `.js` file with the script logic. Read BOTH files.
- Mock all services the page imports.
- Stub Quasar components that cause rendering issues.
- Test lifecycle (mount behavior), user interactions, and error paths.
