exports.name = '20260617-user-roles-array'

const fs = require('fs')
const path = require('path')
const permissionsCatalog = require('../lib/permissions-catalog')

const SYSTEM_ROLES = ['admin', 'user']
const CORE_PERMISSIONS = permissionsCatalog.core()
const ALL_PERMISSIONS = permissionsCatalog.flatten()

function unique(values) {
    return [...new Set(values.filter(Boolean))]
}

function rolesConfigPath() {
    return path.join(__dirname, '..', 'config', 'roles.json')
}

function readLegacyRolesConfig() {
    const filePath = rolesConfigPath()
    if (!fs.existsSync(filePath))
        return {}
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function resolveLegacyRoleAllows(roleName, rolesConfig, resolving = []) {
    if (roleName === 'admin')
        return ALL_PERMISSIONS
    if (roleName === 'user')
        return CORE_PERMISSIONS
    if (resolving.includes(roleName))
        return []

    const role = rolesConfig[roleName]
    if (!role)
        return []

    const inherited = (role.inherits || []).flatMap(parentRole => resolveLegacyRoleAllows(parentRole, rolesConfig, [...resolving, roleName]))
    const allowed = role.allows === '*' ? ALL_PERMISSIONS : (role.allows || [])
    return unique([...inherited, ...allowed])
}

async function importLegacyRolesConfig(Role) {
    const rolesConfig = readLegacyRolesConfig()
    const roleNames = Object.keys(rolesConfig).filter(roleName => !SYSTEM_ROLES.includes(roleName))
    if (roleNames.length === 0)
        return

    const now = new Date()
    await Role.collection.bulkWrite(roleNames.map(roleName => {
        const role = rolesConfig[roleName] || {}
        const displayName = (role.displayName || roleName).trim()
        return {
            updateOne: {
                filter: {name: roleName},
                update: {
                    $setOnInsert: {
                        name: roleName,
                        displayName: displayName,
                        description: role.description || '',
                        allows: resolveLegacyRoleAllows(roleName, rolesConfig),
                        createdAt: now,
                        updatedAt: now,
                        __v: 0
                    }
                },
                upsert: true
            }
        }
    }))
}

async function createMissingUserRoles(User, Role) {
    const users = await User.collection.find(
        {},
        {projection: {role: 1, roles: 1}}
    ).toArray()
    const assignedRoles = unique(users.flatMap(user => {
        if (Array.isArray(user.roles) && user.roles.length > 0)
            return user.roles
        if (typeof user.role === 'string')
            return [user.role]
        return []
    })).filter(roleName => !SYSTEM_ROLES.includes(roleName))

    if (assignedRoles.length === 0)
        return

    const existingRoles = await Role.collection.find(
        {name: {$in: assignedRoles}},
        {projection: {name: 1}}
    ).toArray()
    const existingRoleNames = new Set(existingRoles.map(role => role.name))
    const missingRoles = assignedRoles.filter(roleName => !existingRoleNames.has(roleName))

    if (missingRoles.length === 0)
        return

    const now = new Date()
    await Role.collection.bulkWrite(missingRoles.map(roleName => {
        return {
            insertOne: {
                document: {
                    name: roleName,
                    displayName: roleName,
                    description: 'Migrated from user assignment. Review permissions.',
                    allows: CORE_PERMISSIONS,
                    createdAt: now,
                    updatedAt: now,
                    __v: 0
                }
            }
        }
    }))
}

exports.up = async function() {
    const User = require('mongoose').model('User')
    const Role = require('mongoose').model('Role')

    await importLegacyRolesConfig(Role)
    await createMissingUserRoles(User, Role)

    const users = await User.collection.find(
        {role: {$type: 'string'}},
        {projection: {_id: 1, role: 1, roles: 1}}
    ).toArray()

    if (users.length > 0) {
        const operations = users.map(user => {
            const hasRoles = Array.isArray(user.roles) && user.roles.length > 0
            const update = {$unset: {role: ""}}

            if (!hasRoles)
                update.$set = {roles: [user.role]}

            return {
                updateOne: {
                    filter: {_id: user._id},
                    update: update
                }
            }
        })

        await User.collection.bulkWrite(operations)
    }

    await Role.ensureDisplayNames()
}
