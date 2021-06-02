var mongoose = require('mongoose');//.set('debug', true);
var Schema = mongoose.Schema;

var ConfigSchema = new Schema({
    mandatoryReview: { type: Boolean, default: false },
    minReviewers: { type: Number, default: 1 },
    removeApprovalsUponUpdate: { type: Boolean, default: true }
}, {
    collection: 'configs',
    capped: { max: 1 }
});


var Configs = mongoose.model('Configs', ConfigSchema);
module.exports = Configs;