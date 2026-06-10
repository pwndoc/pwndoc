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
| `user` | Can create and manage assigned audits, read vulnerabilities, manage clients and companies, read custom data, use spellcheck, and view public settings |
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

Custom roles can be defined in `backend/src/config/roles.json`.

The format is:

```js
role_name: {
  allows: [], // Array of allowed permissions to access or use '*' for all (admin)
  inherits: [] // Array of inherited users permissions
}
```

A default custom role is already defined as a `report` role for example:

```json
"report": {
  "inherits": ["user"],
  "allows": [
    "audits:read-all"
  ]
}
```

This role inherits all `user` permissions. Since `user` can only access and modify its own audits, `audits:read-all` gives the `report` role access to all audits.
To update and delete all audits, additional `audits:update-all` and `audits:delete-all` permissions would be required.

To be able to properly use the review feature of the application, a reviewer role should be added. This reviewer should have the `audits:review` or `audits:review-all` permissions to be able to review reports. A reviewer with only the `audits:review` permission can only review the reports on which they are assigned. The role could look like the following: 

```json
"reviewer": {
  "inherits": ["user"],
  "allows": [
    "audits:review"
  ]
}
```
A reviewer with the `audits:review-all` permission should also have the `audits:read-all` permission to be able to take full advantage of the first one. The role could look like the following:

```json
"reviewer": {
  "inherits": ["user"],
  "allows": [
    "audits:review-all",
    "audits:read-all"
  ]
}
```

Keep in mind that these two roles inherit their permissions from the `user` role, which means that they can also create their own audits. A reviewer cannot review an audit for which they are the creator or a collaborator.
