import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '../..')
const unitCoverageWorkDir = '/tmp/pwndoc-unit-coverage'

export const UNIT_COVERAGE_EXCLUDE = [
  'node_modules/',
  'tests/',
  '**/*.config.js',
  '**/quasar.config.js',
  'src/boot/**',
  'src/router/**',
  'src/i18n/**',
  // TipTap/ProseMirror extensions: require live EditorView + real browser DOM.
  // Unit-testing these is not meaningful. Behavior validated via E2E.
  'src/components/editor/**'
]

export const UNIT_COVERAGE_THRESHOLDS = {
  // Global catch-all: blocks regression on files outside explicit threshold groups.
  global: {
    statements: 46,
    lines: 48,
    functions: 25,
    branches: 35
  },
  // Service layer: pure API wrappers.
  'src/services/**': { statements: 90, lines: 90, functions: 90, branches: 80 },
  // Pinia stores.
  'src/stores/**': { statements: 90, lines: 90, functions: 90, branches: 90 },
  // Page business logic files.
  'src/pages/**/*.js': { statements: 75, lines: 75, functions: 75, branches: 60 },
  // Non-editor components.
  'src/components/*.vue': { statements: 29, lines: 28, functions: 14, branches: 22 },
  // Vue templates where most logic is in sibling .js files.
  'src/pages/**/*.vue': { statements: 10, lines: 10, functions: 5, branches: 10 }
}

export default defineConfig({
  root: frontendRoot,
  plugins: [
    vue()
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    fileParallelism: false,
    include: ['./tests/unit/tests/**/*.test.js'],
    setupFiles: ['./tests/unit/setup.js'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: unitCoverageWorkDir,
      exclude: UNIT_COVERAGE_EXCLUDE,
      thresholds: {
        ...UNIT_COVERAGE_THRESHOLDS.global,
        ...Object.fromEntries(
          Object.entries(UNIT_COVERAGE_THRESHOLDS).filter(([key]) => key !== 'global')
        )
      }
    }
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    alias: {
      '@': path.resolve(frontendRoot, './src'),
      'src': path.resolve(frontendRoot, './src'),
      'components': path.resolve(frontendRoot, './src/components'),
      'layouts': path.resolve(frontendRoot, './src/layouts'),
      'pages': path.resolve(frontendRoot, './src/pages'),
      'assets': path.resolve(frontendRoot, './src/assets'),
      'boot': path.resolve(frontendRoot, './src/boot'),
      'stores': path.resolve(frontendRoot, './src/stores'),
      '#q-app/wrappers': path.resolve(frontendRoot, './node_modules/@quasar/app-webpack/exports/wrappers/wrappers.mjs'),
      // Force Quasar to use client build for testing
      'quasar': path.resolve(frontendRoot, './node_modules/quasar/dist/quasar.client.js')
    }
  }
})
