import { test, expect } from './base.js';

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

      // Check onboarding links
      await expect(page.getByRole('link', { name: 'Data -> Custom Data -> Language' })).toHaveAttribute('href', '/data/custom#languages');

      await expect(page.getByRole('link', { name: 'Data -> Custom Data -> Audit Types' })).toHaveAttribute('href', '/data/custom#audit-types');

      await expect(page.getByRole('link', { name: 'Settings -> Backups' })).toHaveAttribute('href', '/settings#backups');
    });

    test('should navigate to the expected pages when onboarding links are clicked', async ({ page }) => {
      await page.getByRole('link', { name: 'Data -> Custom Data -> Language' }).click();
      await expect(page).toHaveURL('/data/custom#languages');

      await page.goto('/audits');
      await page.getByRole('link', { name: 'Data -> Custom Data -> Audit Types' }).click();
      await expect(page).toHaveURL('/data/custom#audit-types');

      await page.goto('/audits');
      await page.getByRole('link', { name: 'Settings -> Backups' }).click();
      await expect(page).toHaveURL('/settings#backups');
    });
  });

});
