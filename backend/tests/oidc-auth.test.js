const {getOidcConfig, getPublicAuthConfig} = require('../src/lib/oidc-config');
const {buildOidcIdentity, resolveRoles} = require('../src/lib/oidc-identity');

function enabledEnvironment(overrides = {}) {
    return {
        NODE_ENV: 'test',
        OIDC_ENABLED: 'true',
        OIDC_ISSUER: 'https://identity.example.test',
        OIDC_CLIENT_ID: 'pwndoc',
        OIDC_CLIENT_SECRET: 'not-a-real-secret',
        OIDC_REDIRECT_URI: 'https://pwndoc.example.test/api/auth/oidc/callback',
        ...overrides
    };
}

describe('OIDC configuration', () => {
    test('is disabled by default and exposes no secrets publicly', () => {
        const config = getOidcConfig({NODE_ENV: 'test'});

        expect(config.enabled).toBe(false);
        expect(getPublicAuthConfig(config)).toEqual({
            localLoginEnabled: true,
            oidc: {enabled: false, buttonLabel: 'Sign in with SSO'}
        });
    });

    test('parses generic provisioning and role mapping settings', () => {
        const config = getOidcConfig(enabledEnvironment({
            OIDC_AUTO_PROVISION: 'true',
            OIDC_ALLOWED_GROUPS: 'security, auditors',
            OIDC_ROLE_MAPPINGS: '{"security":["admin","user"],"auditors":"user"}',
            OIDC_BUTTON_LABEL: 'Corporate login'
        }));

        expect(config.autoProvision).toBe(true);
        expect(config.successRedirect).toBe('/');
        expect(config.failureRedirect).toBe('/login');
        expect(config.allowedGroups).toEqual(['security', 'auditors']);
        expect(config.roleMappings).toEqual({security: ['admin', 'user'], auditors: ['user']});
        expect(getPublicAuthConfig(config).oidc.buttonLabel).toBe('Corporate login');
        expect(JSON.stringify(getPublicAuthConfig(config))).not.toContain('not-a-real-secret');
    });

    test('rejects insecure endpoints unless explicitly allowed', () => {
        expect(() => getOidcConfig(enabledEnvironment({
            OIDC_ISSUER: 'http://identity.example.test'
        }))).toThrow('OIDC_ISSUER must use HTTPS');
    });

    test('requires a secret for confidential client authentication', () => {
        expect(() => getOidcConfig(enabledEnvironment({OIDC_CLIENT_SECRET: ''})))
            .toThrow('OIDC_CLIENT_SECRET is required');
    });

    test('requires the OpenID Connect scope', () => {
        expect(() => getOidcConfig({
            OIDC_ENABLED: 'true',
            OIDC_ISSUER: 'https://identity.example.test',
            OIDC_CLIENT_ID: 'pwndoc',
            OIDC_CLIENT_SECRET: 'not-a-real-secret',
            OIDC_REDIRECT_URI: 'https://pwndoc.example.test/api/auth/oidc/callback',
            OIDC_SCOPES: 'profile email'
        })).toThrow('OIDC_SCOPES must include openid');
    });
});

describe('OIDC identity mapping', () => {
    test('maps standard and nested claims without trusting provider roles directly', () => {
        const config = getOidcConfig(enabledEnvironment({
            OIDC_GROUPS_CLAIM: 'realm_access.roles',
            OIDC_ALLOWED_GROUPS: 'pwndoc-users',
            OIDC_ROLE_MAPPINGS: '{"pwndoc-admins":"admin","pwndoc-users":"user"}'
        }));
        const identity = buildOidcIdentity({
            iss: 'https://identity.example.test/',
            sub: 'subject-123',
            preferred_username: 'alice',
            name: 'Alice Example',
            realm_access: {roles: ['pwndoc-users', 'pwndoc-admins']}
        }, {
            email: 'alice@example.test',
            given_name: 'Alice',
            family_name: 'Example'
        }, config);

        expect(identity).toEqual({
            issuer: 'https://identity.example.test/',
            subject: 'subject-123',
            username: 'alice',
            email: 'alice@example.test',
            firstname: 'Alice',
            lastname: 'Example',
            groups: ['pwndoc-users', 'pwndoc-admins']
        });
        expect(resolveRoles(identity.groups, config, new Set(['admin', 'user'])))
            .toEqual(['user', 'admin']);
    });

    test('denies users outside the configured groups', () => {
        const config = getOidcConfig(enabledEnvironment({OIDC_ALLOWED_GROUPS: 'pwndoc-users'}));

        try {
            buildOidcIdentity({
                iss: 'https://identity.example.test/',
                sub: 'subject-123',
                preferred_username: 'alice',
                groups: ['another-group']
            }, {}, config);
            throw new Error('Expected group authorization to fail');
        }
        catch (err) {
            expect(err).toMatchObject({fn: 'Forbidden'});
        }
    });

    test('filters unknown PwnDoc roles and falls back to user', () => {
        const config = getOidcConfig(enabledEnvironment({
            OIDC_DEFAULT_ROLES: 'unknown-role'
        }));

        expect(resolveRoles([], config, new Set(['admin', 'user']))).toEqual(['user']);
    });
});
