---
name: test-frontend-unit
description: >
  Generates frontend unit tests for PwnDoc using Vitest and Vue Test Utils.
  Handles services (axios mock), components (mount with Quasar), pages (full setup),
  and Pinia stores. Run with ./pwndoc-cli test --frontend-unit.
context: fork
agent: general-purpose
allowed-tools:
  - Bash
  - Glob
  - Grep
  - Read
  - Write
  - Edit
argument-hint: "[type:name] e.g. service:audit, component:breadcrumb, page:profile, store:index"
---

# Frontend Unit Test Generator

You generate frontend unit tests for PwnDoc using Vitest + Vue Test Utils + Quasar.

## Arguments

`$ARGUMENTS` - Format: `{type}:{name}` where type is one of: `service`, `component`, `page`, `store`.

Examples:
- `service:audit` - test `frontend/src/services/audit.js`
- `component:breadcrumb` - test `frontend/src/components/breadcrumb.vue`
- `page:profile` - test pages in `frontend/src/pages/profile/`
- `store:index` - test `frontend/src/stores/index.js`

If `$ARGUMENTS` is "all" or "gaps", scan for all untested files and generate tests for each.

### Fix Mode

If `$ARGUMENTS` starts with `--fix`, the format is:

```
--fix {test-file} "{failure summary}" [--no-run]
```

Example: `--fix frontend/tests/unit/services/audit.test.js "TypeError: Cannot read properties of undefined (reading 'get')" --no-run`

In fix mode:
1. Read the failing test file specified in the argument
2. Read the source file being tested (derive from the test file path)
3. Read the matching reference test for that type (same as generation mode)
4. Analyze the failure message — determine if the bug is in the test or in the test's assumptions about the source
5. Fix the test file using the Edit tool
6. If `--no-run` is present, **STOP** — do not run tests. Otherwise proceed to Step 3 (Run and Fix)

## Step 1: Read Source and Reference Files

Before writing any tests, ALWAYS read:

1. **The source file** being tested
2. **The matching reference test** for the type (see Reference Tests below)
3. **Test utilities**: `frontend/tests/unit/utils/test-utils.js` and `frontend/tests/unit/setup.js`

### Reference Tests (read the one matching your type)
- Service: `frontend/tests/unit/services/user.test.js`
- Component: `frontend/tests/unit/components/audit-state-icon.test.js`
- Page: `frontend/tests/unit/pages/login.test.js`
- Store: `frontend/tests/unit/stores/user.test.js`

## Step 2: Generate the Test File

### Output Locations

- Services: `frontend/tests/unit/services/{name}.test.js`
- Components: `frontend/tests/unit/components/{name}.test.js`
- Pages: `frontend/tests/unit/pages/{name}.test.js`
- Stores: `frontend/tests/unit/stores/{name}.test.js`

---

## Pattern: Service Tests

Service tests mock `boot/axios` and verify each method calls the correct API endpoint.

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock axios BEFORE importing the service
vi.mock('boot/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

import { api } from 'boot/axios'
import ServiceUnderTest from '@/services/{name}'

describe('{Name}Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('{methodName}', () => {
    it('should call the correct API endpoint', async () => {
      const mockResponse = { data: { datas: [/* mock data */] } }
      api.get.mockResolvedValue(mockResponse)

      const result = await ServiceUnderTest.{methodName}()

      expect(api.get).toHaveBeenCalledWith('{endpoint}')
      expect(result).toEqual(mockResponse)
    })
  })
  // One describe block per public method
})
```

### Service test conventions:
- Import `vi` from vitest, NOT from jest
- `vi.mock('boot/axios', ...)` BEFORE importing the service
- Each public method gets its own `describe` block
- Test both success and error paths
- For methods with parameters, verify params are forwarded correctly
- Services return the raw axios response (not unwrapped)
- For services using `document` (like backup.downloadBackup), add DOM mocks
- If the service uses a Pinia store, use the `vi.doMock` + `vi.resetModules` pattern from `services/user.test.js`

See [template-service-test.md](template-service-test.md) for a complete scaffold.

---

## Pattern: Component Tests

Component tests use `createTestWrapper` from test-utils:

```javascript
import { describe, it, expect } from 'vitest'
import { createTestWrapper } from '../utils/test-utils'
import MyComponent from '@/components/{name}.vue'

describe('{Name} Component', () => {
  const defaultProps = { /* required props */ }

  const createWrapper = (overrides = {}) => {
    return createTestWrapper(MyComponent, {
      props: { ...defaultProps, ...overrides.props },
      global: {
        mocks: {
          $settings: { /* mock settings if needed */ },
          ...(overrides.mocks || {})
        }
      }
    })
  }

  it('should render', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  // Test computed properties via wrapper.vm.{prop}
  // Test emitted events via wrapper.emitted()
  // Test rendered content via wrapper.text() or wrapper.find()
})
```

### Component test conventions:
- Use `createTestWrapper` for components needing Pinia/i18n/router
- Mock `$settings` if the component accesses it
- Stub heavy child components if they have complex dependencies
- Test: rendering, props, computed properties, emitted events, rendered output

See [template-component-test.md](template-component-test.md) for a complete scaffold.

---

## Pattern: Page Tests

Pages are more complex — they interact with services and have routing:

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
    methodA: vi.fn(),
    methodB: vi.fn()
  }
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Loading: { show: vi.fn(), hide: vi.fn() }
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
          'q-page': true, 'q-card': true, 'q-card-section': true,
          'q-input': true, 'q-btn': true, 'q-table': true,
          'q-dialog': true, 'q-select': true,
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

  // Test initialization, data loading, form validation, user actions, errors
})
```

### Page test conventions:
- Pages may have a companion `.js` file (e.g., `pages/audits/list/audits-list.js` + `index.vue`). Read BOTH.
- Mock ALL services the page imports
- Stub Quasar components that cause issues
- Test lifecycle: what happens on mount, what data is loaded
- Test user interactions: form submissions, button clicks
- Test error handling paths

See [template-page-test.md](template-page-test.md) for a complete scaffold.

---

## Pattern: Store Tests

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMyStore } from '@/stores/{name}'

describe('{Name} Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('should have default values', () => {
      const store = useMyStore()
      // Assert all initial state values
    })
  })

  describe('actions', () => {
    // Test each action
  })

  describe('getters', () => {
    // Test each getter
  })
})
```

See [template-store-test.md](template-store-test.md) for a complete scaffold.

---

## Important Global Notes

- Quasar is registered globally via `setup.js`. Do NOT re-register it in individual tests.
- Use `vi.mock()` at the top level, before imports of modules that depend on the mock.
- Path aliases: `@/` = `src/`, `boot/` = `src/boot/`, `stores/` = `src/stores/`
- Do NOT import from `@quasar/quasar-app-extension-testing-unit-vitest` — Quasar is set up in `setup.js`
- For services depending on stores, use the `vi.doMock` + `vi.resetModules` pattern from `services/user.test.js`

## Step 3: Run and Fix

If `$ARGUMENTS` contains `--no-run`, **STOP HERE**. Do not run tests — the calling orchestrator will handle test execution. Strip `--no-run` from arguments before processing the type:name in earlier steps.

Otherwise, run tests with:
```bash
./pwndoc-cli test --frontend-unit
```

If tests fail, read the error output, fix the test file, and re-run. Iterate until all tests pass.
