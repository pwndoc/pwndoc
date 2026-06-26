var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RoleSchema = new Schema({
    name: {type: String, unique: true, required: true},
    displayName: {type: String, required: true, index: {unique: true, collation: {locale: 'en', strength: 2}}},
    description: {type: String, default: ''},
    allows: {type: [String], default: []}
}, {timestamps: true});

const SYSTEM_ROLES = ['admin', 'user']
let mutationLock = Promise.resolve()

function serializeMutation(work) {
    const run = mutationLock.then(work, work)
    mutationLock = run.catch(() => {})
    return run
}

async function withOptionalTransaction(work) {
    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {
            await work(session)
        })
        session.endSession()
        return true
    }
    catch (error) {
        session.endSession()
        if (
            error.message &&
            (
                error.message.includes('Transaction numbers are only allowed') ||
                error.message.includes('Transaction numbers are only allowed on a replica set member or mongos')
            )
        ) {
            return false
        }
        throw error
    }
}

RoleSchema.statics.getAll = () => {
    return Role.find().select('name displayName description allows').sort({displayName: 1, name: 1}).lean()
}

RoleSchema.statics.getByName = (name) => {
    return Role.findOne({name: name}).select('name displayName description allows').lean()
}

// Roles from getAll() plus the 'admin'/'user' system roles, each annotated with a
// `usersCount` computed in a single aggregation (avoids one users-count round-trip
// per role on the roles management page).
RoleSchema.statics.getAllWithUserCounts = async (systemRoles = []) => {
    const User = require('mongoose').model('User')
    const customRoles = await Role.getAll()
    const knownRoles = ['admin', 'user', ...customRoles.map(role => role.name)]

    const counts = await User.aggregate([
        {
            $project: {
                roles: {
                    $cond: [
                        {$gt: [{$size: {$setIntersection: ['$roles', knownRoles]}}, 0]},
                        '$roles',
                        {$concatArrays: ['$roles', ['user']]}
                    ]
                }
            }
        },
        {$unwind: '$roles'},
        {$match: {roles: {$in: knownRoles}}},
        {$group: {_id: '$roles', count: {$sum: 1}}}
    ])
    const countByRole = counts.reduce((acc, entry) => {
        acc[entry._id] = entry.count
        return acc
    }, {})

    return [...systemRoles, ...customRoles].map(role => ({...role, users: countByRole[role.name] || 0}))
}

RoleSchema.statics.create = async (role) => {
    try {
        const displayName = (role.displayName || role.name).trim()
        return await new Role({
            name: role.name,
            displayName: displayName,
            description: role.description || '',
            allows: role.allows || []
        }).save()
    }
    catch (err) {
        if (err.code === 11000)
            throw({fn: 'BadParameters', message: err.keyPattern && err.keyPattern.displayName ? 'Role display name already exists' : 'Role already exists'})
        throw err
    }
}

// Role name is immutable once created (the frontend locks it after creation);
// only displayName/description/allows can change, so there is no rename to
// keep in sync with User documents here.
RoleSchema.statics.update = (name, role) => {
    return serializeMutation(async () => {
        try {
            const displayName = (role.displayName || name).trim()
            const result = await Role.updateOne({name: name}, {$set: {
                displayName: displayName,
                description: role.description || '',
                allows: role.allows || []
            }})
            if (result.matchedCount !== 1)
                throw({fn: 'NotFound', message: 'Role not found'})

            return 'Role updated successfully'
        }
        catch (error) {
            if (error.code === 11000)
                throw({fn: 'BadParameters', message: error.keyPattern && error.keyPattern.displayName ? 'Role display name already exists' : 'Role already exists'})
            throw error
        }
    })
}

RoleSchema.statics.delete = (name) => {
    return serializeMutation(async () => {
        const User = require('mongoose').model('User')

        async function removeRole(session) {
            const options = session ? {session: session} : {}
            const result = await Role.deleteOne({name: name}, options)
            if (result.deletedCount !== 1)
                throw({fn: 'NotFound', message: 'Role not found'})
            await User.updateMany({roles: name}, [
                {$set: {roles: {$filter: {input: '$roles', cond: {$ne: ['$$this', name]}}}}},
                {$set: {roles: {$cond: [{$eq: [{$size: '$roles'}, 0]}, ['user'], '$roles']}}}
            ], {...options, updatePipeline: true})
        }

        const transactional = await withOptionalTransaction(removeRole)
        if (!transactional)
            await removeRole()

        return 'Role deleted successfully'
    })
}

RoleSchema.statics.ensureDisplayNames = async () => {
    const roles = await Role.find({$or: [{displayName: {$exists: false}}, {displayName: null}, {displayName: ''}]}).select('name').lean()
    if (roles.length === 0)
        return
    return Role.bulkWrite(roles.map(role => {
        return {
            updateOne: {
                filter: {_id: role._id},
                update: {$set: {displayName: role.name}}
            }
        }
    }))
}

RoleSchema.statics.backup = (path) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')
        try {
            const writeStream = fs.createWriteStream(`${path}/roles.json`)
            writeStream.write('[')
            let roles = Role.find().cursor()
            let isFirst = true

            roles.eachAsync(async (document) => {
                if (!isFirst)
                    writeStream.write(',')
                else
                    isFirst = false
                writeStream.write(JSON.stringify(document, null, 2))
                return Promise.resolve()
            })
            .then(() => {
                writeStream.write(']')
                writeStream.end()
            })
            .catch(error => reject(error))

            writeStream.on('finish', () => resolve())
            writeStream.on('error', error => reject(error))
        }
        catch (error) {
            reject({error: error, model: 'Roles'})
        }
    })
}

RoleSchema.statics.restore = (path, mode = "upsert") => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs')
        if (!fs.existsSync(`${path}/roles.json`)) {
            resolve()
            return
        }

        async function reloadAcl() {
            const acl = require('../lib/auth').acl
            await acl.reload()
        }

        function importRolesPromise() {
            let documents = []

            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(`${path}/roles.json`)
                const JSONStream = require('JSONStream')
                let jsonStream = JSONStream.parse('*')
                readStream.pipe(jsonStream)

                async function flush() {
                    const current = documents.filter(document => !SYSTEM_ROLES.includes(document.name))
                    documents = []
                    if (current.length === 0)
                        return
                    await Role.bulkWrite(current.map(document => {
                        const displayName = (document.displayName || document.name).trim()
                        return {
                            replaceOne: {
                                filter: {name: document.name},
                                replacement: {
                                    ...document,
                                    displayName: displayName
                                },
                                upsert: true
                            }
                        }
                    }), {timestamps: false})
                }

                readStream.on('error', error => reject(error))
                jsonStream.on('data', async (document) => {
                    documents.push(document)
                    if (documents.length === 100) {
                        try {
                            await flush()
                        }
                        catch (error) {
                            reject(error)
                        }
                    }
                })
                jsonStream.on('end', async () => {
                    try {
                        await flush()
                        resolve()
                    }
                    catch (error) {
                        reject(error)
                    }
                })
                jsonStream.on('error', error => reject(error))
            })
        }

        try {
            if (mode === "revert")
                await Role.deleteMany()
            await importRolesPromise()
            await reloadAcl()
            resolve()
        }
        catch (error) {
            try {
                await reloadAcl()
            }
            catch (reloadError) {
                console.log(reloadError)
            }
            reject({error: error, model: 'Roles'})
        }
    })
}

var Role = mongoose.model('Role', RoleSchema);
Role.syncIndexes();
module.exports = Role;
