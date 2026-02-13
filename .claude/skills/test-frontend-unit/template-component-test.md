# Component Test Template

```javascript
import { describe, it, expect } from 'vitest'
import { createTestWrapper } from '../utils/test-utils'
import ComponentName from '@/components/{name}.vue'

describe('{ComponentName} Component', () => {
  const defaultProps = {
    // Required props with sensible defaults
  }

  const createWrapper = (overrides = {}) => {
    return createTestWrapper(ComponentName, {
      props: { ...defaultProps, ...(overrides.props || {}) },
      global: {
        mocks: {
          $settings: { /* if needed */ },
          ...(overrides.mocks || {})
        },
        stubs: {
          ...(overrides.stubs || {})
        }
      }
    })
  }

  describe('rendering', () => {
    it('should render successfully', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should display correct content based on props', () => {
      const wrapper = createWrapper({ props: { /* specific props */ } })
      expect(wrapper.text()).toContain('expected text')
    })
  })

  describe('computed properties', () => {
    it('should compute {property} correctly', () => {
      const wrapper = createWrapper({ props: { /* props affecting computed */ } })
      expect(wrapper.vm.{computedProp}).toBe(/* expected */)
    })
  })

  describe('events', () => {
    it('should emit {event} when {action}', async () => {
      const wrapper = createWrapper()
      await wrapper.find('{selector}').trigger('click')
      expect(wrapper.emitted('{event}')).toBeTruthy()
    })
  })
})
```
