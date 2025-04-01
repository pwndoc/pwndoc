const request = require("supertest");

var mongoose = require('mongoose');
mongoose.connect(`mongodb://${process.env.DB_SERVER}:27017/${process.env.DB_NAME}`, {});

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
require('./vulnerability.test')(request, app)
require('./audit.test')(request, app)
require('./images.test')(request, app)
require('./settings.test')(request, app)
require('./backup.test')(request, app)
require('./lib.test')()