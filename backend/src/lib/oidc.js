const jwt = require('jsonwebtoken')
const auth = require('./auth')

const supportedIdentityClaims = ['sub', 'oid']
const internalRolePattern = /^[a-zA-Z0-9_-]+$/

let clientLibrary
let clientConfig
let clientConfigKey

const getClientLibrary = async () => {
    if (!clientLibrary)
        clientLibrary = await import('openid-client')
    return clientLibrary
}

const parseMappings = (raw, variableName, defaults, caseInsensitive = false, allowEmpty = false) => {
    let mappings = defaults
    if (raw) {
        try {
            mappings = JSON.parse(raw)
        }
        catch (_) {
            throw({fn: 'BadParameters', message: `${variableName} must be valid JSON`})
        }
    }
    if (allowEmpty && Array.isArray(mappings) && mappings.length === 0)
        return []
    if (!Array.isArray(mappings) || mappings.length === 0)
        throw({fn: 'BadParameters', message: `${variableName} must be a non-empty array`})

    mappings = mappings.map(mapping => {
        const external = mapping && typeof mapping.external === 'string' ? mapping.external.trim() : ''
        const internal = mapping && typeof mapping.internal === 'string' ? mapping.internal.trim() : ''
        if (!external || !internal || !internalRolePattern.test(internal))
            throw({fn: 'BadParameters', message: `${variableName} entries require external and valid internal role names`})
        return {external, internal}
    })

    const externalValues = mappings.map(mapping => caseInsensitive ? mapping.external.toLowerCase() : mapping.external)
    if (new Set(externalValues).size !== mappings.length)
        throw({fn: 'BadParameters', message: `${variableName} external values must be unique`})
    return mappings
}

const getConfig = () => {
    if (process.env.OIDC_ENABLED !== 'true') return {enabled: false}
    const reauthMinutes = Number.parseInt(process.env.OIDC_REAUTH_INTERVAL_MINUTES || '480', 10)
    const config = {
        enabled: true,
        issuer: process.env.OIDC_ISSUER,
        clientId: process.env.OIDC_CLIENT_ID,
        clientSecret: process.env.OIDC_CLIENT_SECRET,
        redirectUri: process.env.OIDC_REDIRECT_URI,
        successRedirect: process.env.OIDC_SUCCESS_REDIRECT || '/',
        displayName: process.env.OIDC_DISPLAY_NAME || 'SSO',
        scope: process.env.OIDC_SCOPE || 'openid profile email',
        identityClaim: process.env.OIDC_IDENTITY_CLAIM || 'sub',
        jitEnabled: process.env.OIDC_JIT_ENABLED === 'true',
        roleClaim: (process.env.OIDC_ROLE_CLAIM || 'roles').trim(),
        roleMappings: parseMappings(process.env.OIDC_ROLE_MAPPINGS, 'OIDC_ROLE_MAPPINGS', [
            {internal: 'admin', external: (process.env.OIDC_ADMIN_ROLE || 'admin').trim()},
            {internal: 'user', external: (process.env.OIDC_USER_ROLE || 'user').trim()}
        ].filter(mapping => mapping.external)),
        groupClaim: (process.env.OIDC_GROUP_CLAIM || 'groups').trim(),
        groupMappings: parseMappings(process.env.OIDC_GROUP_MAPPINGS, 'OIDC_GROUP_MAPPINGS', [
            {internal: 'admin', external: (process.env.OIDC_ADMIN_GROUP || '').trim()},
            {
                internal: 'user',
                external: (process.env.OIDC_USER_GROUP || '').trim()
            }
        ].filter(mapping => mapping.external), true, true),
        reauthMinutes
    }
    if (!config.issuer || !config.clientId || !config.redirectUri)
        throw({fn: 'BadParameters', message: 'OIDC is enabled but its configuration is incomplete'})
    try {
        config.issuer = new URL(config.issuer).href
        config.redirectUri = new URL(config.redirectUri).href
    }
    catch (_) {
        throw({fn: 'BadParameters', message: 'OIDC issuer and redirect URI must be valid URLs'})
    }
    if (!config.successRedirect.startsWith('/') || config.successRedirect.startsWith('//'))
        throw({fn: 'BadParameters', message: 'OIDC success redirect must be a local path'})
    if (!supportedIdentityClaims.includes(config.identityClaim))
        throw({fn: 'BadParameters', message: 'OIDC identity claim must be sub or oid'})
    if (!config.roleClaim)
        throw({fn: 'BadParameters', message: 'OIDC role claim must not be empty'})
    if (!config.groupClaim)
        throw({fn: 'BadParameters', message: 'OIDC group claim must not be empty'})
    if (!Number.isInteger(config.reauthMinutes) || config.reauthMinutes < 15 || config.reauthMinutes > 10080)
        throw({fn: 'BadParameters', message: 'OIDC reauthentication interval must be between 15 and 10080 minutes'})
    return config
}

