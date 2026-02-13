---
name: test-specialist
description: >
  Test orchestrator for PwnDoc. Analyzes a feature or the full project to determine
  test gaps across backend (Jest), frontend unit (Vitest), and frontend E2E (Playwright),
  then delegates to /test-backend, /test-frontend-unit, and /test-frontend-e2e skills.
argument-hint: "[feature-name or 'gaps']"
---

# Test Specialist - Orchestrator

You are the PwnDoc test orchestrator. Your job is to analyze what tests are needed and coordinate the three test sub-skills.

## Arguments

`$ARGUMENTS` - Either:
- A feature name (e.g., "audit", "client", "vulnerability") to test that feature across all layers
- `gaps` or `all` to analyze and fill all test coverage gaps

## How to Operate

### Step 1: Analyze Scope

**If feature name provided:**
Identify all files related to that feature across all layers:
- Backend: `backend/src/routes/{feature}.js`, `backend/src/models/{feature}.js`
- Frontend service: `frontend/src/services/{feature}.js`
- Frontend pages: `frontend/src/pages/{feature}*/`
- Frontend components: related components
- Existing tests in all three layers

**If "gaps" or "all":**
Scan all three test directories and compare against source files to build a complete gap list, then proceed to Step 1.5.

### Step 1.5: Prioritize Scope (gaps/all mode only)

**This step only applies when the argument is "gaps" or "all".** Skip this step for feature-specific arguments.

After building the gap list, you MUST ask the user before proceeding:

1. **Summarize gaps** — Print a concise summary showing the number of missing tests per category:
   ```
   Test gaps found:
   - Backend: X missing test files
   - Frontend Unit — Components: X missing (list names)
   - Frontend Unit — Pages: X missing (list names)
   - Frontend E2E: X missing specs (list names)
   ```
   (Omit categories with no gaps, e.g. skip "Services" if all are covered.)

2. **Ask the user to pick focus areas** — Use `AskUserQuestion` with `multiSelect: true` to let the user choose which categories to work on. Options should be the categories that have gaps (e.g., "Frontend Unit — Components", "Frontend Unit — Pages", "Frontend E2E").

3. **Batch limit** — Cap the session to a maximum of **5 test files** total. If the user's selected categories contain more than 5 missing items, either:
   - Ask the user which specific items to prioritize, OR
   - Default to the top 5 items from the Priority Order section below

   Tell the user how many items you'll work on (e.g., "I'll create 5 test files this session based on priority order.").

4. **Proceed** — Only generate tests for the selected/prioritized items. Skip everything else.

### Step 2: Determine What Needs Tests

For each layer, check what exists:

**Backend** (tests in `backend/tests/`):
- Already ~90% covered. Only delegate to `/test-backend` if the feature has NO existing test file or if you're adding tests for a new feature.
- Check: Does `backend/tests/{feature}.test.js` exist?

**Frontend Unit** (tests in `frontend/tests/unit/`):
- Check for missing service tests in `frontend/tests/unit/services/`
- Check for missing component tests in `frontend/tests/unit/components/`
- Check for missing page tests in `frontend/tests/unit/pages/`
- Check for missing store tests in `frontend/tests/unit/stores/`

**Frontend E2E** (tests in `frontend/tests/e2e/`):
- Check for missing `*.spec.js` files for major user flows
- E2E tests cover critical user journeys, not every single page

### Step 3: Delegate to Sub-Skills

**In gaps/all mode:** Only delegate for the items selected/prioritized in Step 1.5. Do NOT generate tests for unselected categories or items beyond the batch limit.

For each layer that needs tests, invoke the appropriate sub-skill with `--no-run` so they generate tests without running them (you will run tests in Step 4):

- `/test-backend {feature} --no-run` — for backend API tests
- `/test-frontend-unit {type}:{name} --no-run` — for frontend unit tests
  - `service:audit --no-run`, `component:breadcrumb --no-run`, `page:profile --no-run`, `store:index --no-run`
- `/test-frontend-e2e {feature} --no-run` — for E2E specs

### Step 4: Run and Verify (Fix Loop)

After ALL sub-skills have finished writing code, run the test cycle below.

**CRITICAL RULES:**
- **ONE test run per cycle.** Run `./pwndoc-cli test` ONCE, capture the full output, then analyze the stored results. Do NOT run the command multiple times to "investigate" — all information you need is in the single run's output.
- **NEVER run `pwndoc-cli` in parallel.** Only one instance of `./pwndoc-cli` may run at a time across all agents and subagents. No two test commands may overlap.
- **Fix agents must NEVER run tests.** When you delegate fixes to subagents/parallel agents, they must ONLY edit code. They must NOT run `./pwndoc-cli test` or any test command. Only YOU (the main test-specialist orchestrator) run tests, and only AFTER all fix agents have completed.
- Always use `./pwndoc-cli test` commands. Never use `npm run test` or `npx` directly.

**Fix loop procedure:**

1. **Run tests once** — Execute the relevant test suites and store the full output:
   - `./pwndoc-cli test --backend` if backend tests were created/modified
   - `./pwndoc-cli test --frontend-unit` if frontend unit tests were created/modified
   - `./pwndoc-cli test --frontend-e2e` if E2E tests were created/modified

2. **Analyze stored results** — Read through the captured output to identify all failures. Do NOT re-run tests to get more information.

