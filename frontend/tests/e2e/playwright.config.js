// @ts-check
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * @see https://playwright.dev/docs/test-configuration
 */

const uiChromiumOnly = process.env.PW_UI_CHROMIUM_ONLY === '1';
const artifactsRoot = process.env.PW_ARTIFACTS_DIR || '/tmp/pw';

function browserChain(browser, browserDevices, prevChainLast) {
  const storageState = path.join(__dirname, `storageState.${browser}.json`);
  const use = { ...browserDevices };
  const useWithAuth = { ...browserDevices, storageState };

  const deps = (name) => [name];
  const prefix = (name) => `${name}-${browser}`;

  return [
    {
      name: prefix('reset'),
      use,
      testMatch: ['**/reset.setup.js'],
      ...(prevChainLast ? { dependencies: [prevChainLast] } : {}),
    },
    {
      name: prefix('init-user'),
      use,
      testMatch: ['**/init-user.setup.js'],
      dependencies: deps(prefix('reset')),
    },
    {
      name: prefix('auth'),
      use,
      testMatch: ['**/auth.setup.js'],
      dependencies: deps(prefix('init-user')),
    },
    // Step 1: Audits list on empty DB (verify missing data warnings)
    {
      name: prefix('audits-list-empty'),
      use: useWithAuth,
      testMatch: ['**/audits-list.spec.js'],
      dependencies: deps(prefix('auth')),
    },
    // Step 2: Set up base data (languages, vuln types, categories, sections, audit types)
    {
      name: prefix('data-setup'),
      use: useWithAuth,
      testMatch: ['**/data-setup.spec.js'],
      dependencies: deps(prefix('audits-list-empty')),
    },
    // Step 3: Vulnerabilities CRUD (uses languages from data-setup)
    {
      name: prefix('vulnerabilities'),
      use: useWithAuth,
      testMatch: ['**/vulnerabilities.spec.js'],
      dependencies: deps(prefix('data-setup')),
    },
    // Step 4: Audit editing (uses shared data from data-setup)
    {
      name: prefix('audit-edit'),
      use: useWithAuth,
      testMatch: ['**/audit-edit.spec.js'],
      dependencies: deps(prefix('vulnerabilities')),
    },
    // Step 5a-i: Edge-case tests — fan out from audit-edit independently (no inter-deps)
    {
      name: prefix('keyboard-shortcuts'),
      use: useWithAuth,
      testMatch: ['**/keyboard-shortcuts.spec.js'],
      dependencies: deps(prefix('audit-edit')),
    },
    {
      name: prefix('double-click'),
      use: useWithAuth,
      testMatch: ['**/double-click.spec.js'],
      dependencies: deps(prefix('audit-edit')),
    },
    {
      name: prefix('finding-tabs'),
      use: useWithAuth,
      testMatch: ['**/finding-tabs.spec.js'],
      dependencies: deps(prefix('audit-edit')),
    },
    {
      name: prefix('unsaved-changes'),
      use: useWithAuth,
      testMatch: ['**/unsaved-changes.spec.js'],
      dependencies: deps(prefix('audit-edit')),
    },
    {
      name: prefix('report-generation'),
      use: useWithAuth,
      testMatch: ['**/report-generation.spec.js'],
      dependencies: deps(prefix('audit-edit')),
    },
    {
      name: prefix('sticky-toolbar'),
      use: useWithAuth,
      testMatch: ['**/sticky-toolbar.spec.js'],
      dependencies: deps(prefix('audit-edit')),
    },
    {
      name: prefix('drag-drop'),
      use: useWithAuth,
      testMatch: ['**/drag-drop.spec.js'],
      dependencies: deps(prefix('audit-edit')),
    },
    // editor-images uses clipboard APIs — Chromium only for reliability
    ...(browser === 'chromium' ? [{
      name: prefix('editor-images'),
      use: useWithAuth,
      testMatch: ['**/editor-images.spec.js'],
      dependencies: deps(prefix('audit-edit')),
    }] : []),
    {
      name: prefix('vuln-merge'),
      use: useWithAuth,
      testMatch: ['**/vuln-merge.spec.js'],
      dependencies: deps(prefix('audit-edit')),
    },
    // Step 5j: settings-backup runs last among edge-case specs (restore is destructive)
    {
      name: prefix('settings-backup'),
      use: useWithAuth,
      testMatch: ['**/settings-backup.spec.js'],
      dependencies: [
        prefix('keyboard-shortcuts'),
        prefix('double-click'),
        prefix('finding-tabs'),
        prefix('unsaved-changes'),
        prefix('report-generation'),
        prefix('sticky-toolbar'),
        prefix('drag-drop'),
        ...(browser === 'chromium' ? [prefix('editor-images')] : []),
        prefix('vuln-merge'),
      ],
    },
    // Step 6: Audits list with data (verify audit appears, warnings gone)
    {
      name: prefix('audits-list-data'),
      use: useWithAuth,
      testMatch: ['**/audits-list-with-data.spec.js'],
      dependencies: deps(prefix('settings-backup')),
    },
  ];
}

export default defineConfig({
  testDir: './tests',
  outputDir: path.join(artifactsRoot, 'test-results'),
  /* Run tests sequentially within each project */
  fullyParallel: false,
  /* Single worker to prevent interleaving between projects */
  workers: 1,
  /* Stop on first failure — downstream tests will likely fail too */
  maxFailures: 1,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: path.join(artifactsRoot, 'playwright-report'), open: 'never' }],
    ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    ignoreHTTPSErrors: true,
    baseURL: process.env.BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  projects: [
    // === CHROMIUM ===
    ...browserChain('chromium', devices['Desktop Chrome'], null),

    ...(uiChromiumOnly ? [] : [
      // === FIREFOX (starts after chromium finishes) ===
      ...browserChain('firefox', devices['Desktop Firefox'], 'audits-list-data-chromium'),

      // === WEBKIT (starts after firefox finishes) ===
      ...browserChain('webkit', devices['Desktop Safari'], 'audits-list-data-firefox'),
    ]),
  ]
});
