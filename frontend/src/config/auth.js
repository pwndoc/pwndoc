require("dotenv").config({ path: __dirname + "app/.env" });

console.log({ env: process.env, path: __dirname + "app/.env" });

export default {
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
};
