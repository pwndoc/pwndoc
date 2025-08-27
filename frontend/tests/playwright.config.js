// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  // workers: 3,
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

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'init-user',
      testMatch: ['**/init-user.setup.js']
    },

    {
      name: 'auth-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/auth.setup.js'],
      dependencies: ['init-user'],
    },
    {
      name: 'auth-firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: ['**/auth.setup.js'],
      dependencies: ['init-user'],
    },
    {
      name: 'auth-webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: ['**/auth.setup.js'],
      dependencies: ['init-user'],
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/storageState.chromium.json'},
      testMatch: ['**/*.spec.js'],
      dependencies: ['auth-chromium']
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'e2e/storageState.firefox.json'},
      testMatch: ['**/*.spec.js'],
      dependencies: ['auth-firefox']
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: 'e2e/storageState.webkit.json'},
      testMatch: ['**/*.spec.js'],
      dependencies: ['auth-webkit']
    },
    // {
    //   name: 'chromium-no-auth',
    //   testMatch: '**/login.spec.js',
    //   use: { ...devices['Desktop Chrome']}
    // },
    // {
    //   name: 'firefox-no-auth',
    //   testMatch: '**/login.spec.js',
    //   use: { ...devices['Desktop Firefox']}
    // },
    // {
    //   name: 'webkit-no-auth',
    //   testMatch: '**/login.spec.js',
    //   use: { ...devices['Desktop Safari']}
    // }

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ]
});

