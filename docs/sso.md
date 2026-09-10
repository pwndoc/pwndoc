# OpenID Connect single sign-on

PwnDoc can authenticate users with a standards-compliant OpenID Connect (OIDC) provider. The integration uses Authorization Code flow with PKCE, `state`, and `nonce`. Provider metadata and signing keys are obtained through OIDC discovery.

Local username/password authentication remains enabled by default and can be disabled after SSO has been validated.

## Provider registration

Create an OIDC client in the identity provider and register the exact callback URL used by PwnDoc:

```
https://pwndoc.example.com/api/auth/oidc/callback
```

The provider must support OIDC discovery and Authorization Code flow. PwnDoc requests `openid profile email` by default.

## Configuration

Pass the following variables to the `pwndoc-backend` container. Do not store the client secret in the repository.

| Variable | Default | Description |
| --- | --- | --- |
| `OIDC_ENABLED` | `false` | Enables OIDC authentication. |
| `OIDC_ISSUER` | | OIDC issuer identifier used for discovery. |
| `OIDC_CLIENT_ID` | | Registered client identifier. |
| `OIDC_CLIENT_SECRET` | | Client secret. Required unless the authentication method is `none`. |
| `OIDC_CLIENT_AUTH_METHOD` | `client_secret_post` | `client_secret_post`, `client_secret_basic`, or `none`. |
| `OIDC_REDIRECT_URI` | | Exact registered callback URL. |
| `OIDC_SUCCESS_REDIRECT` | `/` | Same-origin frontend path used after a successful callback. |
| `OIDC_FAILURE_REDIRECT` | `/login` | Same-origin frontend path used after a failed callback. |
| `OIDC_SCOPES` | `openid profile email` | Space-separated scopes. |
| `OIDC_BUTTON_LABEL` | `Sign in with SSO` | Label displayed on the login page. |
| `AUTH_LOCAL_ENABLED` | `true` | Enables local username/password login. |
| `OIDC_AUTO_PROVISION` | `false` | Creates a PwnDoc user after the first successful SSO login. |
| `OIDC_ACCOUNT_LINKING` | `disabled` | Set to `by_username` to explicitly allow linking an unlinked local account to an SSO subject. |
| `OIDC_SYNC_PROFILE` | `true` | Updates first name, last name, and email at login. |
| `OIDC_FETCH_USERINFO` | `true` | Retrieves claims from the provider UserInfo endpoint. |
| `OIDC_USERNAME_CLAIM` | `preferred_username` | Claim used for the PwnDoc username. Email and subject are fallbacks. |
| `OIDC_EMAIL_CLAIM` | `email` | Email claim. Dotted claim paths are supported. |
| `OIDC_FIRST_NAME_CLAIM` | `given_name` | First-name claim. |
| `OIDC_LAST_NAME_CLAIM` | `family_name` | Last-name claim. |
| `OIDC_DISPLAY_NAME_CLAIM` | `name` | Display-name claim used when first or last name is absent. |
| `OIDC_GROUPS_CLAIM` | `groups` | Group claim. Dotted claim paths are supported. |
| `OIDC_ALLOWED_GROUPS` | | Comma-separated allowlist. Empty allows all authenticated identities. |
| `OIDC_DEFAULT_ROLES` | `user` | Comma-separated PwnDoc roles used when no group mapping matches. |
| `OIDC_ROLE_MAPPINGS` | `{}` | JSON object mapping provider groups to PwnDoc role names. |
| `OIDC_SYNC_ROLES` | `true` | Re-evaluates PwnDoc roles from group mappings at every login. |
| `OIDC_COOKIE_SECURE` | `true` in production | Controls the `Secure` flag for OIDC and PwnDoc authentication cookies. |
| `OIDC_ALLOW_INSECURE_HTTP` | `false` | Allows HTTP issuer and callback URLs for local testing only. |
| `OIDC_HTTP_TIMEOUT_SECONDS` | `10` | Discovery and provider request timeout, from 1 to 120 seconds. |

Example Docker Compose override:

```yaml
services:
  pwndoc-backend:
    environment:
      OIDC_ENABLED: "true"
      OIDC_ISSUER: "https://identity.example.com"
      OIDC_CLIENT_ID: "pwndoc"
      OIDC_CLIENT_SECRET: "${PWNDOC_OIDC_CLIENT_SECRET}"
      OIDC_REDIRECT_URI: "https://pwndoc.example.com/api/auth/oidc/callback"
      OIDC_AUTO_PROVISION: "true"
      OIDC_ALLOWED_GROUPS: "pwndoc-users,pwndoc-admins"
      OIDC_ROLE_MAPPINGS: '{"pwndoc-users":"user","pwndoc-admins":["user","admin"]}'
```

Restart the backend after changing the environment.

The backend requires Node.js 20 or newer when run outside the supplied Docker image. The production Dockerfile uses the current Node.js LTS image.

## Provisioning and account linking

An OIDC identity is permanently associated with the tuple `(issuer, subject)`, not with an email address or display name. This avoids account takeover when mutable claims change.

- With automatic provisioning enabled, a new PwnDoc account is created with an unusable random local password.
- Automatic linking to an existing local account is disabled by default.
- `OIDC_ACCOUNT_LINKING=by_username` permits one-time linking only when the configured username claim exactly matches an existing PwnDoc username.
- Unknown mapped roles are ignored. If no valid role remains, the `user` role is applied.
- Role synchronization cannot remove the last enabled PwnDoc administrator.

Keep local authentication enabled until at least one SSO administrator can sign in. Use explicit group-to-role mappings before assigning the `admin` role.

## Local development

HTTP is rejected by default. For a local-only provider and callback, set both:

```
OIDC_ALLOW_INSECURE_HTTP=true
OIDC_COOKIE_SECURE=false
```

Never use those settings in production.

## Logout

Signing out removes the PwnDoc session. Provider-side single logout is intentionally provider-neutral and is not initiated automatically; users may still have an active identity-provider session.
