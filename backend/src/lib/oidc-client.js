let cachedClient;
let cachedKey;

async function loadLibrary() {
    return import('openid-client');
}

function configurationKey(config) {
    return JSON.stringify([
        config.issuer,
        config.clientId,
        config.clientSecret,
        config.clientAuthMethod,
        config.httpTimeoutSeconds
    ]);
}

async function getClient(config) {
    const key = configurationKey(config);
    if (cachedClient && cachedKey === key)
        return cachedClient;

    const oidc = await loadLibrary();
    let clientAuthentication;
    if (config.clientAuthMethod === 'client_secret_basic')
        clientAuthentication = oidc.ClientSecretBasic(config.clientSecret);
    else if (config.clientAuthMethod === 'none')
        clientAuthentication = oidc.None();
    else
        clientAuthentication = oidc.ClientSecretPost(config.clientSecret);

    const discoveryOptions = {timeout: config.httpTimeoutSeconds};
    if (config.allowInsecureHttp)
        discoveryOptions.execute = [oidc.allowInsecureRequests];

    const discovered = await oidc.discovery(
        new URL(config.issuer),
        config.clientId,
        config.clientSecret || undefined,
        clientAuthentication,
        discoveryOptions
    );

    cachedClient = discovered;
    cachedKey = key;
    return discovered;
}

async function createAuthorizationRequest(config) {
    const oidc = await loadLibrary();
    const client = await getClient(config);
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();

    const url = oidc.buildAuthorizationUrl(client, {
        redirect_uri: config.redirectUri,
        scope: config.scopes,
        response_type: 'code',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        nonce
    });

    return {url, transaction: {codeVerifier, state, nonce}};
}

async function processAuthorizationResponse(config, currentUrl, transaction) {
    const oidc = await loadLibrary();
    const client = await getClient(config);
    const tokens = await oidc.authorizationCodeGrant(client, currentUrl, {
        pkceCodeVerifier: transaction.codeVerifier,
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
        idTokenExpected: true
    });
    const idTokenClaims = tokens.claims();
    if (!idTokenClaims)
        throw new Error('The identity provider did not return an ID token');

    let userInfoClaims = {};
    if (config.fetchUserInfo && client.serverMetadata().userinfo_endpoint) {
        if (!tokens.access_token)
            throw new Error('The identity provider did not return an access token for UserInfo');
        userInfoClaims = await oidc.fetchUserInfo(client, tokens.access_token, idTokenClaims.sub);
    }

    return {idTokenClaims, userInfoClaims};
}

function resetClientCache() {
    cachedClient = undefined;
    cachedKey = undefined;
}

module.exports = {
    createAuthorizationRequest,
    processAuthorizationResponse,
    resetClientCache
};
