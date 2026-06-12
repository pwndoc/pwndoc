---
name: update-documentation
description: >
  Use this skill when updating PwnDoc's user-facing documentation in docs/.
  Trigger whenever the user says "update the docs", "document this feature",
  "update documentation for X", or "add this to the docs". Also trigger
  proactively after implementing a feature — if you just finished building
  something and haven't touched the docs yet, use this skill. Even if the user
  doesn't say "docs", if you've just completed feature work and documentation
  would clearly be needed, invoke this skill.
---

# Update Documentation

PwnDoc's user-facing documentation lives in `docs/` and is rendered with Docsify. This skill guides you through updating it consistently.

**Scope boundary:** This skill only touches files in `docs/`. Do not modify application code, backend config, or any file outside `docs/` — even if it seems related.

## Step 0: Screenshot Setup

Ask once before doing anything else:

> "Is there a PwnDoc instance I can use for screenshots? If so, what's the URL (e.g. `https://localhost:8443`)?"

- **Yes:** use MCP Playwright to log in — navigate to `{url}/login`, fill username `admin` and password `Admin123!`, submit, wait for redirect to `/audits`. Accept self-signed cert warnings. Store the URL as `screenshots_url`.
- **No** (or login fails): set `screenshots_available = false` and proceed. All screenshot slots will become `> Note: screenshot needed` placeholders.

Ask once. Don't re-ask per screenshot.

## Step 1: Orient

Understand what changed. If it's already clear from the conversation, proceed. If not, ask: *"What feature or change should I document?"*

You need to know:
- What the feature does from the user's perspective
- Whether it modifies an existing workflow or introduces something entirely new

**Write only what you know.** Document the behavior described in the conversation. If you need details that weren't given (specific field names, config options, edge cases), check the relevant source file — don't invent them. A one-sentence accurate description beats a paragraph of guesswork.

Where to look if you need to verify details:
- Feature behavior: `frontend/src/pages/` (Vue pages), `frontend/src/services/` (API calls)
- Permissions: `backend/src/config/roles.json`
- API behavior: `backend/src/routes/`

## Step 2: Map to Doc Pages

Identify which pages are affected using this map:

| File | Covers |
|------|--------|
| `docs/README.md` | Home page + feature list — update if adding a major new capability |
| `docs/installation.md` | Docker setup, SSL, env config — update for new setup steps or config options |
| `docs/data.md` | Languages, audit types, companies, clients, collaborators, custom data |
| `docs/roles.md` | RBAC permissions matrix, built-in and custom roles |
| `docs/vulnerabilities.md` | Vulnerability database, fields, import/export, CVSS scoring |
| `docs/audits.md` | Audit workflow, findings, network scans, multi-user editing, review states |
| `docs/docxtemplate.md` | Word template tags, filters, docxtemplater syntax |
| `docs/debug.md` | MongoDB shell, troubleshooting tips |
| `docs/_sidebar.md` | Navigation sidebar — only touch if you're adding a new page |

Most feature changes map to one or two pages. Be specific — don't update pages that aren't touched by the change.

If the change introduces a concept substantial enough to deserve its own page (e.g., "backup & restore", "user profile", "settings"), propose creating a new page and updating `_sidebar.md`. Minor UI features (toggles, small preferences) don't warrant new pages — add a brief section to the most relevant existing page.

## Step 3: Read Before Writing

Read each affected page in full before making any edits. This prevents accidentally duplicating content, breaking the narrative flow, or contradicting existing text.

## Step 4: Write the Updates

Follow PwnDoc's established doc patterns:

**Heading levels**
- `#` — Page title (one per page, already exists)
- `##` — Major sections
- `###` — Subsections within a section

**Screenshots**

When a screenshot would help illustrate a step or feature:

1. Navigate: `mcp__playwright__browser_navigate` to `{screenshots_url}/{path}`
2. Set up state if needed (open a dialog, expand a panel, fill a form) to get the UI into the right state
3. **Capture — prefer focused over full-page:**
   - If the subject is a specific UI component, use `mcp__playwright__browser_take_screenshot` with a `selector` (e.g. `.q-dialog`, a CSS selector targeting the component) to capture just that element
   - If a region makes more sense than a single element, use `mcp__playwright__browser_evaluate` to get the bounding rect of the relevant container, then pass `clip: {x, y, width, height}` to `mcp__playwright__browser_take_screenshot`
   - Only fall back to full-page when the whole layout is the point (e.g. a dashboard overview)
4. Save to `docs/_images/{filename}.png` and reference with `![Descriptive alt text](/_images/{filename}.png)`

**Naming:** `{page}-{feature}-{detail}.png` — e.g. `audits-findings-cvss-panel.png`, `roles-custom-role-form.png`. Lowercase, hyphens, no spaces. Don't overwrite an existing image unless the UI has changed.

**Fallback:** if `screenshots_available = false`, or navigation fails, or the screenshot tool errors — write `> Note: screenshot needed — {description of what it should show}` instead. Never block the documentation update on a screenshot.

**Callouts**
```markdown
> Important note or warning here.
```

**Tables** — Use for permission matrices, field references, option lists

**Code blocks** — Use for shell commands, YAML, JSON, template syntax

**Style guidance** — PwnDoc docs are direct and practical. Describe what the user does, not what the system does internally. Use present tense. Keep sentences short.

**What NOT to do**
- Don't rewrite sections the change doesn't affect
- Don't add introductory fluff ("In this section, we will...")
- Don't duplicate information already covered on another page — link to it instead
- Don't describe behavior you haven't verified — if unsure, check the source or leave a `> Note: verify this` placeholder

## Step 5: Check Navigation

Only touch `docs/_sidebar.md` if you're adding a brand-new page. If you are, add an entry in the appropriate position matching the logical flow of the existing nav.

Current sidebar order: Installation → Data → Roles → Vulnerabilities → Audits → Docx Template → Debug → API Documentation

## New Page Checklist

If creating a new page:
- [ ] Create `docs/{page-name}.md` with `#` title at top
- [ ] Add entry to `docs/_sidebar.md` in logical position
- [ ] Consider whether `docs/README.md` feature list should be updated
- [ ] Use consistent heading structure from existing pages
