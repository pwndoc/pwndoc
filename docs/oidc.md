# OpenID Connect authentication and role synchronization

PwnDoc can authenticate users through any standards-compliant OpenID Connect provider. After OIDC verifies the identity and external authorization claim, PwnDoc issues its usual JWT and refresh token and applies its existing permissions.

OIDC-managed users can be provisioned automatically and assigned any existing PwnDoc role, including custom roles. The recommended authorization source is an OIDC roles claim. A groups claim remains available as a compatibility fallback.

## Configuration

Set these variables in `.env` before starting PwnDoc:

| Variable | Required | Description |
| --- | --- | --- |
| `OIDC_ENABLED` | Yes | Set to `true` to show and enable OIDC login. |
| `OIDC_ISSUER` | Yes | Exact issuer URL used for provider discovery. |
| `OIDC_CLIENT_ID` | Yes | OIDC client identifier. |
| `OIDC_CLIENT_SECRET` | Provider dependent | Confidential-client secret. |
| `OIDC_REDIRECT_URI` | Yes | Registered callback URL, normally `https://<pwndoc>/api/auth/oidc/callback`. |
| `OIDC_SUCCESS_REDIRECT` | No | Local page opened after login; defaults to `/`. |
| `OIDC_DISPLAY_NAME` | No | Text shown on the login button. |
| `OIDC_SCOPE` | No | Defaults to `openid profile email`. |
| `OIDC_IDENTITY_CLAIM` | No | Stable claim used to link users. Defaults to `sub`; `oid` is also supported. |
| `OIDC_JIT_ENABLED` | No | Creates and role-manages users after a verified, authorized login. Defaults to `false`. |
| `OIDC_ROLE_CLAIM` | No | Claim containing external roles. Defaults to `roles`. Exact claim names and dotted paths such as `realm_access.roles` are supported. |
| `OIDC_ROLE_MAPPINGS` | No | Ordered JSON array of external-to-internal role mappings. The first match wins. |
| `OIDC_GROUP_CLAIM` | No | Compatibility claim containing groups. Defaults to `groups`. |
| `OIDC_GROUP_MAPPINGS` | No | Ordered JSON array of external group-to-internal role mappings. Used only if the roles claim has no match. |
| `OIDC_REAUTH_INTERVAL_MINUTES` | No | Maximum external session age before refresh requires a new OIDC login. Defaults to 480 (8 hours). |

The provider client must enable Authorization Code flow. PwnDoc uses discovery, PKCE, state and nonce validation.

## Role resolution

Mappings use this format:

```env
OIDC_ROLE_MAPPINGS=[{"external":"company-admin","internal":"admin"},{"external":"company-reader","internal":"readonly"}]
```

`external` is a claim value emitted by the identity provider. `internal` is the technical name of an existing PwnDoc system or custom role. Create custom roles under **Data > Roles** before using them in a mapping.

For an OIDC-managed login, PwnDoc resolves authorization in this order:

1. Read the configured roles claim and select the first configured mapping whose external value is present.
2. If no role mapping matches, optionally apply the same algorithm to the groups claim.
3. If neither claim contains an authorized value, deny the login.

Mapping order defines precedence. For example, putting the admin mapping before the user mapping ensures a token containing both values resolves to `admin`. Role claim values are case-sensitive; group claim values are matched case-insensitively.

The resolved internal role is validated against the PwnDoc role catalog and synchronized on every successful OIDC login. If a mapped custom role is renamed or deleted, login is denied until the configuration is corrected. PwnDoc does not query an external directory or follow distributed-claim URLs.

Only users automatically provisioned and marked as OIDC-managed are synchronized. Manually linked and local accounts keep their PwnDoc roles. In particular, the local `admin` account remains an independent recovery path and can continue to use password authentication.

## Recommended roles-claim setup

Map provider roles to the roles used by a particular PwnDoc installation:

```env
OIDC_JIT_ENABLED=true
OIDC_ROLE_CLAIM=roles
OIDC_ROLE_MAPPINGS=[{"external":"admin","internal":"admin"},{"external":"user","internal":"user"},{"external":"reader","internal":"readonly"}]
```

