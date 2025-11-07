const mongoose = require("mongoose");

const SpellingDictionarySchema = new mongoose.Schema({
    word: {
        type: String,
        unique: true,
        required: true,
        index: true
    }
});

// Get all settings
SpellingDictionarySchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        const query = SpellingDictionary.find({});
        query.exec()
            .then(SpellingDictionary => {
                resolve(SpellingDictionary)
            })
            .catch(err => reject(err));
    });
};

const SpellingDictionary = mongoose.model('SpellingDictionary', SpellingDictionarySchema);
module.exports = SpellingDictionary;