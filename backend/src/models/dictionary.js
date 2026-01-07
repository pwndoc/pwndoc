const mongoose = require("mongoose");

const SpellingDictionarySchema = new mongoose.Schema({
    word: {
        type: String,
        unique: true,
        required: true,
        index: true
    }
});

// Get all words
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

// Create word (upsert - create if not exists, return existing if exists)
SpellingDictionarySchema.statics.create = (word) => {
    return new Promise((resolve, reject) => {
        if (!word) {
            return reject({fn: 'BadParameters', message: 'Word is required'});
        }
        
        const w = word.toLowerCase();
        // Use findOneAndUpdate with upsert to handle existing words gracefully
        const query = SpellingDictionary.findOneAndUpdate(
            { word: w },
            { word: w },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        query.exec()
        .then((row) => {
            resolve(row);
        })
        .catch((err) => {
            reject(err);
        })
    })
}

// Delete word
SpellingDictionarySchema.statics.delete = (word) => {
    return new Promise((resolve, reject) => {
        if (!word) {
            return reject({fn: 'BadParameters', message: 'Word is required'});
        }
        
        const w = word.toLowerCase();
        const query = SpellingDictionary.findOneAndDelete({ word: w });
        query.exec()
        .then((row) => {
            if (!row)
                reject({fn: 'NotFound', message: 'Word not found in dictionary'});
            else
                resolve(row);
        })
        .catch((err) => {
            reject(err);
        })
    })
}

const SpellingDictionary = mongoose.model('SpellingDictionary', SpellingDictionarySchema);
module.exports = SpellingDictionary;