3. **Fix all failures** — Delegate fixes to the relevant sub-skills using `--fix` mode with `--no-run`. Group failures by layer, then invoke in parallel:
   - `/test-frontend-unit --fix {test-file} "{error}" --no-run` for frontend unit test failures
   - `/test-frontend-e2e --fix {spec-file} "{error}" --no-run` for E2E spec failures
   - `/test-backend --fix {test-file} "{error}" --no-run` for backend test failures

   Sub-skills must NOT run tests (ensured by `--no-run`). Wait for ALL to complete before proceeding.

4. **Re-run tests once** — After ALL fixes are written, run the test command again (once) to verify. Repeat from step 2 if there are still failures.

5. **Maximum 2 iterations.** If tests still fail after 2 fix cycles, report the remaining failures to the user rather than continuing to loop.

### Step 5: Update Coverage State

After all tests pass (or after the fix loop completes), update the "Current Coverage State" section at the bottom of THIS file (`/srv/pwndoc/.claude/skills/test-specialist/SKILL.md`).

**Procedure:**
1. Scan actual test files:
   - `backend/tests/*.test.js` (excluding `index.test.js` which is the runner)
   - `frontend/tests/unit/services/*.test.js`
   - `frontend/tests/unit/components/*.test.js`
   - `frontend/tests/unit/pages/*.test.js`
   - `frontend/tests/unit/stores/*.test.js`
   - `frontend/tests/e2e/*.spec.js` and `frontend/tests/e2e/*.setup.js`
2. Compare against source files:
   - `frontend/src/services/*.js` (15 total)
   - `frontend/src/components/**/*.vue` (12 total)
   - `frontend/src/pages/**/*.vue` (24 total)
   - `frontend/src/stores/*.js` (2 total)
3. Compute coverage percentages and update the "Existing" / "Missing" lists
4. Update the "Last updated" date
5. Edit the coverage section in-place using the Edit tool

This ensures the coverage state always reflects reality and guides future test generation accurately.

## Current Coverage State

> **This section is auto-updated.** After tests pass, the orchestrator runs Step 5 to refresh it.
> Last updated: 2026-02-13

### Backend (~90% covered)
Existing test files in `backend/tests/`: unauthenticated, user, role, template, data, company, client, settings, vulnerability, audit, backup, images, cvss, languagetool-rules, spellcheck, lib.
These run sequentially via `backend/tests/index.test.js`.

### Frontend Unit (~80% covered)
**Services (15/15 — complete):** audit, backup, client, collaborator, company, data, image, languagetool-rules, reviewer, session, settings, spellcheck, template, user, utils/vulnerability
**Components (5/12):** audit-state-icon, breadcrumb, comments-list, custom-fields, language-selector, textarea-array
**Missing components:** cvss3calculator, cvss4calculator, editor/Editor, editor/editor-image-template, editor/editor-caption-template, editor/editor-code-block
**Pages (20/24):** 403, 404, add-audits, audits-edit, audits-edit-general, audits-edit-network, audits-list, clients, collaborators, companies, data-custom, findings-add, findings-edit, languagetool-rules, login, profile, sections, settings, spellcheck, templates, vulnerabilities
**Missing pages:** data/index (hub), data/dump
**Stores (2/2 — complete):** index, user

### Frontend E2E (~10% covered)
**Existing:** init-user.setup.js, auth.setup.js, audits-list.spec.js, data-setup.spec.js, vulnerabilities.spec.js, audit-edit.spec.js
**Missing:** login flows, data-clients, data-companies, data-templates, settings, profile

## Feature-to-File Mapping

| Feature | Backend Route | Frontend Service | Frontend Pages | Key Components |
|---------|--------------|-----------------|----------------|----------------|
| audit | routes/audit.js | services/audit.js | pages/audits/* | editor/*, comments-list |
| client | routes/client.js | services/client.js | pages/data/clients/* | custom-fields |
| company | routes/company.js | services/company.js | pages/data/companies/* | - |
| vulnerability | routes/vulnerability.js | services/vulnerability.js | pages/vulnerabilities/* | cvss3calculator, cvss4calculator |
| template | routes/template.js | services/template.js | pages/data/templates/* | - |
| backup | routes/backup.js | services/backup.js | pages/settings/* | - |
| settings | routes/settings.js | services/settings.js | pages/settings/* | - |
| data | routes/data.js | services/data.js | pages/data/custom/* | - |
| image | routes/image.js | services/image.js | - | - |
| user | routes/user.js | services/user.js | pages/profile/* | - |
| spellcheck | routes/spellcheck.js | services/spellcheck.js | pages/data/spellcheck/* | - |
| languagetool-rules | routes/languagetool-rules.js | services/languagetool-rules.js | pages/data/languagetool-rules/* | - |
| collaborator | - | services/collaborator.js | pages/data/collaborators/* | - |
| reviewer | - | services/reviewer.js | - | - |

## Priority Order (for "gaps" mode)

When filling all gaps, work in this order (highest impact first):

### Frontend Unit — Services
All 15 services are covered. No gaps.

### Frontend Unit — Components
1. cvss3calculator, cvss4calculator (complex calculators, high value)
2. editor/Editor, editor/editor-image-template, editor/editor-caption-template, editor/editor-code-block (editor suite)

### Frontend Unit — Pages
1. data/index (hub page), data/dump (backup page)

### Frontend E2E
1. data-clients, data-companies, data-templates (CRUD flows)
2. settings, profile
3. login flows (auth edge cases)
