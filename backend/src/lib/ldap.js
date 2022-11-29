const env = process.env.NODE_ENV || 'dev'
const ldap = require("ldapjs");









/**
 * This searches LDAP for an entry based on username
 * @param {ldapjs.Client} client The client to use
 * @param {string} username The username to search
 * @returns {Promise<object>} Promise resolves with the user object
 */
function search(client, username,settings) {
  return new Promise((resolve, reject) => {
    client.search(
      settings.authentication.ldap.userDN.replace("%u", username),
      {},
      (err, resp) => {
        if (err) {
          reject(err);
          return;
        } else {
          resp.on("searchEntry", function (entry) {
            resolve(entry.object);
          });
          resp.on("error", function (err) {
            reject(err);
          });
          resp.on("error", function (err) {
            client.destroy()
          });
        }
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
function bind(client, username, password,settings) {
  return new Promise((resolve, reject) => {
        client.bind(
        settings.authentication.ldap.userDN.replace("%u", username),
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

function auth(username, password,settings) {
  return new Promise((resolve, reject) => {
    
      if(!username.match(/^[a-zA-Z0-9\.\_\-@]+$/)) {
        reject({code: 49}); // invalid username
        return;
      }
      let client = ldap.createClient({
        url: settings.authentication.ldap.address,
      });
      client.on("error", function (err) {
        reject(err);
      });
    try{
      bind(client, username, password,settings).then(result=> {
          search(client, username,settings).then(resultSearch => {
            client.unbind();
            client.destroy()
            resolve({
              displayName: resultSearch[settings.authentication.ldap.displayNameAttr || "displayName"],
              mail: resultSearch[settings.authentication.ldap.mailAttr || "mail"],
            });
          })
          .catch((e)=>{reject(e)})
       })
      .catch((e)=>{ reject(e)})
     
    } catch (e) {
      reject(e)
    }

  });
}


module.exports = {
  auth
};