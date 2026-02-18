import { test, expect } from './base.js';

/**
 * Keyboard shortcut (Ctrl+S) tests.
 *
 * These tests cover the separate code path used when saving via keyboard
 * rather than the Save button — a regression in one does not catch the other.
 *
 * Sections and findings are resolved from the API on every run so the tests
 * remain independent of the order in which audit-edit creates data.
 */

let auditId;
let findingId;
let sectionId;

test.describe('Keyboard Shortcuts (Ctrl+S)', () => {
  test.beforeAll(async ({ request }) => {
    // Resolve the audit created by audit-edit.spec.js
    const auditsRes = await request.get('/api/audits');
    const auditsData = await auditsRes.json();
    const audit = auditsData.datas.find(a => a.name === 'E2E Test Audit');
    auditId = audit._id;

    // Resolve finding and section IDs from the audit detail
    const detailRes = await request.get(`/api/audits/${auditId}`);
    const detail = await detailRes.json();
    findingId = detail.datas.findings[0]?._id;
    sectionId = detail.datas.sections[0]?._id;
  });

  test('Ctrl+S saves audit general information', async ({ page }) => {
    await page.goto(`/audits/${auditId}/general`);
    await page.waitForResponse(r =>
      r.url().includes(`/api/audits/${auditId}/general`) && r.status() === 200
    );

    await page.getByLabel(/Name/).first().type(' kb');
    const saveResponse = page.waitForResponse(r =>
      r.request().method() === 'PUT' &&
      r.url().includes(`/api/audits/${auditId}/general`) &&
      r.status() === 200
    );
    await page.keyboard.press('Control+s');
    await saveResponse;
  });

  test('Ctrl+S saves a finding', async ({ page }) => {
    test.skip(!findingId, 'No finding exists in the E2E audit');

    await page.goto(`/audits/${auditId}/findings/${findingId}`);
    await page.waitForResponse(r =>
      r.url().includes(`/api/audits/${auditId}/findings/${findingId}`) && r.status() === 200
    );

    await page.getByLabel('Title').first().type(' kb');
    const saveResponse = page.waitForResponse(r =>
      r.request().method() === 'PUT' &&
      r.url().includes(`/api/audits/${auditId}/findings/${findingId}`) &&
      r.status() === 200
    );
    await page.keyboard.press('Control+s');
    await saveResponse;
  });

  test('Ctrl+S saves a custom section', async ({ page }) => {
    test.skip(!sectionId, 'No section exists in the E2E audit');

    await page.goto(`/audits/${auditId}/sections/${sectionId}`);
    await page.waitForResponse(r =>
      r.url().includes(`/api/audits/${auditId}/sections/${sectionId}`) && r.status() === 200
    );

    const editor = page.locator('.ProseMirror').first();
    await editor.click();
    await page.keyboard.type(' kb');
    const saveResponse = page.waitForResponse(r =>
      r.request().method() === 'PUT' &&
      r.url().includes(`/api/audits/${auditId}/sections/${sectionId}`) &&
      r.status() === 200
    );
    await page.keyboard.press('Control+s');
    await saveResponse;
  });

  test('Ctrl+S saves network scan data', async ({ page }) => {
    await page.goto(`/audits/${auditId}/network`);
    await page.waitForResponse(r =>
      r.url().includes(`/api/audits/${auditId}/network`) && r.status() === 200
    );

    const saveButton = page.getByRole('button', { name: /ctrl\+s/i });
    test.skip((await saveButton.count()) === 0, 'Network page is read-only for this audit state');

    const saveResponse = page.waitForResponse(r =>
      r.request().method() === 'PUT' &&
      r.url().includes(`/api/audits/${auditId}/network`)
    );
    await page.locator('body').click();
    await page.keyboard.press('Control+s');
    expect((await saveResponse).status()).toBe(200);
  });
});
