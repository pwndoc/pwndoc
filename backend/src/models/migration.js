var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MigrationSchema = new Schema({
    name: {type: String, unique: true, required: true},
    appliedAt: {type: Date, default: Date.now}
}, {timestamps: true});

var Migration = mongoose.model('Migration', MigrationSchema);
Migration.syncIndexes();
module.exports = Migration;
