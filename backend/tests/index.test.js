const request = require("supertest");
const app = require(__dirname+"/../src/app");

// Import tests
require('./unauthenticated.test')(request, app)
require('./user.test')(request, app)
require('./data.test')(request)
require('./template.test')(request, app)
require('./company.test')(request, app)
require('./client.test')(request, app)
require('./vulnerability.test')(request, app)
require('./configs.test')(request, app)
require('./lib.test')()