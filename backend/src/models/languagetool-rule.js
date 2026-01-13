var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var LanguageToolRuleSchema = new Schema({
    id:            {type: String, required: true, unique: true},
    language:      {type: String, required: true},               // Language code (e.g., 'en', 'fr')
    name:          {type: String, required: true},               // Rule name
    xml:           {type: String, required: true},               // Full XML content of the rule
    creator:       {type: Schema.Types.ObjectId, ref: 'User'}
}, {timestamps: true});

/*
*** Indexes ***
*/
// id is already unique from schema definition
LanguageToolRuleSchema.index({ language: 1, name: 1 }, { unique: true });

/*
*** Statics ***
*/

// Get all rules for a language
LanguageToolRuleSchema.statics.getByLanguage = (lang) => {
    return new Promise((resolve, reject) => {
        var query = LanguageToolRule.find({ language: lang });
        query.sort({ name: 1 });
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get all rules
LanguageToolRuleSchema.statics.getAll = () => {
    return new Promise((resolve, reject) => {
        var query = LanguageToolRule.find();
        query.sort({ language: 1, name: 1 });
        query.exec()
        .then((rows) => {
            resolve(rows);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Get rule by ID (MongoDB _id or rule id field)
LanguageToolRuleSchema.statics.getById = (id) => {
    return new Promise((resolve, reject) => {
        // Try MongoDB _id first
        var query = LanguageToolRule.findById(id);
        query.exec()
        .then((row) => {
            if (row) {
                resolve(row);
            } else {
                // If not found by _id, try by id field
                return LanguageToolRule.findOne({ id: id }).exec();
            }
        })
        .then((row) => {
            resolve(row);
        })
        .catch((err) => {
            reject(err);
        })
    });
}

// Create rule
LanguageToolRuleSchema.statics.create = (rule) => {
    return new Promise((resolve, reject) => {
        var query = new LanguageToolRule(rule);
        query.save()
        .then((row) => {
            resolve(row);
        })
        .catch((err) => {
            if (err.code === 11000)
                reject({fn: 'BadParameters', message: 'Rule with this ID already exists'});
            else
                reject(err);
        })
    })
}

// Delete rule
LanguageToolRuleSchema.statics.delete = (id) => {
    return new Promise((resolve, reject) => {
        var query = LanguageToolRule.findByIdAndDelete(id);
        query.exec()
        .then((row) => {
            if (!row)
                reject({fn: 'NotFound', message: 'Rule not found'});
            else
                resolve(row);
        })
        .catch((err) => {
            reject(err);
        })
    })
}

var LanguageToolRule = mongoose.model('LanguageToolRule', LanguageToolRuleSchema);
module.exports = LanguageToolRule;
