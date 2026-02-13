import { test, expect } from './base.js';
import fs from 'fs';
import path from 'path';

test.describe('Custom Data Setup Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/data/custom');
  });

  test.describe('Page Layout', () => {
    test('should display navigation and tab elements', async ({ page }) => {
      // Verify top nav items in the header toolbar to avoid sidebar collisions.
      const header = page.locator('header');
      await expect(header.locator('a[href="/audits"]')).toBeVisible();
      await expect(header.locator('a[href="/vulnerabilities"]')).toBeVisible();
      await expect(header.locator('a[href="/data"]')).toBeVisible();
      await expect(header.locator('a[href="/settings"]')).toBeVisible();

      // Verify tabs are visible
      await expect(page.getByRole('tab', { name: 'Languages' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Audit Types' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Vulnerability Types' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Vulnerability Categories' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Custom Fields' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Custom Sections' })).toBeVisible();
    });

    test('should show languages tab by default', async ({ page }) => {
      // The languages tab should be active by default
      await expect(page.getByRole('tab', { name: 'Languages' })).toHaveAttribute('aria-selected', 'true');
      // Check the description text is visible
      await expect(page.getByText('Language used in Audits and Vul')).toBeVisible();
    });

    test('should display left sidebar with data navigation links', async ({ page }) => {
      await expect(page.getByText('Collaborators')).toBeVisible();
      await expect(page.getByText('Companies')).toBeVisible();
      await expect(page.getByText('Clients')).toBeVisible();
      await expect(page.getByText('Templates')).toBeVisible();
      await expect(page.getByText('Custom Data')).toBeVisible();
    });
  });

  test.describe('Languages', () => {
    test('should create a new language', async ({ page }) => {
      // Fill in the language form
      const languageInput = page.locator('input').filter({ hasNot: page.locator('[readonly]') }).and(page.getByLabel('Language'));
      const localeInput = page.locator('input').filter({ hasNot: page.locator('[readonly]') }).and(page.getByLabel('Locale'));

      await languageInput.first().fill('English');
      await localeInput.first().fill('en');

      // Click the add button
      await page.getByRole('button', { name: '+' }).click();

      // Wait for success notification
      await expect(page.getByText('Language created successfully')).toBeVisible();

      // Verify the language appears in the list
      await expect(page.getByText('List of Languages')).toBeVisible();
    });

    test('should create a second language', async ({ page }) => {
      const languageInput = page.locator('input').filter({ hasNot: page.locator('[readonly]') }).and(page.getByLabel('Language'));
      const localeInput = page.locator('input').filter({ hasNot: page.locator('[readonly]') }).and(page.getByLabel('Locale'));

      await languageInput.first().fill('French');
      await localeInput.first().fill('fr');

      await page.getByRole('button', { name: '+' }).click();

      await expect(page.getByText('Language created successfully')).toBeVisible();
    });

    test('should not create a duplicate language', async ({ page }) => {
      const languageInput = page.locator('input').filter({ hasNot: page.locator('[readonly]') }).and(page.getByLabel('Language'));
      const localeInput = page.locator('input').filter({ hasNot: page.locator('[readonly]') }).and(page.getByLabel('Locale'));

      await languageInput.first().fill('English');
      await localeInput.first().fill('en');

      await page.getByRole('button', { name: '+' }).click();

      // Should show an error notification
      await expect(page.locator('.q-notification').filter({ hasText: /already exists|Language already/ })).toBeVisible({ timeout: 5000 });
    });

    test('should not create a language without required fields', async ({ page }) => {
      // Try to create without filling anything - click the + button
      await page.getByRole('button', { name: '+' }).click();

      // Validation errors should appear
      await expect(page.getByText('Language is required')).toBeVisible();
      await expect(page.getByText('Locale is required')).toBeVisible();
    });

    test('should edit an existing language', async ({ page }) => {
      // Wait for the list to load
      await expect(page.getByText('List of Languages')).toBeVisible();

      // Click the edit button (fa-edit icon)
      await page.locator('.q-toolbar .q-btn').filter({ has: page.locator('.fa-edit') }).click();

      // Should show edit mode
      await expect(page.getByText('Edit Languages')).toBeVisible();

      // Verify Cancel and Save buttons are visible
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

      // Click Cancel to exit edit mode
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Should go back to list view
      await expect(page.getByText('List of Languages')).toBeVisible();
    });

    test('should delete a language via edit mode', async ({ page }) => {
      // First create a temporary language to delete
      const languageInput = page.locator('input').filter({ hasNot: page.locator('[readonly]') }).and(page.getByLabel('Language'));
      const localeInput = page.locator('input').filter({ hasNot: page.locator('[readonly]') }).and(page.getByLabel('Locale'));

      await languageInput.first().fill('TempLang');
      await localeInput.first().fill('tmp');
      await page.getByRole('button', { name: '+' }).click();
      await expect(page.getByText('Language created successfully')).toBeVisible();

      // Now enter edit mode
      await page.locator('.q-toolbar .q-btn').filter({ has: page.locator('.fa-edit') }).click();
      await expect(page.getByText('Edit Languages')).toBeVisible();

      // Find and click the remove button (x) for the TempLang entry
      const tempLangRow = page.locator('.q-item').filter({ hasText: 'TempLang' });
      await tempLangRow.getByRole('button', { name: 'x' }).click();

      // Save changes
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Languages updated successfully')).toBeVisible();
    });
  });

  test.describe('Vulnerability Types', () => {
    test('should navigate to vulnerability types tab', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();
      await expect(page.getByText('Create Vulnerability Types')).toBeVisible();
    });

    test('should create a vulnerability type', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();

      // The language dropdown should already have a language selected
      // Fill in the name
      const nameInput = page.getByLabel('Name').filter({ hasNot: page.locator('[readonly]') });
      await nameInput.first().fill('Web Application');
      await page.getByRole('button', { name: '+' }).click();

      await expect(page.getByText('Vulnerability type created successfully')).toBeVisible();

      // Verify it appears in the list
      await expect(page.getByText('Vulnerability Types List')).toBeVisible();
    });

    test('should create a second vulnerability type', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();

      const nameInput = page.getByLabel('Name').filter({ hasNot: page.locator('[readonly]') });
      await nameInput.first().fill('Network');
      await page.getByRole('button', { name: '+' }).click();

      await expect(page.getByText('Vulnerability type created successfully')).toBeVisible();
    });

    test('should not create a vulnerability type without a name', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();

      // Click add without filling the name
      await page.getByRole('button', { name: '+' }).click();

      // Validation error should appear
      await expect(page.getByText('Name required')).toBeVisible();
    });

    test('should edit vulnerability types', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();

      await expect(page.getByText('Vulnerability Types List')).toBeVisible();

      // Click edit button
      await page.locator('.q-toolbar .q-btn').filter({ has: page.locator('.fa-edit') }).click();
      await expect(page.getByText('Edit Vulnerability Types')).toBeVisible();

      // Cancel edit
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('Vulnerability Types List')).toBeVisible();
    });

    test('should delete a vulnerability type via edit mode', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();

      // Create a temporary vuln type
      const nameInput = page.getByLabel('Name').filter({ hasNot: page.locator('[readonly]') });
      await nameInput.first().fill('TempVulnType');
      await page.getByRole('button', { name: '+' }).click();
      await expect(page.getByText('Vulnerability type created successfully')).toBeVisible();

      // Enter edit mode
      await page.locator('.q-toolbar .q-btn').filter({ has: page.locator('.fa-edit') }).click();
      await expect(page.getByText('Edit Vulnerability Types')).toBeVisible();

      // Remove the temp entry
      const tempRow = page.locator('.q-item').filter({ hasText: 'TempVulnType' });
      await tempRow.getByRole('button', { name: 'x' }).click();

      // Save
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Vulnerability Types updated successfully')).toBeVisible();
    });
  });

  test.describe('Vulnerability Categories', () => {
    test('should navigate to vulnerability categories tab', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();
      await expect(page.getByText('Create Vulnerability Categories')).toBeVisible();
    });

    test('should create a vulnerability category', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      // Fill in name
      const nameInput = page.getByLabel('Name').filter({ hasNot: page.locator('[readonly]') });
      await nameInput.first().fill('Critical Findings');

      // Click Create button
      await page.getByRole('button', { name: 'Create' }).click();

      await expect(page.getByText('Vulnerability category created successfully')).toBeVisible();

      // Verify it appears in the list
      await expect(page.getByText('List of Categories')).toBeVisible();
    });

    test('should create a second vulnerability category', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      const nameInput = page.getByLabel('Name').filter({ hasNot: page.locator('[readonly]') });
      await nameInput.first().fill('Minor Findings');

      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Vulnerability category created successfully')).toBeVisible();
    });

    test('should not create a vulnerability category without a name', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      // Click Create without filling name
      await page.getByRole('button', { name: 'Create' }).click();

      await expect(page.getByText('Name required')).toBeVisible();
    });

    test('should show default sorting options when creating', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      // Verify sorting fields are visible
      await expect(page.getByLabel('Sort By')).toBeVisible();
      await expect(page.getByLabel('Sort Order')).toBeVisible();
      await expect(page.getByText('Automatic Sorting')).toBeVisible();
    });

    test('should edit vulnerability categories', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      await expect(page.getByText('List of Categories')).toBeVisible();

      // Click edit button
      await page.locator('.q-toolbar .q-btn').filter({ has: page.locator('.fa-edit') }).click();
      await expect(page.getByText('Edit Categories')).toBeVisible();

      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('List of Categories')).toBeVisible();
    });

    test('should delete a vulnerability category via edit mode', async ({ page }) => {
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();

      // Create a temp category
      const nameInput = page.getByLabel('Name').filter({ hasNot: page.locator('[readonly]') });
      await nameInput.first().fill('TempCategory');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Vulnerability category created successfully')).toBeVisible();

      // Enter edit mode
      await page.locator('.q-toolbar .q-btn').filter({ has: page.locator('.fa-edit') }).click();
      await expect(page.getByText('Edit Categories')).toBeVisible();

      // Remove the temp entry
      const tempRow = page.locator('.q-item').filter({ hasText: 'TempCategory' });
      await tempRow.getByRole('button', { name: 'x' }).click();

      // Save
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Vulnerability Categories updated successfully')).toBeVisible();
    });
  });

  test.describe('Custom Sections', () => {
    test('should navigate to custom sections tab', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();
      await expect(page.getByText('Create Custom Sections')).toBeVisible();
    });

    test('should create a custom section', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();

      // Fill in name, field, and icon
      const nameInput = page.getByLabel('Name').filter({ hasNot: page.locator('[readonly]') });
      const fieldInput = page.getByLabel('Field for Template').filter({ hasNot: page.locator('[readonly]') });

      await nameInput.first().fill('Executive Summary');
      await fieldInput.first().fill('executive_summary');

      // Click the + button to create
      await page.getByRole('button', { name: '+' }).click();

      await expect(page.getByText('Section created successfully')).toBeVisible();

      // Verify it appears in the list
      await expect(page.getByText('List of Sections')).toBeVisible();
    });

    test('should create a second custom section', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();

      const nameInput = page.getByLabel('Name').filter({ hasNot: page.locator('[readonly]') });
      const fieldInput = page.getByLabel('Field for Template').filter({ hasNot: page.locator('[readonly]') });

      await nameInput.first().fill('Methodology');
      await fieldInput.first().fill('methodology');

      await page.getByRole('button', { name: '+' }).click();
      await expect(page.getByText('Section created successfully')).toBeVisible();
    });

    test('should not create a section without required fields', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();

      // Click add without filling fields
      await page.getByRole('button', { name: '+' }).click();

      await expect(page.getByText('Field required')).toBeVisible();
      await expect(page.getByText('Name required')).toBeVisible();
    });

    test('should edit custom sections', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();

      await expect(page.getByText('List of Sections')).toBeVisible();

      // Click edit button
      await page.locator('.q-toolbar .q-btn').filter({ has: page.locator('.fa-edit') }).click();
      await expect(page.getByText('Edit Sections')).toBeVisible();

      // Cancel
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('List of Sections')).toBeVisible();
    });

    test('should delete a section via edit mode', async ({ page }) => {
      await page.getByRole('tab', { name: 'Custom Sections' }).click();

      // Create a temp section
      const nameInput = page.getByLabel('Name').filter({ hasNot: page.locator('[readonly]') });
      const fieldInput = page.getByLabel('Field for Template').filter({ hasNot: page.locator('[readonly]') });

      await nameInput.first().fill('TempSection');
      await fieldInput.first().fill('temp_section');
      await page.getByRole('button', { name: '+' }).click();
      await expect(page.getByText('Section created successfully')).toBeVisible();

      // Enter edit mode
      await page.locator('.q-toolbar .q-btn').filter({ has: page.locator('.fa-edit') }).click();
      await expect(page.getByText('Edit Sections')).toBeVisible();

      // Remove the temp entry
      const tempRow = page.locator('.q-item').filter({ hasText: 'TempSection' });
      await tempRow.getByRole('button', { name: 'x' }).click();

      // Save
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Sections updated successfully')).toBeVisible();
    });
  });

  test.describe('Tab Navigation', () => {
    test('should switch between all tabs', async ({ page }) => {
      // Languages (default)
      await expect(page.getByRole('tab', { name: 'Languages' })).toHaveAttribute('aria-selected', 'true');

      // Switch to Audit Types
      await page.getByRole('tab', { name: 'Audit Types' }).click();
      await expect(page.getByRole('tab', { name: 'Audit Types' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Audit Types used in Audits')).toBeVisible();

      // Switch to Vulnerability Types
      await page.getByRole('tab', { name: 'Vulnerability Types' }).click();
      await expect(page.getByRole('tab', { name: 'Vulnerability Types' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Create Vulnerability Types')).toBeVisible();

      // Switch to Vulnerability Categories
      await page.getByRole('tab', { name: 'Vulnerability Categories' }).click();
      await expect(page.getByRole('tab', { name: 'Vulnerability Categories' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Create Vulnerability Categories')).toBeVisible();

      // Switch to Custom Fields
      await page.getByRole('tab', { name: 'Custom Fields' }).click();
      await expect(page.getByRole('tab', { name: 'Custom Fields' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Create and manage Custom Fields')).toBeVisible();

      // Switch to Custom Sections
      await page.getByRole('tab', { name: 'Custom Sections' }).click();
      await expect(page.getByRole('tab', { name: 'Custom Sections' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Create Custom Sections')).toBeVisible();
    });
  });

  test.describe('Audit Types (requires languages)', () => {
    // Create a template via API so the audit type form can link it
    test.beforeAll(async ({ request }) => {
      const templatePath = path.resolve(__dirname, '../../backend/report-templates/Default Template.docx');
      let fileBase64 = '';
      if (fs.existsSync(templatePath)) {
        fileBase64 = fs.readFileSync(templatePath).toString('base64');
      }
      await request.post('/api/templates', {
        data: { name: 'E2E Test Template', file: fileBase64, ext: 'docx' }
      });
    });

    test('should display audit type creation form when languages exist', async ({ page }) => {
      await page.getByRole('tab', { name: 'Audit Types' }).click();

      // When languages exist, the audit type form should be visible
      await expect(page.getByText('Audit Phase')).toBeVisible();
      await expect(page.getByLabel('Default')).toBeVisible();
      await expect(page.getByLabel('Retest')).toBeVisible();
      await expect(page.getByLabel('Multi')).toBeVisible();

      // Name field should be visible
      await expect(page.getByLabel(/Name/)).toBeVisible();

      // Create button should be present
      await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
    });

    test('should not create an audit type without a name', async ({ page }) => {
      await page.getByRole('tab', { name: 'Audit Types' }).click();

      // Click Create without filling name
      await page.getByRole('button', { name: 'Create' }).click();

      // Validation error should appear
      await expect(page.getByText('Name is required')).toBeVisible();
    });

    test('should create an audit type', async ({ page }) => {
      await page.getByRole('tab', { name: 'Audit Types' }).click();

      // Fill in the name
      const nameInput = page.getByLabel(/Name/).first();
      await nameInput.fill('E2E Pentest');

      // Select template for English language
      const templateSelect = page.getByLabel(/Template/).first();
      await templateSelect.click();
      await page.getByRole('option', { name: 'E2E Test Template' }).click();

      // Click Create
      await page.getByRole('button', { name: 'Create' }).click();

      // Verify success
      await expect(page.getByText('Audit type created successfully')).toBeVisible();
    });
  });
});
