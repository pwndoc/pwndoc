---
name: test-frontend-e2e
description: >
  Generates Playwright E2E specs for PwnDoc. Tests run against the full stack
  (frontend + backend + MongoDB) with pre-authenticated browser sessions.
  Run with ./pwndoc-cli test --frontend-e2e.
context: fork
agent: general-purpose
allowed-tools:
  - Bash
  - Glob
  - Grep
  - Read
  - Write
  - Edit
argument-hint: "[feature] e.g. audits, vulnerabilities, data-clients, settings"
---

# Frontend E2E Test Generator

You generate Playwright E2E tests for PwnDoc. Tests run in Chromium, Firefox, and WebKit against the full application stack.

## Arguments

`$ARGUMENTS` - The feature/flow to test (e.g., "audits", "vulnerabilities", "settings", "data-clients").

## Step 1: Read Source and Reference Files

Before writing any tests, ALWAYS read:

1. **The page(s) being tested**: find Vue files in `frontend/src/pages/` related to the feature
2. **Existing E2E reference**: `frontend/tests/e2e/audits-list.spec.js`
3. **Playwright config**: `frontend/tests/playwright.config.js`
4. **Auth setup**: `frontend/tests/e2e/auth.setup.js` and `frontend/tests/e2e/init-user.setup.js`

Understand the page's UI elements, forms, tables, and navigation before writing selectors.

## Step 2: Generate the Spec File

Write the spec to `frontend/tests/e2e/{feature}.spec.js`.

### Authentication

Tests are pre-authenticated via setup projects. The Playwright config defines:
1. `init-user` project: registers the first admin user
2. `auth-{browser}` projects: logs in and saves `storageState.{browser}.json`
3. `{browser}` projects: run `*.spec.js` files with saved auth state

All `*.spec.js` files run with authentication already handled. The test user is:
- Username: `admin`, Password: `Admin123`, Role: admin

### Test Structure

```javascript
import { test, expect } from '@playwright/test';

test.describe('{Feature} Page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/{route}');
  });

  test('should display the page correctly', async ({ page }) => {
    // Check page heading/title
    // Check key UI elements are visible
  });

  test('should create a new {item}', async ({ page }) => {
    // Click create/add button
    // Fill form fields
    // Submit
    // Verify creation (item appears in list/table)
  });

  test('should edit an existing {item}', async ({ page }) => {
    // Select item
    // Modify fields
    // Save
    // Verify changes
  });

  test('should delete a {item}', async ({ page }) => {
    // Select item
    // Click delete
    // Confirm dialog if any
    // Verify removal
  });
});
```

### Selectors (prefer accessible selectors)

```javascript
// Buttons
page.getByRole('button', { name: 'Save' })
page.getByRole('button', { name: 'Add' })

// Inputs
page.getByRole('textbox', { name: 'Title' })
page.getByLabel('Description')

// Links
page.getByRole('link', { name: 'Settings' })

// Nav items
page.getByRole('listitem').filter({ hasText: 'Audits' })

// Text content
page.getByText('expected text')

// Tables
page.getByRole('row').filter({ hasText: 'row content' })

// Avoid CSS selectors unless no accessible alternative exists
```

### Waiting

- Playwright auto-waits for elements. Use `expect(...).toBeVisible()` rather than explicit waits.
- For navigation: `await expect(page).toHaveURL('/expected-route')`
- For API-dependent state: `page.waitForResponse()` if needed

### Test Independence

- Each spec file should be independent (can run in any order)
- Use `test.beforeEach` to navigate to the starting page
- If tests need specific data (languages, audit types, etc.), either:
  - Create the data in the test using the UI
  - Use API calls in `test.beforeAll` via `page.request`
  - Create a setup project for shared data across many specs

### Multi-browser

- Tests run in 3 browsers (Chromium, Firefox, WebKit)
- Do NOT use browser-specific APIs
- Use standard Playwright locators

## Application Routes

| Route | Page | Description |
|-------|------|-------------|
| `/audits` | Audit List | Main dashboard |
| `/audits/{id}` | Audit Edit | Multi-tab audit editor |
| `/vulnerabilities` | Vulnerability List | Vulnerability database |
| `/data` | Data Management | Overview page |
| `/data/custom` | Custom Data | Languages, Audit Types, Vuln Types, Sections |
| `/data/clients` | Clients | Client management |
| `/data/companies` | Companies | Company management |
| `/data/templates` | Templates | Report templates |
| `/data/collaborators` | Collaborators | Collaborator management |
| `/data/spellcheck` | Spellcheck | Spellcheck dictionary |
| `/data/languagetool-rules` | LanguageTool Rules | Grammar rules |
| `/settings` | Settings | Application settings, backups |
| `/profile` | User Profile | Profile management |

## Step 3: Run and Fix

If `$ARGUMENTS` contains `--no-run`, **STOP HERE**. Do not run tests — the calling orchestrator will handle test execution. Strip `--no-run` from arguments before processing the feature name in earlier steps.

Otherwise, run tests with:
```bash
./pwndoc-cli test --frontend-e2e
```

If tests fail, read the error output, fix the spec, and re-run. Iterate until all tests pass across all browsers.

## Reference

See [template-page-spec.md](template-page-spec.md) for a complete scaffold.
