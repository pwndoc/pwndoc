import { test, expect } from '@playwright/test';

// test.beforeAll(async ({request}) => {
//   const res = await request.post('/api/__test__/reset-db');
//   if (!res.ok()) throw new Error('Failed to reset MongoDB');
// })

test.describe('Init First User', () => {
 
  // test.use({ storageState: { cookies: [], origins: [] } });
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test.describe('First Access', () => {
    test('should show first access setup form', async ({ page }) => {
      await expect(page.getByRole('textbox', { name: 'Username' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Firstname' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Lastname' })).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Register First User' })).toBeVisible();
    });

    test('should register first user successfully', async ({ page }) => {
      await page.getByRole('textbox', { name: 'Username' }).fill('admin');
      await page.getByRole('textbox', { name: 'Firstname' }).fill('Pwn');
      await page.getByRole('textbox', { name: 'Lastname' }).fill('Doc');
      await page.getByLabel('Password').fill('Admin123');
      await page.getByRole('button', { name: 'Register First User' }).click();
      
      await expect(page).toHaveURL('/audits');
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