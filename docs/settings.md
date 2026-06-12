# Settings

The Settings page is accessible from the left navigation menu. It is split into several sections: General, Reports, Reviews, Backups, and actions for import/export/revert.

Most settings require the `settings:read` permission to view and `settings:update` to modify. Backup management requires `backups:read` and `backups:create`.

![Settings page overview](/_images/settings-overview.png)

## General

**Language** — Change the display language of the PwnDoc interface. This is a per-instance setting.

## Reports

Controls how generated reports look and what fields are required during audits.

![Reports section of Settings](/_images/settings-reports.png)

### Image border

Toggle a border around images embedded in reports, and choose the border color with the color picker.

### CVSS Colors

Customize the highlight colors used for each CVSS severity level in reports:

| Severity | Default |
|----------|---------|
| Critical | Red |
| High | Orange |
| Medium | Yellow |
| Low | Green |
| Informational | Blue |

### Captions

Define the caption labels used in reports (e.g., "Figure", "Table"). Multiple captions can be added as chips.

### Highlight Warning

Enable a colored highlight warning in reports. Choose a color from the preset palette (15 colors available).

### Default Required Fields

Control which fields are mandatory when creating or editing audits and findings. Fields are grouped by section:

**General:**
- Company
- Client
- Start Date
- End Date
- Reporting Date
- Scope

**Findings:**
- Type
- Description
- Observation
- References
- Proofs
- Affected Assets
- Remediation Difficulty
- Remediation Priority
- Remediation

### Scoring Types

Enable or disable scoring systems available on findings:

- **CVSS 3** — CVSSv3 scoring
- **CVSS 4** — CVSSv4 scoring

At least one scoring type must remain enabled if you use CVSS scoring in your audits.

### Spellcheck

Enable grammar and spellcheck powered by [LanguageTool](https://languagetool.org/).

![Spellcheck configuration fields and Test Connection button](/_images/settings-spellcheck.png)

**Enable Spellcheck** — Toggle to turn spellcheck on or off across the application.

When enabled, configure the LanguageTool connection:

| Field | Description |
|-------|-------------|
| LanguageTool URL | Base URL of your LanguageTool instance (e.g. `http://pwndoc-languagetools:8020` for the bundled container) |
| API Key | Optional API key for authenticated LanguageTool instances |
| Username | Optional username for authenticated instances |

**Test Connection** — Click to validate the configuration. The result shows status badges for each check:

- **Reachable** — The URL responds
- **LanguageTool** — The endpoint is a valid LanguageTool API
- **Auth Valid** — API key / username credentials are accepted (if required)
- **Requires API Key** — The instance requires authentication
- **Supports Custom Rules** — The instance supports loading custom grammar rules

> If you're using the bundled `--with-lt` LanguageTool container, run `./pwndoc-cli lt-apikey` to get the generated API key.

Per-user spellcheck preferences (enabled rule categories) are configured in the [user profile](profile.md).

## Reviews

Control the audit review and approval workflow.

![Reviews section of Settings](/_images/settings-reviews.png)

**Enable Reviews** — When enabled, audits go through a EDIT → REVIEW → APPROVED state machine before being considered final. Requires users to have the `audits:review` permission.

**Audit Update After Approval** — When an approved audit is modified:
- **Remove all approvals** — Resets the audit to EDIT state, requiring a new review cycle
- **Keep approvals** — Audit remains approved; change is recorded without invalidating the review

**Mandatory Review** — Require a minimum number of reviewers before an audit can be marked approved. Set the minimum reviewer count (1–99).

See [Audits → Reviews](audits.md#reviews) for the full review workflow.

## Backups

Create, manage, download, and restore application backups.

![Backups section showing the backup list table](/_images/settings-backups.png)

### Create a Backup

Click **Create Backup** to open the backup dialog.

![Create Backup dialog](/_images/settings-backup-create.png)

| Field | Description |
|-------|-------------|
| Name | A label for the backup file |
| Type | **Full** (all data) or **Partial** (select specific data types) |
| Data | For partial backups: choose which data to include (see tree below) |
| Encrypt | Optional password to encrypt the backup with AES-256 |

**Partial backup data options** (dependencies are enforced automatically):

- Audits
- Vulnerabilities
- Users
- Customers
  - Clients (requires Customers)
- Templates
- Custom Data
  - Languages
  - Audit Types
  - Vulnerability Types
  - Vulnerability Categories
  - Custom Fields
  - Custom Sections
- Settings

Backups are stored on the server. The list shows each backup's name, size, and creation date.

### Restore a Backup

Select a backup from the list and click **Restore**.

![Restore Backup dialog](/_images/settings-backup-restore.png)

Choose the restore mode:

| Mode | Behavior |
|------|----------|
| **Upsert** | Merges the backup into existing data. Existing records are updated; new records are added. Nothing is deleted. |
| **Revert** | Replaces existing data with the backup. Records not in the backup are deleted. |

Then select which data categories to restore from the backup.

> Disk space is checked before backup and restore operations. The operation will not proceed if there is insufficient space.

### Download a Backup

Click the download icon next to a backup to save it locally as a `.tar.gz` file (or `.tar.gz.enc` if encrypted).

### Upload a Backup

Click **Upload** to upload a previously downloaded backup file. Once uploaded, it appears in the list and can be restored.

### Delete a Backup

Click the delete icon next to a backup and confirm to remove it from the server.

---

## Import / Export / Revert

These actions appear at the bottom of the Settings page (requires `settings:update`).

| Action | Description |
|--------|-------------|
| **Save Settings** | Persist the current settings to the database |
| **Export Settings** | Download current settings as a JSON file |
| **Import Settings** | Upload a previously exported settings JSON file |
| **Revert to Defaults** | Reset all settings to factory defaults (confirmation required) |
