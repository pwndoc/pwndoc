# How to set SSO authentication

By default the SSO is disabled. I suggest to activate it after you have initalized the first user.

## Set URL and credentials

1. Modify the backend/src/config/config.json file and update the following endpoints with your SSO third party endpoints 

```json
    "login": {
            "provider": "oidc",
            "issuer": "https://exemple.com",
            "authorizationURL": "https://exemple.com/as/authorization.oauth2",
            "tokenURL": "https://exemple.com/as/token.oauth2",
            "userInfoURL": "https://exemple.com/idp/userinfo.openid",
            "callbackURL": "https://myserverIP/api/sso",
            "scope": "openid profile"
        }
```
2. Set your client id and client secret inside resources/clientid.txt and resources/client.secret
3. On your machine, set the environment variable NODE_ENV
	```export NODE_ENV=Prod```
4. Set the logout URL in frontend/src/services/user.js
```js
document.location.href = 'https://exemple.com/idp/startSLO.ping'
```
5. Relaunch

## Disable SSO authentication

If you don't want to use the SSO authentication and want to use the one from PwnDoc, process as follow : 

1. Set 'provider' to 'disabled' in backend/src/config/config.json

```json
"login": {
	"provider": "disabled"
},
```

2. Disable the SSO route in frontend/src/config/config.json
```json
"isSSO": false
```
3. Relaunch and you should have the original login page