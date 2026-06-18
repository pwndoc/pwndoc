var mongoose = require('mongoose');

function ensureModelDefaultDocuments(model) {
    if (!Array.isArray(model.defaultDocuments) || model.defaultDocuments.length === 0) {
        return Promise.resolve();
    }

    return model.bulkWrite(
        model.defaultDocuments.map((item) => {
            return {
                updateOne: {
                    filter: item.filter,
                    update: {
                        $setOnInsert: item.document
                    },
                    upsert: true
                }
            };
        })
    );
}

module.exports.ensureModelDefaults = () => {
    return Promise.all(
        mongoose.modelNames().map((modelName) => {
            var model = mongoose.model(modelName);

            if (typeof model.ensureDefaults === 'function') {
                return model.ensureDefaults();
            }

            return ensureModelDefaultDocuments(model);
        })
    );
};