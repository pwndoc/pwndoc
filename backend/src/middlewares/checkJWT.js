const authConfig = require("../config/auth");
const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");

module.exports = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.endpoint}/.well-known/jwks.json`,
  }),
  algorithms: ["RS256"],
  audience: "https://127.0.0.1:5252",
  issuer: authConfig.endpoint,
});
