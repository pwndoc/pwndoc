const request = require("supertest");

var env = process.env.NODE_ENV || 'dev';
var config = require('../src/config/config.json')[env];

var mongoose = require('mongoose');
mongoose.connect(`mongodb://${config.database.server}:${config.database.port}/${config.database.name}`, {});

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
require('./settings.test')(request, app)
require('./lib.test')()