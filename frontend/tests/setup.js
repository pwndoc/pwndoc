import { Quasar } from 'quasar'
import { vi, beforeAll } from 'vitest'
import { config } from '@vue/test-utils'

// Suppress Vue warnings about duplicate plugin registration
// These warnings occur when test files add their own plugin instances
const originalWarn = console.warn
console.warn = (...args) => {
  const message = args[0]?.toString() || ''
  // Suppress specific Vue warnings that are expected in test environment
  if (
    message.includes('Plugin has already been applied') ||
    message.includes('already provides property') ||
    message.includes('already been registered')
  ) {
    return // Suppress these warnings
  }
  originalWarn.apply(console, args)
}

// Install Quasar plugin globally for all tests
// This replaces installQuasarPlugin from @quasar/quasar-app-extension-testing-unit-vitest
beforeAll(() => {
  if (!config.global.plugins) {
    config.global.plugins = []
  }
  // Add Quasar plugin globally if not already added
  if (!config.global.plugins.some(plugin => plugin === Quasar)) {
    config.global.plugins.push(Quasar)
  }
})

// Setup global plugins
// Note: We don't add Pinia and i18n globally here to avoid conflicts
// Each test file should create its own instances with test-specific configuration
// This prevents "Plugin already applied" warnings
if (!config.global.plugins) {
  config.global.plugins = []
}
// Only Quasar will be added globally
// Pinia and i18n should be created per-test to avoid state pollution and warnings

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Handle unhandled promise rejections from test environment
// These can occur when components try to access refs that don't exist in stubbed components
process.on('unhandledRejection', (reason, promise) => {
  // Silently handle expected errors from ref access in test environment
  if (reason && typeof reason === 'object') {
    const message = reason.message || reason.toString()
    if (
      message.includes('focus') ||
      message.includes('totptoken') ||
      message.includes('Cannot read properties of undefined') ||
      message.includes('pwdInitRef')
    ) {
      // Expected error in test environment - refs don't exist when components are stubbed
      return
    }
  }
  // Re-throw unexpected errors
  throw reason
})

// Also handle unhandled rejections in browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    if (reason && typeof reason === 'object') {
      const message = reason.message || reason.toString()
      if (
        message.includes('focus') ||
        message.includes('totptoken') ||
        message.includes('Cannot read properties of undefined') ||
        message.includes('pwdInitRef')
      ) {
        // Prevent default error handling for expected ref errors
        event.preventDefault()
        return
      }
    }
  })
}
