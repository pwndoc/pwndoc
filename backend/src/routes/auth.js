module.exports = function(app, overrides = {}) {
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');

    const Response = require('../lib/httpResponse');
    const auth = require('../lib/auth');
    const {getOidcConfig, getPublicAuthConfig} = require('../lib/oidc-config');
    const oidcClient = overrides.oidcClient || require('../lib/oidc-client');
    const {buildOidcIdentity} = require('../lib/oidc-identity');
    const {findOrProvisionOidcUser} = overrides.oidcUser || require('../lib/oidc-user');
    const config = overrides.config || getOidcConfig();
    const transactionCookie = 'pwndoc_oidc_transaction';

    function transactionCookieOptions() {
        return {
            httpOnly: true,
            secure: config.cookieSecure,
            sameSite: 'lax',
            path: '/api/auth/oidc/callback',
            maxAge: config.transactionTtlSeconds * 1000
        };
    }

    function clearTransactionCookie(res) {
        const options = transactionCookieOptions();
        delete options.maxAge;
        res.clearCookie(transactionCookie, options);
    }

    function callbackUrl(req) {
        const url = new URL(config.redirectUri);
        Object.entries(req.query).forEach(([key, value]) => {
            if (typeof value === 'string')
                url.searchParams.append(key, value);
        });
        return url;
    }

    function redirectFailure(res, reason = 'authentication_failed') {
        const separator = config.failureRedirect.includes('?') ? '&' : '?';
        res.redirect(`${config.failureRedirect}${separator}oidcError=${encodeURIComponent(reason)}`);
    }

    app.get('/api/auth/config', function(req, res) {
        Response.Ok(res, getPublicAuthConfig(config));
    });

    app.get('/api/auth/oidc', async function(req, res) {
        if (!config.enabled)
            return Response.NotFound(res, 'OpenID Connect authentication is not enabled');

        try {
            const request = await oidcClient.createAuthorizationRequest(config);
            const transaction = jwt.sign(request.transaction, auth.jwtRefreshSecret, {
                expiresIn: config.transactionTtlSeconds,
                audience: 'pwndoc-oidc-callback',
                issuer: 'pwndoc'
            });
            res.cookie(transactionCookie, transaction, transactionCookieOptions());
            res.redirect(request.url.toString());
        }
        catch (err) {
            console.error(`OIDC authorization request failed: ${err.message || 'unknown error'}`);
            redirectFailure(res);
        }
    });

    app.get('/api/auth/oidc/callback', async function(req, res) {
        if (!config.enabled)
            return Response.NotFound(res, 'OpenID Connect authentication is not enabled');

        const transactionToken = req.cookies[transactionCookie];
        clearTransactionCookie(res);

        if (req.query.error)
            return redirectFailure(res, req.query.error === 'access_denied' ? 'access_denied' : 'authentication_failed');

        if (!transactionToken)
            return redirectFailure(res, 'invalid_transaction');

        try {
            const transaction = jwt.verify(transactionToken, auth.jwtRefreshSecret, {
                audience: 'pwndoc-oidc-callback',
                issuer: 'pwndoc'
            });
            const claims = await oidcClient.processAuthorizationResponse(config, callbackUrl(req), transaction);
            const identity = buildOidcIdentity(claims.idTokenClaims, claims.userInfoClaims, config);
            const result = await findOrProvisionOidcUser(identity, config);
            const User = mongoose.model('User');
            const session = await User.createSession(result.user._id, req.headers['user-agent'], 'oidc');
            const authCookieOptions = {sameSite: 'strict', secure: config.cookieSecure, httpOnly: true};

            res.cookie('token', `JWT ${session.token}`, authCookieOptions);
            res.cookie('refreshToken', session.refreshToken, {
                ...authCookieOptions,
                path: '/api/users/refreshtoken'
            });
            res.redirect(config.successRedirect);
        }
        catch (err) {
            console.error(`OIDC callback failed: ${err.message || 'unknown error'}`);
            redirectFailure(res, err.fn === 'Forbidden' ? 'access_denied' : 'authentication_failed');
        }
    });
};
