# Roles

> Pwndoc can manage different user account roles to access different kinds of data with granular permissions.<br>
> There are two built-in roles: user and admin. Additional custom roles can easily be added.

## Permissions

Permissions use the format `resource:action`.

Common actions:

- `read`: view records
- `create`: create records
- `update`: edit records
- `delete`: remove records
- `*-all`: apply the permission to every record, not only records owned by or assigned to the user

### Audits

| Permission | Description |
|------------|-------------|
| `audits:create` | Create default and multi audits, create retests, and link an audit to a parent audit |
| `audits:read` | List, open, export, and read details for audits where the user is creator, collaborator, or reviewer |
| `audits:read-all` | Read every audit, including audits where the user is not assigned |
| `audits:update` | Edit general information, network scope, findings, sections, finding order, review state, and parent links for audits where the user is creator or collaborator |
| `audits:update-all` | Update every audit, including audits where the user is not assigned |
| `audits:delete` | Delete audits created by the user and remove parent links from audits the user can edit |
| `audits:delete-all` | Delete any audit and remove parent links from any audit |
| `audits:review` | Approve or unapprove audits where the user is a reviewer, but not the creator or a collaborator |
| `audits:review-all` | Approve or unapprove any audit, except audits where the user is creator or collaborator |
| `audits:users-connected` | Show connected users in the audits list |
| `audits:ai-generate` | Generate AI content for finding and section fields |
| `audits:ai-qa` | Run AI quality checks on audits |

### Audit Comments

| Permission | Description |
|------------|-------------|
| `audits:comments:create` | Add comments to findings or sections on audits where the user is creator or collaborator |
| `audits:comments:create-all` | Add comments to findings or sections on any audit |
| `audits:comments:update` | Edit comment text, replies, and resolved status on audits where the user is creator or collaborator |
| `audits:comments:update-all` | Edit comment text, replies, and resolved status on any audit |
| `audits:comments:delete` | Delete comments from audits where the user is creator or collaborator |
| `audits:comments:delete-all` | Delete comments from any audit |

### Vulnerabilities

| Permission | Description |
|------------|-------------|
| `vulnerabilities:create` | Create vulnerabilities in the vulnerability database, including imported vulnerability arrays |
| `vulnerabilities:read` | List, export, and read vulnerabilities, including language-specific vulnerability lists |
| `vulnerabilities:update` | Edit vulnerabilities, view pending update requests, and merge language details from another vulnerability |
| `vulnerabilities:delete` | Delete one vulnerability from the vulnerability database |
| `vulnerabilities:delete-all` | Delete every vulnerability from the vulnerability database |
| `vulnerability-updates:create` | Submit a new vulnerability or update request from an audit finding |
| `vulnerabilities:ai-qa` | Run AI quality checks on vulnerabilities |

### Users And Roles

| Permission | Description |
|------------|-------------|
| `users:create` | Create collaborator accounts and assign initial roles |
| `users:read` | List users, view user details, and list users eligible as reviewers |
| `users:update` | Edit collaborators, assign roles, enable or disable accounts, reset TOTP, and bulk update roles or account status |
| `roles:create` | Create custom roles with a display name, technical name, description, and permission list |
| `roles:read` | View system and custom roles, the permissions catalog, and role user counts |
| `roles:update` | Edit custom role names, display names, descriptions, and permissions |
| `roles:delete` | Delete custom roles and remove them from assigned users |

### Shared Data

| Permission | Description |
|------------|-------------|
| `clients:create` | Create clients, optionally linked to a company |
| `clients:read` | List clients |
| `clients:update` | Edit client contact details and company association |
| `clients:delete` | Delete clients |
| `companies:create` | Create companies with optional short name and logo |
| `companies:read` | List companies |
| `companies:update` | Edit company name, short name, and logo |
| `companies:delete` | Delete companies |
| `templates:create` | Upload report templates from a base64 file payload |
| `templates:read` | List templates and download template files |
| `templates:update` | Rename templates and optionally replace the template file |
| `templates:delete` | Delete templates and their stored files |
| `images:create` | Upload stored images, optionally associated with an audit |
| `images:read` | Retrieve image metadata and download image content |
| `images:delete` | Delete stored images |

