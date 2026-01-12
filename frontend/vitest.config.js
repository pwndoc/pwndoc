import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    vue()
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/quasar.config.js',
        'src/boot/**',
        'src/router/**',
        'src/i18n/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'src': path.resolve(__dirname, './src'),
      'components': path.resolve(__dirname, './src/components'),
      'layouts': path.resolve(__dirname, './src/layouts'),
      'pages': path.resolve(__dirname, './src/pages'),
      'assets': path.resolve(__dirname, './src/assets'),
      'boot': path.resolve(__dirname, './src/boot'),
      'stores': path.resolve(__dirname, './src/stores'),
      '#q-app/wrappers': path.resolve(__dirname, './node_modules/@quasar/app-webpack/exports/wrappers/wrappers.mjs'),
      // Force Quasar to use client build for testing
      'quasar': path.resolve(__dirname, './node_modules/quasar/dist/quasar.client.js')
    }
  }
})
