import { test, expect } from './base.js';

/**
 * Settings backup tests.
 *
 * Covers the Create Backup and Download Backup workflows.
 * Restore is intentionally not tested here to avoid wiping state that
 * audits-list-data.spec.js depends on.
 *
 * This spec runs last (after all parallel edge-case specs) because the
 * settings page is shared global state.
 */

const BACKUP_NAME = 'E2E Test Backup';

test.describe('Settings Backup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForResponse(r =>
      r.url().includes('/api/settings') && r.status() === 200
    );
  });

  test.afterAll(async ({ request }) => {
    // Clean up test backup via API if it exists
    const res = await request.get('/api/backups');
    if (res.status() === 200) {
      const data = await res.json();
      const backup = data.datas?.find(b => b.name === BACKUP_NAME);
      if (backup) {
        await request.delete(`/api/backups/${backup.slug || backup._id}`);
      }
    }
  });

  test('Create Backup button opens the create dialog', async ({ page }) => {
    await page.getByTestId('create-backup-button').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('Create Backup')).toBeVisible();
    await expect(page.getByTestId('create-backup-name-input')).toBeVisible();
  });

  test('creating a backup adds it to the backup list', async ({ page }) => {
    await page.getByTestId('create-backup-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill backup name
    await page.getByTestId('create-backup-name-input').fill(BACKUP_NAME);

    // Submit
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();

    // Dialog should close while backup runs; wait for it to appear in the list
    await page.waitForResponse(r =>
      r.url().includes('/api/backups') && r.status() === 200,
      { timeout: 30000 }
    );

    // The backup row should eventually appear
    await expect(
      page.getByRole('row').filter({ hasText: BACKUP_NAME })
    ).toBeVisible({ timeout: 30000 });
  });

  test('download backup button triggers a file download', async ({ page }) => {
    // The backup created by the previous test should be visible
    const backupRow = page.getByRole('row').filter({ hasText: BACKUP_NAME });
    await expect(backupRow).toBeVisible({ timeout: 15000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      backupRow.getByTestId('download-backup-button').click(),
    ]);

    // Downloaded file should have a recognised backup extension.
    expect(download.suggestedFilename()).toMatch(/\.(zip|json|gz|tar)$/i);
  });
});
