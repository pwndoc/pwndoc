import { test, expect } from './base.js';

test.describe('Vulnerabilities Page', () => {

  // Cleanup: remove test vulnerabilities (languages persist from data-setup)
  test.afterAll(async ({ request }) => {
    await request.delete('/api/vulnerabilities');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/vulnerabilities');
    // Wait for the page to finish loading by checking for a key UI element
    await expect(page.getByRole('button', { name: 'New Vulnerability' })).toBeVisible();
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
      await expect(page.getByText('No matching records found')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('CRUD Operations', () => {
    test('should create a new vulnerability', async ({ page }) => {
      // Click "New Vulnerability" dropdown and wait for menu to appear
      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await expect(page.getByText('Select category')).toBeVisible();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();

      // Wait for the create dialog to open and fill in the title
      await expect(page.getByRole('dialog').getByText(/add vulnerability/i)).toBeVisible();
      // await expect(page.getByTestId('create-vulnerability-title')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('create-vulnerability-title').fill('Test SQL Injection');

      // Click Create button
      await page.getByRole('button', { name: 'Create' }).click();

      // Verify success notification
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Verify the vulnerability appears in the table
      await expect(page.getByRole('cell', { name: 'Test SQL Injection' })).toBeVisible();
    });

    test('should edit an existing vulnerability', async ({ page }) => {
      // First create a vulnerability to edit
      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();
      await page.getByTestId('create-vulnerability-title').fill('Vuln To Edit');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Click the edit button on the row
      const row = page.getByRole('row').filter({ hasText: 'Vuln To Edit' });
      await row.getByTestId('edit-vulnerability-button').click();

      // The edit modal should appear
      await expect(page.getByText('Edit Vulnerability (No Category)')).toBeVisible();

      // Clear and update the title
      await page.getByTestId('edit-vulnerability-title').fill('Vuln Edited Successfully');

      // Click Update button
      await page.getByRole('button', { name: 'Update' }).click();

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
      await page.getByTestId('create-vulnerability-title').fill('Vuln To Delete');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Click the delete button on the row
      const row = page.getByRole('row').filter({ hasText: 'Vuln To Delete' });
      await row.getByTestId('delete-vulnerability-button').click();

      // Confirm deletion in the dialog
      await expect(page.getByText('Vulnerability will be permanently deleted')).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();

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
      await page.getByTestId('create-vulnerability-title').fill('XSS Reflected');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      await page.getByRole('button', { name: 'New Vulnerability' }).click();
      await page.getByRole('listitem').filter({ hasText: 'No Category' }).click();
      await page.getByTestId('create-vulnerability-title').fill('CSRF Token Missing');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Vulnerability created successfully')).toBeVisible();

      // Both should be visible initially
      await expect(page.getByRole('cell', { name: 'XSS Reflected' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'CSRF Token Missing' })).toBeVisible();

      // Type in the search field (the title search input in the top row of the table)
      const searchInput = page.getByTestId('search-vulnerability-title');
      await searchInput.fill('xss');

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

      // Verify create dialog opened
      const createDialog = page.getByRole('dialog');
      await expect(createDialog).toBeVisible();
      await expect(page.getByTestId('create-vulnerability-title')).toBeVisible();

      // Click Create without filling the title
      await page.getByRole('button', { name: 'Create' }).click();

      // Verify error message for missing title
      await expect(page.getByText('Title required')).toBeVisible();
    });
  });
});