### Custom Data

#### Languages

| Permission | Description |
|------------|-------------|
| `languages:create` | Create a language with a display name and locale |
| `languages:read` | List configured languages |
| `languages:update` | Replace the configured language list |
| `languages:delete` | Delete a language by locale |

#### Audit Types

| Permission | Description |
|------------|-------------|
| `audit-types:create` | Create audit types with templates, sections, hidden sections, and stage |
| `audit-types:read` | List audit types |
| `audit-types:update` | Replace the configured audit type list |
| `audit-types:delete` | Delete an audit type by name |

#### Vulnerability Types

| Permission | Description |
|------------|-------------|
| `vulnerability-types:create` | Create a vulnerability type for a locale |
| `vulnerability-types:read` | List vulnerability types |
| `vulnerability-types:update` | Update the configured vulnerability type list |
| `vulnerability-types:delete` | Delete a vulnerability type by name |

#### Vulnerability Categories

| Permission | Description |
|------------|-------------|
| `vulnerability-categories:create` | Create vulnerability categories with optional default finding sort settings |
| `vulnerability-categories:read` | List vulnerability categories |
| `vulnerability-categories:update` | Update vulnerability categories and their default sort settings |
| `vulnerability-categories:delete` | Delete a vulnerability category by name |

#### Custom Fields

| Permission | Description |
|------------|-------------|
| `custom-fields:create` | Create custom fields for audits, findings, sections, or vulnerabilities |
| `custom-fields:read` | List custom fields |
| `custom-fields:update` | Update custom field definitions, layout settings, text, options, and ordering |
| `custom-fields:delete` | Delete a custom field by ID |

#### Custom Sections

| Permission | Description |
|------------|-------------|
| `sections:create` | Create custom sections with field, name, locale, default text, and icon |
| `sections:read` | List custom sections |
| `sections:update` | Update custom section names, fields, and icons |
| `sections:delete` | Delete a custom section by field and locale |

#### Spellcheck

| Permission | Description |
|------------|-------------|
| `spellcheck:read` | Check text with LanguageTool, view spellcheck capabilities, and list dictionary words |
| `spellcheck:create` | Add words to the shared spellcheck dictionary |
| `spellcheck:delete` | Remove words from the shared spellcheck dictionary |

#### Proofing Rules

| Permission | Description |
|------------|-------------|
| `proofing-rules:read` | List custom LanguageTool rules, view rule XML, and fetch supported languages from LanguageTool |
| `proofing-rules:create` | Create custom LanguageTool rules from XML and push them to LanguageTool |
| `proofing-rules:update` | Reload stored rules into LanguageTool or restart the LanguageTool process |
| `proofing-rules:delete` | Delete custom LanguageTool rules and update LanguageTool |

### AI

| Permission | Description |
|------------|-------------|
| `ai:prompts:read` | View field generation prompts for findings and sections |
| `ai:prompts:update` | Edit field generation prompts for findings and sections |
| `ai:redaction-guidelines:read` | View organization-wide redaction guidelines |
| `ai:redaction-guidelines:update` | Edit organization-wide redaction guidelines |
| `ai:qa-instructions:read` | View QA instructions and automated QA check toggles |
| `ai:qa-instructions:update` | Edit QA instructions and automated QA check toggles |

### Settings And Backups

| Permission | Description |
|------------|-------------|
| `settings:read` | View all settings, including private settings, and export them as JSON |
| `settings:read-public` | View public settings used by the frontend |
| `settings:update` | Edit settings, restore default settings, and test a LanguageTool connection |
| `ai-settings:read` | View AI provider configuration and the global AI enable toggle |
| `ai-settings:update` | Edit AI provider configuration and the global AI enable toggle |
| `backups:create` | Create partial or full backups and upload backup archives |
| `backups:read` | List backups, view backup or restore status, and download backup archives |
| `backups:update` | Restore backup archives, including password-protected and partial restores |
| `backups:delete` | Delete backup archives |


