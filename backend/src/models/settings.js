var mongoose = require('mongoose');//.set('debug', true);
var Schema = mongoose.Schema;

var SettingSchema = new Schema({
    imageBorder: { type: Boolean, default: false },
    imageBorderColor: { type: String, default: "#000000" },
    cvssColors : {
        noneColor : { type: String, default: "#4a86e8" },
        lowColor : { type: String, default: "#008000" },
        mediumColor : { type: String, default: "#f9a009" },
        highColor : { type: String, default: "#fe0000" },
        criticalColor : { type: String, default: "#212121" } 
    },
    enableReviews: { type: Boolean, default: false },
    mandatoryReview: { type: Boolean, default: false },
    minReviewers: { type: Number, default: 1 },
    removeApprovalsUponUpdate: { type: Boolean, default: false }
}, {
    collection: 'settings',
    capped: { max: 1 }
});

// Get settings
SettingSchema.statics.getSettings = () => {
    return new Promise((resolve, reject) => {
        var query = Settings.findOne();
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



var Settings = mongoose.model('Settings', SettingSchema);
module.exports = Settings;