import { test, expect } from './base.js';

/**
 * Keyboard shortcut (Ctrl+S) tests.
 *
 * These tests cover the separate code path used when saving via keyboard
 * rather than the Save button — a regression in one does not catch the other.
 *
 * Resolve IDs from API once. The E2E project chain guarantees audit-edit
 * created a single "E2E Test Audit" before this spec runs.
 */

let auditId;
let findingId;
let sectionId;
const AUDIT_NAME = 'E2E Test Audit';

test.describe('Keyboard Shortcuts (Ctrl+S)', () => {
  test.beforeAll(async ({ request }) => {
    const auditsRes = await request.get('/api/audits');
    const auditsData = await auditsRes.json();
    const candidateAudits = auditsData.datas.filter((audit) => audit.name === AUDIT_NAME);
    expect(candidateAudits).toHaveLength(1);

    auditId = candidateAudits[0]._id;

    const detailRes = await request.get(`/api/audits/${auditId}`);
    const detail = await detailRes.json();
    findingId = detail.datas.findings[0]?._id;
    sectionId = detail.datas.sections[0]?._id;
  });

  test('Ctrl+S saves audit general information', async ({ page }) => {
    await page.goto(`/audits/${auditId}/general`);
    await expect(page.getByLabel(/Name/).first()).not.toHaveValue('');

    await page.getByLabel(/Name/).first().type(' kb');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Audit updated successfully')).toBeVisible();
  });

  test('Ctrl+S saves a finding', async ({ page }) => {
    await page.goto(`/audits/${auditId}/findings/${findingId}`);
    await expect(page.getByRole('tab', { name: 'Definition' })).toBeVisible();

    await page.getByLabel('Title').first().type(' kb');
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Finding updated successfully')).toBeVisible();
  });

  test('Ctrl+S saves a custom section', async ({ page }) => {
    await page.goto(`/audits/${auditId}/sections/${sectionId}`);
    // Wait for EDIT state: Save button only renders when frontEndAuditState === EDIT,
    // which happens after the audit API call completes. Without this, Ctrl+S fires
    // while frontEndAuditState is still EDIT_READONLY and the save is skipped.
    await expect(page.getByRole('button', { name: /ctrl\+s/i })).toBeVisible();

    const editor = page.getByRole('textbox').first();
    if ((await editor.count()) > 0) {
      await editor.click();
      await page.keyboard.type(' kb');
    } else {
      await page.locator('body').click();
    }

    await page.keyboard.press('Control+s');
    await expect(page.getByText('Section updated successfully')).toBeVisible();
  });

  test('Ctrl+S saves network scan data', async ({ page }) => {
    await page.goto(`/audits/${auditId}/network`);
    await expect(page.getByText('E2E Test Audit (E2E Pentest)')).toBeVisible();

    const saveButton = page.getByRole('button', { name: /ctrl\+s/i });
    test.skip((await saveButton.count()) === 0, 'Network page is read-only for this audit state');

    await page.locator('body').click();
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Audit updated successfully')).toBeVisible();
  });
});
