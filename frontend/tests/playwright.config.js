// @ts-check
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * @see https://playwright.dev/docs/test-configuration
 */

function browserChain(browser, browserDevices, prevChainLast) {
  const storageState = path.join(__dirname, 'e2e', `storageState.${browser}.json`);
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
    // Step 5: Audits list with data (verify audit appears, warnings gone)
    {
      name: prefix('audits-list-data'),
      use: useWithAuth,
      testMatch: ['**/audits-list-with-data.spec.js'],
      dependencies: deps(prefix('audit-edit')),
    },
  ];
}

export default defineConfig({
  testDir: './e2e',
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
    ['html', {open: 'never'}],
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

    // === FIREFOX (starts after chromium finishes) ===
    ...browserChain('firefox', devices['Desktop Firefox'], 'audits-list-data-chromium'),

    // === WEBKIT (starts after firefox finishes) ===
    ...browserChain('webkit', devices['Desktop Safari'], 'audits-list-data-firefox'),
  ]
});
