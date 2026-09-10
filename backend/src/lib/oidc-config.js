const DEFAULT_SCOPES = 'openid profile email';

function parseBoolean(value, defaultValue) {
    if (value === undefined || value === null || value === '')
        return defaultValue;

    if (typeof value === 'boolean')
        return value;

    switch (String(value).trim().toLowerCase()) {
    case 'true':
    case '1':
    case 'yes':
    case 'on':
        return true;
    case 'false':
    case '0':
    case 'no':
    case 'off':
        return false;
    default:
        throw new Error(`Invalid boolean value: ${value}`);
    }
}

function parseList(value, defaultValue = []) {
    if (value === undefined || value === null || value === '')
        return [...defaultValue];

    return String(value)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

function parseRoleMappings(value) {
    if (!value)
        return {};

    let parsed;
    try {
        parsed = JSON.parse(value);
    }
    catch (err) {
        throw new Error('OIDC_ROLE_MAPPINGS must be a JSON object');
    }

    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')
        throw new Error('OIDC_ROLE_MAPPINGS must be a JSON object');

    return Object.fromEntries(Object.entries(parsed).map(([group, roles]) => {
        const normalizedRoles = Array.isArray(roles) ? roles : [roles];
        if (!group || normalizedRoles.some(role => typeof role !== 'string' || !role.trim()))
            throw new Error('OIDC_ROLE_MAPPINGS values must be role names or arrays of role names');
        return [group, normalizedRoles.map(role => role.trim())];
    }));
}

function validateAbsoluteUrl(value, name, allowInsecureHttp) {
    let url;
    try {
        url = new URL(value);
    }
    catch (err) {
        throw new Error(`${name} must be an absolute URL`);
    }

    if (url.protocol !== 'https:' && !(allowInsecureHttp && url.protocol === 'http:'))
        throw new Error(`${name} must use HTTPS`);

    return url.toString();
}

function validateRelativePath(value, name) {
    if (!value.startsWith('/') || value.startsWith('//'))
        throw new Error(`${name} must be a same-origin absolute path`);
    return value;
}

function getOidcConfig(env = process.env) {
    const enabled = parseBoolean(env.OIDC_ENABLED, false);
    const localLoginEnabled = parseBoolean(env.AUTH_LOCAL_ENABLED, true);
    const allowInsecureHttp = parseBoolean(env.OIDC_ALLOW_INSECURE_HTTP, false);

    const config = {
        enabled,
        localLoginEnabled,
        buttonLabel: env.OIDC_BUTTON_LABEL?.trim() || 'Sign in with SSO',
        issuer: env.OIDC_ISSUER?.trim() || '',
        clientId: env.OIDC_CLIENT_ID?.trim() || '',
        clientSecret: env.OIDC_CLIENT_SECRET || '',
        clientAuthMethod: env.OIDC_CLIENT_AUTH_METHOD?.trim() || 'client_secret_post',
        redirectUri: env.OIDC_REDIRECT_URI?.trim() || '',
        scopes: env.OIDC_SCOPES?.trim() || DEFAULT_SCOPES,
        successRedirect: validateRelativePath(env.OIDC_SUCCESS_REDIRECT?.trim() || '/', 'OIDC_SUCCESS_REDIRECT'),
        failureRedirect: validateRelativePath(env.OIDC_FAILURE_REDIRECT?.trim() || '/login', 'OIDC_FAILURE_REDIRECT'),
        cookieSecure: parseBoolean(env.OIDC_COOKIE_SECURE, (env.NODE_ENV || 'dev') === 'prod'),
        allowInsecureHttp,
        autoProvision: parseBoolean(env.OIDC_AUTO_PROVISION, false),
        accountLinking: env.OIDC_ACCOUNT_LINKING?.trim() || 'disabled',
        syncProfile: parseBoolean(env.OIDC_SYNC_PROFILE, true),
        syncRoles: parseBoolean(env.OIDC_SYNC_ROLES, true),
        fetchUserInfo: parseBoolean(env.OIDC_FETCH_USERINFO, true),
        usernameClaim: env.OIDC_USERNAME_CLAIM?.trim() || 'preferred_username',
        emailClaim: env.OIDC_EMAIL_CLAIM?.trim() || 'email',
        firstNameClaim: env.OIDC_FIRST_NAME_CLAIM?.trim() || 'given_name',
        lastNameClaim: env.OIDC_LAST_NAME_CLAIM?.trim() || 'family_name',
        displayNameClaim: env.OIDC_DISPLAY_NAME_CLAIM?.trim() || 'name',
        groupsClaim: env.OIDC_GROUPS_CLAIM?.trim() || 'groups',
        allowedGroups: parseList(env.OIDC_ALLOWED_GROUPS),
        defaultRoles: parseList(env.OIDC_DEFAULT_ROLES, ['user']),
        roleMappings: parseRoleMappings(env.OIDC_ROLE_MAPPINGS),
        transactionTtlSeconds: 600,
        httpTimeoutSeconds: Number.parseInt(env.OIDC_HTTP_TIMEOUT_SECONDS || '10', 10)
    };

    if (!enabled)
        return config;

    if (!config.issuer || !config.clientId || !config.redirectUri)
        throw new Error('OIDC_ISSUER, OIDC_CLIENT_ID, and OIDC_REDIRECT_URI are required when OIDC is enabled');

    if (!['client_secret_post', 'client_secret_basic', 'none'].includes(config.clientAuthMethod))
        throw new Error('OIDC_CLIENT_AUTH_METHOD must be client_secret_post, client_secret_basic, or none');

    if (config.clientAuthMethod !== 'none' && !config.clientSecret)
        throw new Error('OIDC_CLIENT_SECRET is required for the configured client authentication method');

    if (!['disabled', 'by_username'].includes(config.accountLinking))
        throw new Error('OIDC_ACCOUNT_LINKING must be disabled or by_username');

    if (!config.scopes.split(/\s+/).includes('openid'))
        throw new Error('OIDC_SCOPES must include openid');

    if (!Number.isInteger(config.httpTimeoutSeconds) || config.httpTimeoutSeconds < 1 || config.httpTimeoutSeconds > 120)
        throw new Error('OIDC_HTTP_TIMEOUT_SECONDS must be an integer between 1 and 120');

    config.issuer = validateAbsoluteUrl(config.issuer, 'OIDC_ISSUER', allowInsecureHttp);
    config.redirectUri = validateAbsoluteUrl(config.redirectUri, 'OIDC_REDIRECT_URI', allowInsecureHttp);

    return config;
}

function getPublicAuthConfig(config) {
    return {
        localLoginEnabled: config.localLoginEnabled,
        oidc: {
            enabled: config.enabled,
            buttonLabel: config.buttonLabel
        }
    };
}

module.exports = {
    getOidcConfig,
    getPublicAuthConfig,
    parseBoolean,
    parseList,
    parseRoleMappings
};
