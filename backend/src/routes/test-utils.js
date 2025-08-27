module.exports = function(app) {
    if (process.env.NODE_ENV === 'test') {
        app.post('/api/__test__/reset-db', async (req, res) => {
            const mongoose = require('mongoose');

            await mongoose.connection.dropDatabase();
            res.sendStatus(204);
        });
    }
}