## Built-In Roles

| Role | Access |
|------|--------|
| `user` | Assignable core access. Can create, manage, and comment on assigned audits, upload and read images, read vulnerabilities, view users and roles, manage clients and companies, read templates and custom data, use spellcheck and AI features, and view public settings |
| `admin` | Full access to all permissions |

### user

The `user` role has the following permissions:

- audits:create, audits:read, audits:update, audits:delete
- audits:comments:create, audits:comments:update, audits:comments:delete
- audits:ai-generate, audits:ai-qa
- images:create, images:read
- vulnerabilities:read, vulnerability-updates:create, vulnerabilities:ai-qa
- users:read, roles:read
- clients:create, clients:read, clients:update, clients:delete
- companies:create, companies:read, companies:update, companies:delete
- templates:read
- languages:read, audit-types:read, vulnerability-types:read, vulnerability-categories:read, sections:read, custom-fields:read
- spellcheck:read, spellcheck:create
- settings:read-public

### admin

The `admin` role has full permission access.

## Create Additional Roles

Custom roles are managed from **Data > Roles**. The table shows the built-in `admin` and `user` roles as locked system rows and any custom roles as editable rows. Use the search field to find roles by display name, technical name, or description, and use the type filter to show all roles, system roles, or custom roles.

The table summarizes each role with:

- The role display name, technical name, and optional description
- The role type, either system or custom
- The number of enabled permissions with a progress bar
- The number of assigned users
- Direct actions for editable custom roles

Click **Create Role** to add a custom role. The display name is used in the interface and must be unique, ignoring case. The technical role name is the stored identifier used for permission checks and user assignments; it may contain letters, numbers, underscores, and hyphens. When the technical name is empty, PwnDoc fills it from the display name using lowercase words separated by dashes. A description can be added to explain the purpose of the role. Select permissions from the permission matrix. New roles start with the same core permissions as the built-in `user` role.

Use **Clone From** to copy the permissions from an existing custom role before saving. New roles already start with the built-in `user` role's core permissions, so you can create roles such as:

- `reporter`: keep the default core permissions, then add `audits:read-all`
- `reviewer`: keep the default core permissions, then add `audits:review`
- `lead-reviewer`: keep the default core permissions, then add `audits:review-all` and `audits:read-all`

Custom roles do not inherit from other roles. Each role stores its complete permission list. To change what a role can do, edit the role and update the checked permissions.

Renaming a custom role updates users assigned to that role. Deleting a role removes it from all users. If users are assigned to a role, PwnDoc shows the user count before confirming deletion.

## Assign Roles To Users

Users can have multiple assigned roles. Their effective permissions are the union of all assigned roles. The built-in `user` role is assignable and provides the core application permissions. If a user has no roles, or only roles that no longer exist, PwnDoc still falls back to the built-in `user` role as a safety net.

Assign roles from **Data > Collaborators** when creating or editing a collaborator. The role field accepts multiple values. Both built-in roles, `admin` and `user`, can be assigned directly. Keep `user` assigned when a custom role should add specialized permissions without removing the core permissions.

The Collaborators table also supports bulk updates. Select users, then use the bulk actions to add roles, remove roles, enable accounts, or disable accounts.

From **Data > Roles**, click a role's user count to open **Data > Collaborators** filtered to users with that role.

## Upgrade Notes

Roles are now stored in the database. During upgrade, PwnDoc imports legacy custom roles from `backend/src/config/roles.json`; after migration, that file is no longer used for role checks.

User accounts now store `roles: ['user']` instead of a single `role: 'user'` value. Existing users are migrated to the matching built-in or custom role. The empty-role fallback remains only as a safety net.

If an administrator was created or modified outside the normal user model and does not have the `admin` role after upgrading, restore it manually:

```js
db.users.updateOne({username: '<admin>'}, {$set: {roles: ['admin']}})
```

Users may need to log in again after upgrading so their JWT contains the new `roles` and `permissions` fields.
