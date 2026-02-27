import { test as base, expect } from '@playwright/test';
import path from 'path';

/**
 * Extended test that auto-saves storageState after each test.
 *
 * PwnDoc rotates refresh tokens on every use – the backend checks both
 * sessionId AND the exact token value.  Because each Playwright test
 * creates a fresh browser context from the on-disk storageState file,
 * the boot-time refreshToken() call issues a *new* token and
 * invalidates the old one.  Without persisting that new token back to
 * the file, the next test would load the now-stale token and get
 * redirected to /login.
 *
 * By saving the context's storageState in an automatic teardown we
 * keep the file in sync for the next test / project in the chain.
 */
export const test = base.extend({
  // Wrap the built-in `page` fixture so we can run teardown logic.
  page: async ({ page, browserName }, use) => {
    // Hand the page to the test as usual.
    await use(page);

    // After the test finishes, persist the (possibly refreshed) cookies.
    const stateFile = path.join(__dirname, '..', `storageState.${browserName}.json`);
    await page.context().storageState({ path: stateFile });
  },
});

export { expect };
