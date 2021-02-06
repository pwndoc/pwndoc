# Roles

> Pwndoc can manage different user account roles to access different kind of data with some level of granularity<br>
> There are 2 builtins roles: user and admin. But additional custom roles can easily be added. 

## List of permissions

Here is the list of available permissions to access data:

| Audits          | Vulnerabilities                 | Data              | Custom Data                     |
|:---------------:|:-------------------------------:|:-----------------:|:-------------------------------:|
| audits:create     | vulnerabilities:create        | users:create      | languages:create                |
| audits:read       | vulnerabilities:read          | users:read        | languages:read                  |
| audits:update     | vulnerabilities:update        | users:update      | languages:update                |
| audits:delete     | vulnerabilities:delete        | users:delete      | languages:delete                |
| audits:read-all   | vulnerability-updates:create  | clients:create    | audit-types:create              |
| audits:update-all |                               | clients:read      | audit-types:read                |
| audits:delete-all |                               | clients:update    | audit-types:update              |
|                   |                               | clients:delete    | audit-types:delete              |
|                   |                               | companies:create  | vulnerability-types:create      |
|                   |                               | companies:read    | vulnerability-types:read        |
|                   |                               | companies:update  | vulnerability-types:update      |
|                   |                               | companies:delete  | vulnerability-types:delete      |
|                   |                               | templates:create  | vulnerability-categories:create |
|                   |                               | templates:read    | vulnerability-categories:read   |
|                   |                               | templates:update  | vulnerability-categories:update |
|                   |                               | templates:delete  | vulnerability-categories:delete |
|                   |                               | roles:read        | custom-fields:create            |
|                   |                               |                   | custom-fields:read              |
|                   |                               |                   | custom-fields:update            |
|                   |                               |                   | custom-fields:delete            |
|                   |                               |                   | sections:create                 |
|                   |                               |                   | sections:read                   |
|                   |                               |                   | sections:update                 |
|                   |                               |                   | sections:delete                 |


## Built-In Roles

### user

This role has following permissions:

- audits:create, audits:read, audits:update, audits:delete
- vulnerabilities:read, vulnerability-updates:create
- users:read, roles:read
- clients:create, clients:read, clients:update, clients:delete
- companies:create, companies:read, companies:update, companies:delete
- templates:read
- languages:read, audit-types:read, vulnerability-types:read, vulnerability-categories:read, sections:read, custom-fields:read

### admin

This role has full permissions access

## Create additional Roles

Custom roles can be defined in `backend/src/lib/roles.json`
The format is:

```
role_name: {
  allows: [], // Array of allowed permissions to access or use '*' for all (admin)
  inherits: [] // Array of inherited users permissions
}
```

A default custom role is already defined as a `report` role for example:
```
"report": {
  "inherits": ["user"],
  "allows": [
    "audits:read-all"
  ]
}
```

This role inherits all `user` permissions but since `user` can only access and modify its own Audits, we add the `audits:read-all` permission to `report` to access all Audits.  
To update and delete all Audits additional `audits:update-all` and `audits:delete-all` would be required.
