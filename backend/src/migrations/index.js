const migrations = [
    require('./20260617-user-roles-array')
]

exports.run = async function() {
    const Migration = require('mongoose').model('Migration')

    for (const migration of migrations) {
        const alreadyApplied = await Migration.findOne({name: migration.name}).lean()
        if (alreadyApplied)
            continue

        await migration.up()
        await Migration.updateOne(
            {name: migration.name},
            {$setOnInsert: {name: migration.name, appliedAt: new Date()}},
            {upsert: true}
        )
    }
}
