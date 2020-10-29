var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ResolutionSchema = new Schema({
  name: String,
  locale: String
}, { timestamps: true });

ResolutionSchema.index({ "name": 1, "locale": 1 }, { name: "unique_name_locale", unique: true })

/*
*** Statics ***
*/

// Get all resolutions
ResolutionSchema.statics.getAll = () => {
  return new Promise((resolve, reject) => {
    var query = Resolution.find();
    query.select('-_id name locale')
    query.exec()
      .then((rows) => {
        resolve(rows);
      })
      .catch((err) => {
        reject(err);
      })
  });
}

// Create resolution
ResolutionSchema.statics.create = (resolution) => {
  return new Promise((resolve, reject) => {
    var query = new Resolution(resolution);
    query.save()
      .then((row) => {
        resolve(row);
      })
      .catch((err) => {
        if (err.code === 11000)
          reject({ fn: 'BadParameters', message: 'Resolution already exists' });
        else
          reject(err);
      })
  })
}

// Update resolution
ResolutionSchema.statics.updateAll = (resolutions) => {
  return new Promise((resolve, reject) => {
    Resolution.deleteMany()
      .then((row) => {
        Resolution.insertMany(resolutions)
      })
      .then((row) => {
        resolve("Resolutions updated successfully")
      })
      .catch((err) => {
        reject(err);
      })
  })
}

// Delete resolution
ResolutionSchema.statics.delete = (name) => {
  return new Promise((resolve, reject) => {
    Resolution.deleteOne({ name: name })
      .then((res) => {
        if (res.deletedCount === 1)
          resolve('Resolution deleted');
        else
          reject({ fn: 'NotFound', message: 'Resolution not found' });
      })
      .catch((err) => {
        reject(err);
      })
  });
}

/*
*** Methods ***
*/

var Resolution = mongoose.model('Resolution', ResolutionSchema);
module.exports = Resolution;