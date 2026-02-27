import { describe, it, expect, vi } from 'vitest'

// Mock #q-app/wrappers to capture what defineStore receives
vi.mock('#q-app/wrappers', () => ({
  defineStore: vi.fn((fn) => fn)
}))

import createStore from '@/stores/index'

describe('Store Index', () => {
  it('should export a function (the store factory)', () => {
    expect(typeof createStore).toBe('function')
  })

  it('should return a Pinia instance when called', () => {
    const pinia = createStore()
    // Pinia instances have install method and use method
    expect(pinia).toBeDefined()
    expect(typeof pinia.install).toBe('function')
    expect(typeof pinia.use).toBe('function')
  })

  it('should return a Pinia instance with state property', () => {
    const pinia = createStore()
    expect(pinia.state).toBeDefined()
  })

  it('should create a new Pinia instance on each call', () => {
    const pinia1 = createStore()
    const pinia2 = createStore()
    expect(pinia1).not.toBe(pinia2)
  })
})
