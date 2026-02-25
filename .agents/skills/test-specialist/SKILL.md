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
Scan all three test directories and compare against source files to build a complete gap list.

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
- Use `--coverage` only for backend and frontend unit suites (not E2E).

**Fix loop procedure:**

1. **Run tests once** — Execute the relevant test suites and store the full output:
   - `./pwndoc-cli test --backend` if backend tests were created/modified
   - `./pwndoc-cli test --frontend-unit` if frontend unit tests were created/modified
   - `./pwndoc-cli test --frontend-e2e` if E2E tests were created/modified
   - Add `--coverage` for backend/frontend-unit runs when coverage output is requested.

2. **Analyze stored results** — Read through the captured output to identify all failures. Do NOT re-run tests to get more information.

3. **Fix all failures** — You may delegate fixes to parallel agents for efficiency, but those agents must ONLY modify source/test files. They must NOT run any `./pwndoc-cli` commands. Wait for ALL fix agents to complete before proceeding.

4. **Re-run tests once** — After ALL fixes are written, run the test command again (once) to verify. Repeat from step 2 if there are still failures.

5. **Maximum 2 iterations.** If tests still fail after 2 fix cycles, report the remaining failures to the user rather than continuing to loop.

## Current Coverage State

### Backend (~90% covered)
Existing test files in `backend/tests/`: unauthenticated, user, template, data, company, client, settings, vulnerability, audit, backup, cvss, languagetool-rules, spellcheck, lib.
These run sequentially via `backend/tests/index.test.js`.

### Frontend Unit (~5% covered)
**Existing:**
- `stores/user.test.js`
- `components/audit-state-icon.test.js`
- `services/utils.test.js`, `services/user.test.js`, `services/session.test.js`
- `pages/login.test.js`

**Missing services:** audit, backup, client, collaborator, company, data, image, languagetool-rules, reviewer, settings, spellcheck, template, vulnerability
**Missing components:** breadcrumb, comments-list, custom-fields, cvss3calculator, cvss4calculator, editor/*, language-selector, textarea-array
**Missing pages:** 403, 404, audits/*, data/*, profile/*, settings/*, vulnerabilities/*
**Missing stores:** index (root store)

### Frontend E2E (~1% covered)
**Existing:** init-user.setup.js, auth.setup.js, audits-list.spec.js
**Missing:** login flows, audit editing, data management, settings, vulnerabilities, profile

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

### Frontend Unit — Services (quickest wins)
1. audit, client, company, vulnerability, template (core CRUD services)
2. data, settings, backup, image
3. spellcheck, languagetool-rules, collaborator, reviewer

### Frontend Unit — Components
1. breadcrumb, language-selector, textarea-array (simpler)
2. custom-fields, comments-list (medium complexity)
3. cvss3calculator, cvss4calculator (complex, lower priority)

### Frontend Unit — Pages
1. 403, 404 (simple error pages)
2. profile (standalone)
3. data/* pages, settings, vulnerabilities
4. audits/* (most complex)

### Frontend E2E
1. data-setup (create languages, audit types — prerequisite for other flows)
2. vulnerabilities (CRUD)
3. audit-edit (general, findings, sections)
4. data-clients, data-companies, data-templates
5. settings, profile
