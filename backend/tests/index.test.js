const request = require("supertest");
const config = require("../src/config/config.json");
const env = process.env.NODE_ENV || 'dev';

var mongoose = require('mongoose');

let connectionOptions = {};
if (config && config[env] && config[env].database && config[env].database.connectionOptions) {
  connectionOptions = config[env].database.connectionOptions;
}
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, connectionOptions);
} else {
  mongoose.connect(`mongodb://${process.env.DB_SERVER}:27017/${process.env.DB_NAME}`, connectionOptions);
}

/* Clean the DB */
mongoose.connection.dropDatabase();

const app = require(__dirname+"/../src/app");

// Import tests
require('./unauthenticated.test')(request, app)
require('./user.test')(request, app)
require('./template.test')(request, app)
require('./data.test')(request, app)
require('./company.test')(request, app)
require('./client.test')(request, app)
require('./settings.test')(request, app)
require('./vulnerability.test')(request, app)
require('./audit.test')(request, app)
require('./backup.test')(request, app)
require('./cvss.test')(request, app)
require('./lib.test')()