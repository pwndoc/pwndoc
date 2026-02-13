import { test, expect } from './base.js';

test.describe('Audits List Page (with data)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/audits');
  });

  test('should not show missing data warnings', async ({ page }) => {
    // Languages and audit types exist from data-setup, warnings should be gone
    await expect(page.getByText('No languages are defined')).not.toBeVisible();
    await expect(page.getByText('No Audit Types are defined')).not.toBeVisible();
    await expect(page.getByText('Or restore from Backup File')).not.toBeVisible();
  });

  test('should display the audits table with the created audit', async ({ page }) => {
    // The audit created by audit-edit spec should appear in the table
    await expect(page.getByRole('cell', { name: 'E2E Test Audit' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'E2E Pentest' })).toBeVisible();
  });

  test('should show the New Audit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New Audit' })).toBeVisible();
  });

  test('should open create audit modal', async ({ page }) => {
    await page.getByRole('button', { name: 'New Audit' }).click();

    // Verify the modal appears with required fields
    await expect(page.getByText('Create Audit')).toBeVisible();
    await expect(page.getByLabel(/Name/)).toBeVisible();
    await expect(page.getByLabel(/Language/)).toBeVisible();
  });

  test('should show audit count in table footer', async ({ page }) => {
    await expect(page.getByText(/1 audit/)).toBeVisible();
  });

  test('should have edit and delete actions on audit row', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: 'E2E Test Audit' });
    await expect(row.getByRole('button', { name: /Edit/ })).toBeVisible();
    await expect(row.getByRole('button', { name: /Delete/ })).toBeVisible();
  });
});
