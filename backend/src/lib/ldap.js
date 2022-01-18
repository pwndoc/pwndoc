const env = process.env.NODE_ENV || 'dev'
const config = require('../config/config.json')
const ldap = require("ldapjs");

/**
 * This searches LDAP for an entry based on username
 * @param {ldapjs.Client} client The client to use
 * @param {string} username The username to search
 * @returns {Promise<object>} Promise resolves with the user object
 */
function search(client, username) {
  return new Promise((resolve, reject) => {
    client.search(
      config[env].ldap.userDN.replace("%u", username),
      {},
      (err, resp) => {
        if (err) {
          reject(err);
          return;
        }
        resp.on("searchEntry", function (entry) {
          resolve(entry.object);
        });
        resp.on("error", function (err) {
          reject(err);
        });
      }
    );
  });
}

/**
 * This binds the client.
 * @param {ldapjs.Client} client The client to use
 * @param {string} username The username to bind
 * @param {string} password The password to use on binding process
 * @returns {Promise} Promise resolves when binding was good.
 */
function bind(client, username, password) {
  return new Promise((resolve, reject) => {
    client.bind(
      config[env].ldap.userDN.replace("%u", username),
      password,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

function auth(username, password) {
  return new Promise((resolve, reject) => {
    let client = ldap.createClient({
      url: config[env].ldap.address,
    });
    client.on("error", function (err) {
      reject(err);
    });
    bind(client, username, password)
      .then(() => search(client, username))
      .then((resp) => {
        client.unbind();
        resolve({
          displayName: resp[config[env].ldap.displayNameAttr || "displayName"],
          mail: resp[config[env].ldap.mailAttr || "mail"],
        });
      })
      .catch((e) => {
        reject(e);
      });
  });
}

module.exports = {
  auth,
  enabled: config[env].ldap.ldapEnabled,
};
