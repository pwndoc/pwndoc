const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');

const {resolveRoles} = require('./oidc-identity');

async function knownRoleNames() {
    const Role = mongoose.model('Role');
    const customRoles = await Role.getAll();
    return new Set(['admin', 'user', ...customRoles.map(role => role.name)]);
}

async function ensureAdminIsNotOrphaned(User, user, nextRoles) {
    if (!(user.roles || []).includes('admin') || nextRoles.includes('admin'))
        return;

    const remainingAdmins = await User.countDocuments({
        _id: {$ne: user._id},
        roles: 'admin',
        enabled: {$ne: false}
    });
    if (remainingAdmins === 0)
        throw {fn: 'Forbidden', message: 'SSO role synchronization cannot remove the last enabled admin'};
}

async function findOrProvisionOidcUser(identity, config) {
    const User = mongoose.model('User');
    const roles = resolveRoles(identity.groups, config, await knownRoleNames());

    let user = await User.findOne({oidcIssuer: identity.issuer, oidcSubject: identity.subject});
    let isNew = false;

    if (!user && config.accountLinking === 'by_username') {
        user = await User.findOne({username: identity.username});
        if (user && (user.oidcIssuer || user.oidcSubject) &&
            (user.oidcIssuer !== identity.issuer || user.oidcSubject !== identity.subject))
            throw {fn: 'Forbidden', message: 'The local account is already linked to another SSO identity'};
    }

    if (!user) {
        if (!config.autoProvision)
            throw {fn: 'Forbidden', message: 'The SSO account has not been provisioned in PwnDoc'};

        const existingUsername = await User.findOne({username: identity.username});
        if (existingUsername)
            throw {fn: 'Forbidden', message: 'A local account already uses this SSO username'};

        user = new User({
            username: identity.username,
            password: bcrypt.hashSync(crypto.randomBytes(48).toString('base64url'), 10),
            firstname: identity.firstname,
            lastname: identity.lastname,
            email: identity.email || undefined,
            roles,
            oidcIssuer: identity.issuer,
            oidcSubject: identity.subject
        });
        isNew = true;
    }
    else {
        if (user.enabled === false)
            throw {fn: 'Unauthorized', message: 'Account disabled'};

        if (!user.oidcIssuer && !user.oidcSubject) {
            user.oidcIssuer = identity.issuer;
            user.oidcSubject = identity.subject;
        }

        if (config.syncProfile) {
            user.firstname = identity.firstname;
            user.lastname = identity.lastname;
            user.email = identity.email || undefined;
        }

        if (config.syncRoles) {
            await ensureAdminIsNotOrphaned(User, user, roles);
            user.roles = roles;
        }
    }

    try {
        await user.save();
    }
    catch (err) {
        if (err.code === 11000)
            throw {fn: 'Forbidden', message: 'The SSO identity or username is already linked to another account'};
        throw err;
    }

    return {user, isNew};
}

module.exports = {findOrProvisionOidcUser};
