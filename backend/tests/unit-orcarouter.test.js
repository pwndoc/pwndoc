// Focused runner for the OrcaRouter Cyber Inference unit suites.
//
// These files follow the repository's `module.exports = function () { describe(...) }`
// convention and are normally registered by tests/index.test.js. They are pure unit
// tests (no MongoDB), so this runner lets them be executed on their own:
//   npx jest tests/unit-orcarouter.test.js
require('./ai-orcarouter.test')();
require('./ai-client.test')();
require('./settings-secrets.test')();
