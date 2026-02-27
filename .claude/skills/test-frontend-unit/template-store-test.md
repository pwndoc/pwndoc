# Store Test Template

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTargetStore } from '@/stores/{name}'

describe('{Name} Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('should have default values', () => {
      const store = useTargetStore()
      // expect(store.property).toBe(defaultValue) for each state property
    })
  })

  describe('actions', () => {
    describe('{actionName}', () => {
      it('should {expected behavior}', () => {
        const store = useTargetStore()
        store.{actionName}(/* args */)
        expect(store.{property}).toBe(/* expected */)
      })
    })
  })

  describe('getters', () => {
    describe('{getterName}', () => {
      it('should return {expected} when {condition}', () => {
        const store = useTargetStore()
        // Set up state
        expect(store.{getterName}).toBe(/* expected */)
      })
    })
  })
})
```
