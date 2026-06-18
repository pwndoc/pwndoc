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
| `audits:create` | Create audits and retests |
| `audits:read` | View audits assigned to the user |
| `audits:read-all` | View all audits |
| `audits:update` | Edit audits assigned to the user |
| `audits:update-all` | Edit all audits |
| `audits:delete` | Delete audits assigned to the user |
| `audits:delete-all` | Delete all audits |
| `audits:review` | Review audits assigned to the user |
| `audits:review-all` | Review all audits |

### Audit Comments

| Permission | Description |
|------------|-------------|
| `audits:comments:create` | Add comments to accessible audits |
| `audits:comments:create-all` | Add comments to any audit |
| `audits:comments:update` | Edit comments on accessible audits |
| `audits:comments:update-all` | Edit comments on any audit |
| `audits:comments:delete` | Delete comments on accessible audits |
| `audits:comments:delete-all` | Delete comments on any audit |

### Vulnerabilities

| Permission | Description |
|------------|-------------|
| `vulnerabilities:create` | Create vulnerabilities |
| `vulnerabilities:read` | View vulnerabilities |
| `vulnerabilities:update` | Edit vulnerabilities and merge updates |
| `vulnerabilities:delete` | Delete individual vulnerabilities |
| `vulnerabilities:delete-all` | Delete all vulnerabilities |
| `vulnerability-updates:create` | Create vulnerability update requests from audit findings |

### Users And Roles

| Permission | Description |
|------------|-------------|
| `users:create` | Create users |
| `users:read` | View users |
| `users:update` | Edit users |
| `roles:read` | View available roles |

### Shared Data

| Permission | Description |
|------------|-------------|
| `clients:create` | Create clients |
| `clients:read` | View clients |
| `clients:update` | Edit clients |
| `clients:delete` | Delete clients |
| `companies:create` | Create companies |
| `companies:read` | View companies |
| `companies:update` | Edit companies |
| `companies:delete` | Delete companies |
| `templates:create` | Upload templates |
| `templates:read` | View and download templates |
| `templates:update` | Edit templates |
| `templates:delete` | Delete templates |
| `images:create` | Upload images |
| `images:read` | View and download images |
| `images:delete` | Delete images |

### Custom Data

#### Languages

| Permission | Description |
|------------|-------------|
| `languages:create` | Create languages |
| `languages:read` | View languages |
| `languages:update` | Edit languages |
| `languages:delete` | Delete languages |

#### Audit Types

| Permission | Description |
|------------|-------------|
| `audit-types:create` | Create audit types |
| `audit-types:read` | View audit types |
| `audit-types:update` | Edit audit types |
| `audit-types:delete` | Delete audit types |

#### Vulnerability Types

| Permission | Description |
|------------|-------------|
| `vulnerability-types:create` | Create vulnerability types |
| `vulnerability-types:read` | View vulnerability types |
| `vulnerability-types:update` | Edit vulnerability types |
| `vulnerability-types:delete` | Delete vulnerability types |

#### Vulnerability Categories

| Permission | Description |
|------------|-------------|
| `vulnerability-categories:create` | Create vulnerability categories |
| `vulnerability-categories:read` | View vulnerability categories |
| `vulnerability-categories:update` | Edit vulnerability categories |
| `vulnerability-categories:delete` | Delete vulnerability categories |

#### Custom Fields

| Permission | Description |
|------------|-------------|
| `custom-fields:create` | Create custom fields |
| `custom-fields:read` | View custom fields |
| `custom-fields:update` | Edit custom fields |
| `custom-fields:delete` | Delete custom fields |

#### Custom Sections

| Permission | Description |
|------------|-------------|
| `sections:create` | Create custom sections |
| `sections:read` | View custom sections |
| `sections:update` | Edit custom sections |
| `sections:delete` | Delete custom sections |

#### Spellcheck

| Permission | Description |
|------------|-------------|
| `spellcheck:read` | Use spellcheck and view the shared dictionary |
| `spellcheck:create` | Add words to the spellcheck dictionary |
| `spellcheck:delete` | Remove words from the spellcheck dictionary |

#### Proofing Rules

| Permission | Description |
|------------|-------------|
| `proofing-rules:read` | View LanguageTool rules and supported languages |
| `proofing-rules:create` | Create LanguageTool rules |
| `proofing-rules:update` | Reload rules or restart the proofing service |
| `proofing-rules:delete` | Delete LanguageTool rules |

### Settings And Backups

| Permission | Description |
|------------|-------------|
| `settings:read` | View settings |
| `settings:read-public` | View public settings |
| `settings:update` | Edit settings, revert settings, and test the spellcheck connection |
| `backups:create` | Create and upload backups |
| `backups:read` | View, download, and check backups |
| `backups:update` | Restore backups |
| `backups:delete` | Delete backups |


## Built-In Roles

| Role | Access |
|------|--------|
| `user` | Assignable core access. Can create and manage assigned audits, read vulnerabilities, manage clients and companies, read custom data, use spellcheck, and view public settings |
| `admin` | Full access to all permissions |

### user

The `user` role has the following permissions:

- audits:create, audits:read, audits:update, audits:delete
- images:create, images:read
- vulnerabilities:read, vulnerability-updates:create
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

Use **Clone From** to copy the permissions from an existing role before saving. This is useful for roles such as:

- `reporter`: clone `user`, then add `audits:read-all`
- `reviewer`: clone `user`, then add `audits:review`
- `lead-reviewer`: clone `user`, then add `audits:review-all` and `audits:read-all`

> Note: screenshot needed — create role dialog with Clone From and the permission matrix.

Custom roles do not inherit from other roles. Each role stores its complete permission list. To change what a role can do, edit the role and update the checked permissions.

Renaming a custom role updates users assigned to that role. Deleting a role removes it from all users. If users are assigned to a role, PwnDoc shows the user count before confirming deletion.

## Assign Roles To Users

Users can have multiple assigned roles. Their effective permissions are the union of all assigned roles. The built-in `user` role is assignable and provides the core application permissions. If a user has no roles, or only roles that no longer exist, PwnDoc still falls back to the built-in `user` role as a safety net.

Assign roles from **Data > Collaborators** when creating or editing a collaborator. The role field accepts multiple values. Both built-in roles, `admin` and `user`, can be assigned directly. Keep `user` assigned when a custom role should add specialized permissions without removing the core permissions.

The Collaborators table also supports bulk updates. Select users, then use the bulk actions to add roles, remove roles, enable accounts, or disable accounts.

From **Data > Roles**, click a role's user count to open **Data > Collaborators** filtered to users with that role.

## Upgrade Notes

Roles are now stored in the database. `backend/src/config/roles.json` is no longer used.

User accounts now store `roles: ['user']` instead of a single `role: 'user'` value. Existing normal users are migrated to the built-in `user` role. The empty-role fallback remains only as a safety net.

Administrators must be restored manually after upgrading:

```js
db.users.updateOne({username: '<admin>'}, {$set: {roles: ['admin']}})
```

Users may need to log in again after upgrading so their JWT contains the new `roles` and `permissions` fields.
