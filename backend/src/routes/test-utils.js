module.exports = function(app) {
    if (process.env.NODE_ENV === 'test') {
        app.post('/api/__test__/reset-db', async (req, res) => {
            const mongoose = require('mongoose');
            const Settings = mongoose.model('Settings');

            try {
                // Clear all documents while preserving collection indexes.
                const collections = mongoose.connection.collections;
                await Promise.all(
                    Object.values(collections).map((collection) => collection.deleteMany({}))
                );

                // Recreate default settings so frontend boot always gets a valid object.
                await Settings.ensureInitialized();
                res.sendStatus(204);
            } catch (err) {
                res.status(500).json({
                    status: 'error',
                    datas: err && err.message ? err.message : 'Failed to reset test database'
                });
            }
        });
    }
}
