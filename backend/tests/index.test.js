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
require('./role.test')(request, app)
require('./template.test')(request, app)
require('./data.test')(request, app)
require('./company.test')(request, app)
require('./client.test')(request, app)
require('./settings.test')(request, app)
require('./vulnerability.test')(request, app)
require('./audit.test')(request, app)
require('./audit-advanced.test')(request, app)
require('./images.test')(request, app)
require('./backup.test')(request, app)
require('./cvss.test')(request, app)
require('./languagetool-rules.test')(request, app)
require('./spellcheck.test')(request, app)
require('./test-utils.test')(request, app)
require('./lib.test')()
require('./ai-redaction-guidelines.test')()
require('./ai-qa-instructions.test')()
require('./ai-qa.test')()
require('./ai-qa-link-checker.test')()
require('./ai-qa-cache.test')()
require('./ai-qa-checks.test')()
require('./ai-qa-location.test')()
require('./ai-qa-image-captions.test')()
require('./ai-vuln-qa.test')()
require('./ai-vuln-duplicate-ai.test')()
require('./ai-prompt.test')()
require('./ai-integration.test')(request, app)