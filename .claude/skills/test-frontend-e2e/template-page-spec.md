# E2E Page Spec Template

```javascript
import { test, expect } from './base.js';

test.describe('{Feature} Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/{route}');
  });

  test.describe('Page Layout', () => {
    test('should display navigation and page elements', async ({ page }) => {
      // Verify nav items
      await expect(page.getByRole('listitem').filter({ hasText: 'Audits' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Vulnerabilities' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Data' })).toBeVisible();
      await expect(page.getByRole('listitem').filter({ hasText: 'Settings' })).toBeVisible();

      // Verify page-specific elements
      // ...
    });
  });

  test.describe('CRUD Operations', () => {
    test('should create a new item', async ({ page }) => {
      // Open create dialog/form
      // Fill required fields
      // Submit
      // Verify item appears in list
    });

    test('should edit an existing item', async ({ page }) => {
      // Select item
      // Modify fields
      // Save
      // Verify changes
    });

    test('should delete an item', async ({ page }) => {
      // Select item
      // Click delete
      // Confirm dialog
      // Verify removal
    });
  });

  test.describe('Validation', () => {
    test('should show error for missing required fields', async ({ page }) => {
      // Open create form
      // Submit without filling required fields
      // Verify error messages
    });
  });
});
```
