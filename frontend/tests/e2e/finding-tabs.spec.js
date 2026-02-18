import { test, expect } from './base.js';

/**
 * Finding tab navigation tests.
 *
 * The finding edit page has three animated tab panels: Definition, Proofs,
 * and Details.  Switching tabs has separate transition hooks (syncEditors /
 * updateOrig) that are not exercised by any other test.  The Completed
 * toggle also lives in the tab bar and has its own status-update path.
 */

let auditId;
let findingId;

test.describe('Finding Tab Navigation', () => {
  test.beforeAll(async ({ request }) => {
    const auditsRes = await request.get('/api/audits');
    const auditsData = await auditsRes.json();
    const audit = auditsData.datas.find(a => a.name === 'E2E Test Audit');
    auditId = audit._id;

    const detailRes = await request.get(`/api/audits/${auditId}`);
    const detail = await detailRes.json();
    findingId = detail.datas.findings[0]?._id;
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!findingId, 'No finding exists in the E2E audit');
    await page.goto(`/audits/${auditId}/findings/${findingId}`);
    await page.waitForResponse(r =>
      r.url().includes(`/api/audits/${auditId}/findings/${findingId}`) && r.status() === 200
    );
  });

  test('Definition tab is active by default and shows title field', async ({ page }) => {
    // The Definition tab should be selected on first load
    await expect(page.getByRole('tab', { name: 'Definition' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByLabel('Title')).toBeVisible();
  });

  test('switching to Proofs tab shows the proofs panel', async ({ page }) => {
    await page.getByRole('tab', { name: 'Proofs' }).click();

    await expect(page.getByRole('tab', { name: 'Proofs' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    // The Proofs panel exposes the PoC field label container.
    await expect(page.locator('#pocField')).toBeVisible({ timeout: 5000 });
  });

  test('switching to Details tab shows the details panel', async ({ page }) => {
    await page.getByRole('tab', { name: 'Details' }).click();

    await expect(page.getByRole('tab', { name: 'Details' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    // The Details panel exposes details-only controls such as priority.
    await expect(page.locator('#priorityField')).toBeVisible({ timeout: 5000 });
  });

  test('Completed toggle saves finding status', async ({ page }) => {
    // Record initial status from the toggle's aria-checked attribute
    const toggle = page.getByTestId('finding-completed-toggle');
    await expect(toggle).toBeVisible();
    const before = await toggle.getAttribute('aria-checked');

    // Click to flip
    await toggle.click();
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Finding updated successfully')).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await page.waitForResponse(r =>
      r.url().includes(`/api/audits/${auditId}/findings/${findingId}`) && r.status() === 200
    );
    const after = await toggle.getAttribute('aria-checked');
    expect(after).not.toBe(before);

    // Revert
    await toggle.click();
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Finding updated successfully')).toBeVisible();
  });
});
