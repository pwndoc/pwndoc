const cookieParser = require('cookie-parser');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const request = require('supertest');

global.__basedir = path.join(__dirname, '..', 'src');

jest.mock('../src/lib/auth', () => ({
    jwtRefreshSecret: 'test-refresh-secret-with-at-least-32-bytes'
}));

const {getOidcConfig} = require('../src/lib/oidc-config');

function routeConfig(overrides = {}) {
    return getOidcConfig({
        NODE_ENV: 'test',
        OIDC_ENABLED: 'true',
        OIDC_ALLOW_INSECURE_HTTP: 'true',
        OIDC_COOKIE_SECURE: 'false',
        OIDC_ISSUER: 'http://identity.example.test',
        OIDC_CLIENT_ID: 'pwndoc',
        OIDC_CLIENT_SECRET: 'not-a-real-secret',
        OIDC_REDIRECT_URI: 'http://pwndoc.example.test/api/auth/oidc/callback',
        OIDC_FETCH_USERINFO: 'false',
        OIDC_AUTO_PROVISION: 'true',
        ...overrides
    });
}

function createApp(config, oidcClient, oidcUser) {
    const app = express();
    app.use(cookieParser());
    require('../src/routes/auth')(app, {config, oidcClient, oidcUser});
    return app;
}

describe('OIDC routes', () => {
    afterEach(() => jest.restoreAllMocks());

    test('publishes only the safe authentication configuration', async () => {
        const config = routeConfig({OIDC_BUTTON_LABEL: 'Corporate login'});
        const app = createApp(config, {}, {});

        const response = await request(app).get('/api/auth/config').expect(200);

        expect(response.body.datas).toEqual({
            localLoginEnabled: true,
            oidc: {enabled: true, buttonLabel: 'Corporate login'}
        });
        expect(JSON.stringify(response.body)).not.toContain(config.clientSecret);
    });

    test('stores a short-lived protected transaction before redirecting', async () => {
        const oidcClient = {
            createAuthorizationRequest: jest.fn().mockResolvedValue({
                url: new URL('https://identity.example.test/authorize?client_id=pwndoc'),
                transaction: {state: 'state', nonce: 'nonce', codeVerifier: 'verifier'}
            })
        };
        const app = createApp(routeConfig(), oidcClient, {});

        const response = await request(app).get('/api/auth/oidc').expect(302);

        expect(response.headers.location).toBe('https://identity.example.test/authorize?client_id=pwndoc');
        expect(response.headers['set-cookie'][0]).toMatch(/pwndoc_oidc_transaction=.*HttpOnly/);
        expect(response.headers['set-cookie'][0]).toMatch(/Path=\/api\/auth\/oidc\/callback/);
        expect(response.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
    });

    test('exchanges a valid callback for PwnDoc authentication cookies', async () => {
        const oidcClient = {
            createAuthorizationRequest: jest.fn().mockResolvedValue({
                url: new URL('https://identity.example.test/authorize'),
                transaction: {state: 'state', nonce: 'nonce', codeVerifier: 'verifier'}
            }),
            processAuthorizationResponse: jest.fn().mockResolvedValue({
                idTokenClaims: {
                    iss: 'http://identity.example.test/',
                    sub: 'subject-123',
                    preferred_username: 'alice',
                    given_name: 'Alice',
                    family_name: 'Example'
                },
                userInfoClaims: {}
            })
        };
        const oidcUser = {
            findOrProvisionOidcUser: jest.fn().mockResolvedValue({user: {_id: 'user-1'}, isNew: true})
        };
        jest.spyOn(mongoose, 'model').mockReturnValue({
            createSession: jest.fn().mockResolvedValue({token: 'access-token', refreshToken: 'refresh-token'})
        });
        const app = createApp(routeConfig(), oidcClient, oidcUser);
        const start = await request(app).get('/api/auth/oidc').expect(302);
        const transactionCookie = start.headers['set-cookie'][0].split(';')[0];

        const response = await request(app)
            .get('/api/auth/oidc/callback?code=code&state=state')
            .set('Cookie', transactionCookie)
            .expect(302);

        expect(response.headers.location).toBe('/');
        expect(oidcClient.processAuthorizationResponse).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({hostname: 'pwndoc.example.test'}),
            expect.objectContaining({state: 'state', nonce: 'nonce', codeVerifier: 'verifier'})
        );
        expect(response.headers['set-cookie'].join('\n')).toContain('token=JWT%20access-token');
        expect(response.headers['set-cookie'].join('\n')).toContain('refreshToken=refresh-token');
    });

    test('rejects callbacks without a transaction cookie', async () => {
        const app = createApp(routeConfig(), {}, {});

        const response = await request(app)
            .get('/api/auth/oidc/callback?code=code&state=state')
            .expect(302);

        expect(response.headers.location).toBe('/login?oidcError=invalid_transaction');
    });
});
