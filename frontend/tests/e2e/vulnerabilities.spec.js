import { test, expect } from './base.js';

test.describe('Vulnerabilities Page', () => {

  // Cleanup: remove test vulnerabilities (languages persist from data-setup)
  test.afterAll(async ({ request }) => {
    await request.delete('/api/vulnerabilities');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/vulnerabilities');
    // Wait for the table to finish loading
    await page.waitForResponse(resp =>
      resp.url().includes('/api/vulnerabilities') && resp.status() === 200
    );
  });

  test.describe('Page Layout', () => {
    test('should display navigation and page elements', async ({ page }) => {
      // Verify nav items
      await expect(page.getByRole('listitem').filter({ hasText: 'Audits' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Vulnerabilities' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Data' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Settings' })).toBeVisible();

      // Verify language selector is present
      await expect(page.getByLabel('Language')).toBeVisible();

      // Verify filter toggles
      await expect(page.getByText('Valid')).toBeVisible();
      await expect(page.getByText('New', { exact: true })).toBeVisible();
      await expect(page.getByText('Updates')).toBeVisible();

      // Verify "New Vulnerability" dropdown button
      await expect(page.getByRole('button', { name: 'New Vulnerability' })).toBeVisible();

      // Verify "Merge Vulnerabilities" button
      await expect(page.getByRole('button', { name: 'Merge Vulnerabilities' })).toBeVisible();
    });

    test('should show empty table when no vulnerabilities exist', async ({ page }) => {
      await expect(page.getByText('No data available')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('CRUD Operations', () => {
    test('should create a new vulnerability', async ({ page }) => {
      // Click "New Vulnerability" dropdown
      await page.getByRole('button', { name: 'New Vulnerability' }).click();

      // Select "No Category" from the dropdown list
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();

      // The create modal should appear with the title "Add Vulnerability (No Category)"
      await expect(page.getByText('Add Vulnerability (No Category)')).toBeVisible();

      // Fill in the title field
      await page.locator('.q-dialog').getByLabel('Title *').fill('Test SQL Injection');

      // Click Create button
      await page.getByRole('button', { name: 'Create' }).click();

      // Wait for the creation API response
      await page.waitForResponse(resp =>
        resp.url().includes('/api/vulnerabilities') && resp.request().method() === 'POST' && resp.status() === 200
      );

      // Verify success notification
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Verify the vulnerability appears in the table
      await expect(page.getByRole('cell', { name: 'Test SQL Injection' })).toBeVisible();
    });

    test('should edit an existing vulnerability', async ({ page }) => {
      // First create a vulnerability to edit
      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();
      await page.locator('.q-dialog').getByLabel('Title *').fill('Vuln To Edit');
      await page.getByRole('button', { name: 'Create' }).click();
      await page.waitForResponse(resp =>
        resp.url().includes('/api/vulnerabilities') && resp.request().method() === 'POST' && resp.status() === 200
      );
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Click the edit button on the row
      const row = page.getByRole('row').filter({ hasText: 'Vuln To Edit' });
      await row.getByRole('button', { name: 'Edit' }).click();

      // The edit modal should appear
      await expect(page.getByText('Edit Vulnerability (No Category)')).toBeVisible();

      // Clear and update the title
      await page.locator('.q-dialog').getByLabel('Title *').fill('Vuln Edited Successfully');

      // Click Update button
      await page.getByRole('button', { name: 'Update' }).click();

      // Wait for the update API response
      await page.waitForResponse(resp =>
        resp.url().includes('/api/vulnerabilities/') && resp.request().method() === 'PUT' && resp.status() === 200
      );

      // Verify success notification
      await expect(page.getByText('Vulnerability updated successfully')).toBeVisible();

      // Verify the updated title appears in the table
      await expect(page.getByRole('cell', { name: 'Vuln Edited Successfully' })).toBeVisible();

      // Verify old title is gone
      await expect(page.getByRole('cell', { name: 'Vuln To Edit' })).not.toBeVisible();
    });

    test('should delete a vulnerability', async ({ page }) => {
      // First create a vulnerability to delete
      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();
      await page.locator('.q-dialog').getByLabel('Title *').fill('Vuln To Delete');
      await page.getByRole('button', { name: 'Create' }).click();
      await page.waitForResponse(resp =>
        resp.url().includes('/api/vulnerabilities') && resp.request().method() === 'POST' && resp.status() === 200
      );
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Click the delete button on the row
      const row = page.getByRole('row').filter({ hasText: 'Vuln To Delete' });
      await row.getByRole('button', { name: 'Delete' }).click();

      // Confirm deletion in the dialog
      await expect(page.getByText('Vulnerability will be permanently deleted')).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();

      // Wait for the delete API response
      await page.waitForResponse(resp =>
        resp.url().includes('/api/vulnerabilities/') && resp.request().method() === 'DELETE' && resp.status() === 200
      );

      // Verify success notification
      await expect(page.getByText('Vulnerability deleted successfully')).toBeVisible();

      // Verify the vulnerability is no longer in the table
      await expect(page.getByRole('cell', { name: 'Vuln To Delete' })).not.toBeVisible();
    });
  });

  test.describe('Search and Filter', () => {
    test('should filter vulnerabilities by title search', async ({ page }) => {
      // Create two vulnerabilities with different titles
      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();
      await page.locator('.q-dialog').getByLabel('Title *').fill('XSS Reflected');
      await page.getByRole('button', { name: 'Create' }).click();
      await page.waitForResponse(resp =>
        resp.url().includes('/api/vulnerabilities') && resp.request().method() === 'POST' && resp.status() === 200
      );

      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();
      await page.locator('.q-dialog').getByLabel('Title *').fill('CSRF Token Missing');
      await page.getByRole('button', { name: 'Create' }).click();
      await page.waitForResponse(resp =>
        resp.url().includes('/api/vulnerabilities') && resp.request().method() === 'POST' && resp.status() === 200
      );

      // Both should be visible initially
      await expect(page.getByRole('cell', { name: 'XSS Reflected' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'CSRF Token Missing' })).toBeVisible();

      // Type in the search field (the title search input in the top row of the table)
      const searchInput = page.getByRole('row').first().getByLabel('Search');
      await searchInput.fill('XSS');

      // XSS should still be visible, CSRF should be filtered out
      await expect(page.getByRole('cell', { name: 'XSS Reflected' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'CSRF Token Missing' })).not.toBeVisible();

      // Clear search to see all again
      await searchInput.clear();
      await expect(page.getByRole('cell', { name: 'XSS Reflected' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'CSRF Token Missing' })).toBeVisible();
    });
  });

  test.describe('Validation', () => {
    test('should show error when creating vulnerability without title', async ({ page }) => {
      // Click "New Vulnerability" dropdown
      await page.getByRole('button', { name: 'New Vulnerability' }).click();

      // Select "No Category"
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();

      // The create modal should appear
      await expect(page.getByText('Add Vulnerability (No Category)')).toBeVisible();

      // Click Create without filling the title
      await page.getByRole('button', { name: 'Create' }).click();

      // Verify error message for missing title
      await expect(page.getByText('Title is required')).toBeVisible();
    });
  });
});
