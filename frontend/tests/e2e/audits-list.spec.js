import { test, expect } from '@playwright/test';

test.describe('Audits List Page', () => {
 
  test.beforeEach(async ({ page }) => {
    await page.goto('/audits');
  });

  test.describe('First access to audits list', () => {
    test('should show default page without data', async ({ page }) => {
      // Check toolbar items (list items)
      await expect(page.getByRole('listitem').filter({ hasText: 'Audits' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Vulnerabilities' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Data' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Settings' })).toBeVisible();

      // Check for expand button
      await expect(page.getByRole('button', { name: 'Expand "admin"' })).toBeVisible();

      // Check paragraph texts and links
      await expect(page.getByText('No languages are defined. Please create Languages in')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Data -> Custom Data -> Language' })).toHaveAttribute('href', '/data/custom');

      await expect(page.getByText('No Audit Types are defined. Please create Audit Types in')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Data -> Custom Data -> Audit Types' })).toHaveAttribute('href', '/data/custom');

      await expect(page.getByText('Or restore from Backup File')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Settings -> Backups' })).toHaveAttribute('href', '/settings');
    });
  });

});