In this example, `readonly` is a custom PwnDoc role. It is optional: deployments that do not want a read-only role can omit that mapping or map the external value to another existing role.

Providers that nest roles can select a dotted path. For example:

```env
OIDC_ROLE_CLAIM=realm_access.roles
```

External values in one mapping list must be distinct.

### Simple mapping compatibility

For the common `admin` and `user` mapping, these variables remain available when `OIDC_ROLE_MAPPINGS` is empty:

```env
OIDC_ADMIN_ROLE=admin
OIDC_USER_ROLE=user
```

## Groups compatibility fallback

Generic ordered group mappings can target custom roles too:

```env
OIDC_GROUP_CLAIM=groups
OIDC_GROUP_MAPPINGS=[{"external":"PwnDoc Admins","internal":"admin"},{"external":"PwnDoc Readers","internal":"readonly"}]
```

The simple variables `OIDC_ADMIN_GROUP` and `OIDC_USER_GROUP` remain supported when `OIDC_GROUP_MAPPINGS` is empty. New deployments should prefer a roles claim.

If the provider omits groups because they exceed its token limit, PwnDoc denies the group-fallback login instead of calling a provider-specific API. A valid role in the primary roles claim is sufficient and does not depend on the groups claim.

## Link an existing user

With JIT disabled, OIDC does not create users or link accounts by username or email. Create the PwnDoc user normally, then edit it under **Data > Collaborators** and enter:

- **OIDC issuer:** the exact issuer URL, including its path and trailing slash when the provider uses one.
- **OIDC subject:** the value of the configured identity claim, normally `sub`.

Leaving both fields empty removes the link. The same issuer/subject pair cannot be linked to two users. Disabled PwnDoc users remain unable to sign in. Manually linked users retain roles managed inside PwnDoc.

## Microsoft Entra ID example

Register a single-tenant Web application and add the exact PwnDoc callback URL as its redirect URI. Define application roles whose values are `admin` and `user`, then assign Entra users or groups to those application roles. Entra emits assigned application roles in the `roles` claim; PwnDoc does not need to know the groups' Object IDs.

Create the optional internal `readonly` role before configuring this example mapping:

```env
OIDC_ENABLED=true
OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
OIDC_CLIENT_ID=<application-client-id>
OIDC_CLIENT_SECRET=<client-secret>
OIDC_REDIRECT_URI=https://<pwndoc>/api/auth/oidc/callback
OIDC_IDENTITY_CLAIM=oid
OIDC_JIT_ENABLED=true
OIDC_ROLE_CLAIM=roles
OIDC_ROLE_MAPPINGS=[{"external":"admin","internal":"admin"},{"external":"user","internal":"user"}]
OIDC_REAUTH_INTERVAL_MINUTES=480
OIDC_SCOPE=openid profile email
OIDC_DISPLAY_NAME=Sign in with Microsoft
```

Do not use the `common` or `organizations` authorities with this single-issuer configuration.

## Local Keycloak test provider

The optional development compose file imports a disposable Keycloak realm, client and user. It is intended only for local testing.

1. Add `127.0.0.1 pwndoc-keycloak` to the development machine's hosts file so the browser and Docker use the same issuer hostname.
2. Start the development stack:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.oidc-test.yml up --build
   ```

3. Open `https://pwndoc-keycloak:8443/admin/` once and accept the development certificate warning. Then open `https://localhost:18443`, create a local PwnDoc user, and link it with:

   - issuer: `https://pwndoc-keycloak:8443/realms/pwndoc`
   - subject: `11111111-1111-1111-1111-111111111111`

4. Sign out, select **Sign in with Keycloak**, and authenticate as `oidc-user` with password `OidcTest123!`.

The Keycloak administration console is available at `https://pwndoc-keycloak:8443/admin/` with the development-only credentials `admin` / `admin`. The optional compose file generates a persistent self-signed certificate and configures only the development backend to trust it.

For production, use HTTPS for both PwnDoc and the issuer, create a dedicated confidential client, store its secret outside version control, and do not use the bundled realm or credentials.
