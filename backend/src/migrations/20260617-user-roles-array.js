exports.name = '20260617-user-roles-array'

exports.up = async function() {
    const User = require('mongoose').model('User')
    const users = await User.collection.find(
        {role: {$type: 'string'}},
        {projection: {_id: 1, role: 1, roles: 1}}
    ).toArray()

    if (users.length === 0)
        return

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
