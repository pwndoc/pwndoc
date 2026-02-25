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

### Fix Mode

If `$ARGUMENTS` starts with `--fix`, the format is:

```
--fix {spec-file} "{failure summary}" [--no-run]
```

Example: `--fix frontend/tests/e2e/vulnerabilities.spec.js "Timeout waiting for selector [data-testid='vuln-row']" --no-run`

In fix mode:
1. Read the failing spec file specified in the argument
2. Read the page source file(s) being tested (derive from the spec's routes/navigation)
3. Read the existing E2E reference: `frontend/tests/e2e/audits-list.spec.js`
4. Analyze the failure message — determine if the issue is a wrong selector, timing, test logic, or data dependency
5. Fix the spec file using the Edit tool
6. If `--no-run` is present, **STOP** — do not run tests. Otherwise proceed to Step 3 (Run and Fix)

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
import { test, expect } from './base.js';
```

**Important:** Always import from `./base.js`, NOT from `@playwright/test`. The base fixture auto-saves browser storage state after each test, which is required because PwnDoc rotates refresh tokens on every use. Without this, subsequent tests load stale tokens and get redirected to `/login`.

See [template-page-spec.md](template-page-spec.md) for the full test scaffold.

### Locator Priority (strict order)

Follow this priority strictly. Use the first one that works — do NOT skip ahead to CSS selectors.

**1. `getByRole()` — Always try first**
```javascript
page.getByRole('button', { name: 'Save' })
page.getByRole('textbox', { name: 'Title' })
page.getByRole('link', { name: 'Settings' })
page.getByRole('tab', { name: 'Languages' })
page.getByRole('row').filter({ hasText: 'row content' })
page.getByRole('cell', { name: 'value' })
page.getByRole('heading', { name: 'Audits' })
page.getByRole('dialog')                        // scope modals
page.getByRole('toolbar').getByRole('listitem')  // scope toolbar
```

**2. `getByText()` — Non-interactive elements**
```javascript
page.getByText('Vulnerability created successfully')
page.getByText(/already exists/i)
```

**3. `getByLabel()` — Form controls with labels**
```javascript
page.getByLabel('Description')
page.getByLabel(/Name/)
```

**4. `getByPlaceholder()` — Inputs with placeholder but no label**
```javascript
page.getByPlaceholder('Search...')
```

**5. `getByTestId()` — When semantic locators don't work**
```javascript
page.getByTestId('delete-language-btn')
```
When you need `getByTestId`, **add `data-testid` to the Vue source file** yourself. This is preferred over CSS selectors.

**6. CSS selectors — Absolute last resort**
Only when the element is truly outside your control and none of the above work. **NEVER use Quasar CSS class selectors** (`.q-dialog`, `.q-btn`, `.q-card`, `.q-table`, `.q-field`, or any `.q-*` class). These are framework implementation details that break across versions.

### Scoping within dialogs/modals

```javascript
// Scope to a dialog using role (NOT .q-dialog)
const dialog = page.getByRole('dialog');
await dialog.getByLabel('Title').fill('New Item');
await dialog.getByRole('button', { name: 'Create' }).click();
```

### Chaining and filtering

```javascript
// Filter rows by text content
page.getByRole('row').filter({ hasText: 'Item Name' })

// First matching element
page.getByLabel(/Name/).first()

// Narrow with .and()
page.locator('input').and(page.getByLabel('Language'))
```

### Waiting

- Playwright auto-waits for elements. Use `expect(...).toBeVisible()` rather than explicit waits.
- For navigation: `await expect(page).toHaveURL('/expected-route')`
- **Never use `page.waitForResponse()`** — assert visual outcomes instead:
  - After `page.goto()` or `page.reload()`: wait for a key UI element that only appears once data is fetched:
    ```javascript
    await page.goto(`/audits/${auditId}/general`);
    await expect(page.getByLabel(/Name/).first()).not.toHaveValue('');
    ```
  - After a save action (button click or Ctrl+S): wait for the success toast:
    ```javascript
    await page.keyboard.press('Control+s');
    await expect(page.getByText('Audit updated successfully')).toBeVisible();
    ```
  - After upload-triggered side-effects (images, files): assert the resulting UI element — the visual assertion implicitly waits for the async operation:
    ```javascript
    await expect(editor.locator('img')).toBeVisible({ timeout: 5000 });
    ```

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