const stringClaim = (claims, name) => {
    const value = claims && claims[name]
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

const claimValue = (claims, path) => {
    if (!claims || typeof claims !== 'object') return undefined
    if (Object.prototype.hasOwnProperty.call(claims, path)) return claims[path]
    const forbidden = new Set(['__proto__', 'prototype', 'constructor'])
    return path.split('.').reduce((value, segment) => {
        if (forbidden.has(segment) || !value || typeof value !== 'object' ||
            !Object.prototype.hasOwnProperty.call(value, segment)) return undefined
        return value[segment]
    }, claims)
}

const claimStrings = (claims, path) => {
    const value = claimValue(claims, path)
    const values = Array.isArray(value) ? value : [value]
    return values
    .filter(entry => typeof entry === 'string' && entry.trim())
    .map(entry => entry.trim())
}

const resolveMappedRole = (values, mappings, caseInsensitive = false) => {
    const normalizedValues = new Set(values.map(value => caseInsensitive ? value.toLowerCase() : value))
    const mapping = mappings.find(candidate => {
        const externalValue = caseInsensitive ? candidate.external.toLowerCase() : candidate.external
        return normalizedValues.has(externalValue)
    })
    return mapping && mapping.internal
}

const resolveExternalRole = (claims, config) => {
    const role = resolveMappedRole(claimStrings(claims, config.roleClaim), config.roleMappings)
    if (role) return role

    if (config.groupMappings.length > 0) {
        if (claims._claim_names && claims._claim_names[config.groupClaim])
            throw({fn: 'Unauthorized', message: 'OIDC group membership exceeds the token limit'})
        const groupRole = resolveMappedRole(
            claimStrings(claims, config.groupClaim), config.groupMappings, true
        )
        if (groupRole) return groupRole
    }

    throw({fn: 'Unauthorized', message: 'OIDC user has no authorized role'})
}

const getProvisioningProfile = (claims, subject) => {
    const username = stringClaim(claims, 'preferred_username') || stringClaim(claims, 'email') || subject
    const displayName = stringClaim(claims, 'name') || username
    const nameParts = displayName.split(/\s+/)
    return {
        username,
        firstname: stringClaim(claims, 'given_name') || nameParts[0],
        lastname: stringClaim(claims, 'family_name') || nameParts.slice(1).join(' ') || '-',
        email: stringClaim(claims, 'email') || stringClaim(claims, 'preferred_username')
    }
}

const getClientConfig = async (config) => {
    const key = `${config.issuer}|${config.clientId}|${config.clientSecret || ''}`
    if (!clientConfig || clientConfigKey !== key) {
        const client = await getClientLibrary()
        clientConfig = await client.discovery(new URL(config.issuer), config.clientId, config.clientSecret)
        clientConfigKey = key
    }
    return clientConfig
}

const createAuthorizationRequest = async () => {
    const config = getConfig()
    if (!config.enabled) throw({fn: 'NotFound', message: 'OIDC login is not configured'})
    const client = await getClientLibrary()
    const codeVerifier = client.randomPKCECodeVerifier()
    const state = client.randomState()
    const nonce = client.randomNonce()
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
    const oidcConfig = await getClientConfig(config)
    const url = client.buildAuthorizationUrl(oidcConfig, {
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scope,
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    })
    const transaction = jwt.sign(
        {type: 'oidc-transaction', state, nonce, codeVerifier},
        auth.jwtSecret,
        {algorithm: 'HS256', expiresIn: '10 minutes'}
    )
    return {url: url.href, transaction}
}

const completeAuthorization = async (callbackUrl, transaction) => {
    const config = getConfig()
    if (!config.enabled) throw({fn: 'NotFound', message: 'OIDC login is not configured'})
    let saved
    try {
        saved = jwt.verify(transaction, auth.jwtSecret, {algorithms: ['HS256']})
        if (saved.type !== 'oidc-transaction' ||
            typeof saved.state !== 'string' || !saved.state ||
            typeof saved.nonce !== 'string' || !saved.nonce ||
            typeof saved.codeVerifier !== 'string' || !saved.codeVerifier) {
            throw new Error('invalid transaction payload')
        }
    }
    catch (_) {
        throw({fn: 'Unauthorized', message: 'Invalid or expired OIDC transaction'})
    }
    const client = await getClientLibrary()
    let tokens
    try {
        tokens = await client.authorizationCodeGrant(await getClientConfig(config), callbackUrl, {
            expectedState: saved.state,
            expectedNonce: saved.nonce,
            pkceCodeVerifier: saved.codeVerifier
        })
    }
    catch (_) {
        throw({fn: 'Unauthorized', message: 'OIDC authentication failed'})
    }
    const claims = tokens.claims()
    const subject = claims && claims[config.identityClaim]
    if (typeof subject !== 'string' || !subject)
        throw({fn: 'Unauthorized', message: `OIDC identity does not contain a valid ${config.identityClaim} claim`})
    const resolvedRole = config.jitEnabled ? resolveExternalRole(claims, config) : undefined
    return {
        issuer: config.issuer,
        subject,
        successRedirect: config.successRedirect,
        jitEnabled: config.jitEnabled,
        role: resolvedRole,
        profile: getProvisioningProfile(claims, subject),
        externalAuthExpiresAt: Math.floor(Date.now() / 1000) + (config.reauthMinutes * 60)
    }
}

exports.getConfig = getConfig
exports.createAuthorizationRequest = createAuthorizationRequest
exports.completeAuthorization = completeAuthorization

exports.setClientLibraryForTests = (library) => {
    clientLibrary = library
    clientConfig = undefined
    clientConfigKey = undefined
}
