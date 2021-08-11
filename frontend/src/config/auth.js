export default {
  domain: process.env.AUTH0_DOMAIN || "",
  clientId: process.env.AUTH0_CLIENT_ID || "",
  audience: process.env.AUTH0_AUDIENCE || "",
  serverUrl: process.env.AUTH0_SERVER_URL || "",
};
