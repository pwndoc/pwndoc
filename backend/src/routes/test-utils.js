module.exports = function(app) {
    if (process.env.NODE_ENV === 'test') {
        app.post('/api/__test__/reset-db', async (req, res) => {
            const mongoose = require('mongoose');

            // Clear all documents while preserving collection indexes.
            const collections = mongoose.connection.collections;
            await Promise.all(
                Object.values(collections).map((collection) => collection.deleteMany({}))
            );
            res.sendStatus(204);
        });
    }
}
