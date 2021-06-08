var mongoose = require('mongoose');//.set('debug', true);
var Schema = mongoose.Schema;

var ConfigSchema = new Schema({
    mandatoryReview: { type: Boolean, default: false },
    minReviewers: { type: Number, default: 1 },
    removeApprovalsUponUpdate: { type: Boolean, default: false }
}, {
    collection: 'configs',
    capped: { max: 1 }
});

// Get configs
ConfigSchema.statics.getConfigs = () => {
    return new Promise((resolve, reject) => {
        var query = Configs.findOne();
        query.select('-_id -__v');
        query.exec()
        .then((out) => {
            resolve(out);
        })
        .catch((err) => {
            reject(err);
        })
    });
}



var Configs = mongoose.model('Configs', ConfigSchema);
module.exports = Configs;