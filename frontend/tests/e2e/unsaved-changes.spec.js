import { test, expect } from './base.js';

/**
 * Unsaved-changes warning tests (beforeRouteLeave guards).
 *
 * When a user navigates away from a dirty form PwnDoc shows a confirmation
 * dialog.  These tests verify:
 *   - The dialog appears with the correct message.
 *   - "Cancel" keeps the user on the current page.
 *   - "Confirm" actually navigates away.
 *
 * Covered pages: General Info, Finding Edit, Section Edit, Settings.
 */

let auditId;
let findingId;
let sectionId;

test.describe('Unsaved Changes Warning', () => {
  test.beforeAll(async ({ request }) => {
    const auditsRes = await request.get('/api/audits');
    const auditsData = await auditsRes.json();
    const audit = auditsData.datas.find(a => a.name === 'E2E Test Audit');
    auditId = audit._id;

    const detailRes = await request.get(`/api/audits/${auditId}`);
    const detail = await detailRes.json();
    findingId = detail.datas.findings[0]?._id;
    sectionId = detail.datas.sections[0]?._id;
  });

  // ── General Information ──────────────────────────────────────────────────

  test('general info: Cancel keeps user on the page', async ({ page }) => {
    await page.goto(`/audits/${auditId}/general`);
    await expect(page.getByLabel(/Name/).first()).not.toHaveValue('');

    // Make the form dirty
    await page.getByLabel(/Name/).first().type(' dirty');

    // Attempt to navigate away via sidebar
    await page.getByRole('listitem').filter({ hasText: 'Vulnerabilities' }).click();

    // Unsaved changes dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('There are unsaved changes !')).toBeVisible();

    // Click Cancel — should stay on the general page
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(new RegExp(`/audits/${auditId}/general`));
  });

  test('general info: Confirm navigates away', async ({ page }) => {
    await page.goto(`/audits/${auditId}/general`);
    await expect(page.getByLabel(/Name/).first()).not.toHaveValue('');

    await page.getByLabel(/Name/).first().type(' dirty');

    await page.getByRole('listitem').filter({ hasText: 'Vulnerabilities' }).click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page).toHaveURL('/vulnerabilities');
  });

  // ── Finding Edit ─────────────────────────────────────────────────────────

  test('finding edit: unsaved changes dialog appears and Cancel stays', async ({ page }) => {
    test.skip(!findingId, 'No finding exists in the E2E audit');

    await page.goto(`/audits/${auditId}/findings/${findingId}`);
    await expect(page.getByRole('tab', { name: 'Definition' })).toBeVisible();

    // Make the title dirty
    await page.getByLabel('Title').first().type(' dirty');

    // Navigate away via sidebar General Information link
    await page.getByText('General Information').click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('There are unsaved changes !')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(new RegExp(`/audits/${auditId}/findings/${findingId}`));
  });

  // ── Section Edit ─────────────────────────────────────────────────────────

  test('section edit: unsaved changes dialog appears and Cancel stays', async ({ page }) => {
    test.skip(!sectionId, 'No section exists in the E2E audit');

    await page.goto(`/audits/${auditId}/sections/${sectionId}`);
    await expect(page.getByRole('textbox').first()).toBeVisible();

    // Type into the rich-text editor to make the section dirty
    const editor = page.getByRole('textbox').first();
    await editor.click();
    await page.keyboard.type('dirty content');

    // Navigate away
    await page.getByText('General Information').click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('There are unsaved changes !')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(new RegExp(`/audits/${auditId}/sections/${sectionId}`));
  });

  // ── Settings ─────────────────────────────────────────────────────────────

  test('settings: unsaved changes dialog appears and Cancel stays', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('create-backup-button')).toBeVisible();

    // Toggle imageBorder to make settings dirty.
    const toggle = page.getByTestId('image-border-toggle');
    await toggle.click();

    // Navigate away via sidebar
    await page.getByRole('listitem').filter({ hasText: 'Audits' }).click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('There are unsaved changes !')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL('/settings');
  });
});
