function getClaim(claims, path) {
    if (!claims || !path)
        return undefined;

    return path.split('.').reduce((value, key) => {
        if (value === null || value === undefined || typeof value !== 'object')
            return undefined;
        return value[key];
    }, claims);
}

function claimString(claims, path) {
    const value = getClaim(claims, path);
    if (typeof value !== 'string')
        return '';
    return value.replace(/[\r\n]/g, '').trim();
}

function claimList(claims, path) {
    const value = getClaim(claims, path);
    if (Array.isArray(value))
        return [...new Set(value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean))];
    if (typeof value === 'string' && value.trim())
        return [value.trim()];
    return [];
}

function fallbackNames(displayName, username) {
    const parts = (displayName || username).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return {firstname: 'SSO', lastname: 'User'};
    if (parts.length === 1)
        return {firstname: parts[0], lastname: parts[0]};
    return {firstname: parts[0], lastname: parts.slice(1).join(' ')};
}

function buildOidcIdentity(idTokenClaims, userInfoClaims, config) {
    if (!idTokenClaims || typeof idTokenClaims !== 'object')
        throw {fn: 'Unauthorized', message: 'The identity provider did not return valid ID token claims'};

    const issuer = claimString(idTokenClaims, 'iss');
    const subject = claimString(idTokenClaims, 'sub');
    if (!issuer || !subject)
        throw {fn: 'Unauthorized', message: 'The identity provider response is missing issuer or subject'};

    const claims = {...idTokenClaims, ...(userInfoClaims || {}), iss: issuer, sub: subject};
    const email = claimString(claims, config.emailClaim);
    const username = claimString(claims, config.usernameClaim) || email || subject;
    const displayName = claimString(claims, config.displayNameClaim);
    const fallback = fallbackNames(displayName, username);
    const firstname = claimString(claims, config.firstNameClaim) || fallback.firstname;
    const lastname = claimString(claims, config.lastNameClaim) || fallback.lastname;
    const groups = claimList(claims, config.groupsClaim);

    if (!username)
        throw {fn: 'Unauthorized', message: 'The configured username claim is missing'};

    if (config.allowedGroups.length > 0 && !groups.some(group => config.allowedGroups.includes(group)))
        throw {fn: 'Forbidden', message: 'The SSO account is not in an allowed group'};

    return {issuer, subject, username, email, firstname, lastname, groups};
}

function resolveRoles(groups, config, knownRoles) {
    const roles = [];

    groups.forEach(group => {
        const mappedRoles = Object.prototype.hasOwnProperty.call(config.roleMappings, group) ? config.roleMappings[group] : [];
        roles.push(...mappedRoles);
    });

    if (roles.length === 0)
        roles.push(...config.defaultRoles);

    const resolved = [...new Set(roles)].filter(role => knownRoles.has(role));
    return resolved.length > 0 ? resolved : ['user'];
}

module.exports = {
    buildOidcIdentity,
    claimList,
    getClaim,
    resolveRoles
};
