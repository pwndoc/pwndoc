'use strict';

var User    = require('mongoose').model('User');
var entra   = require('../lib/entra');
var auth    = require('../lib/auth');
var jwt     = require('jsonwebtoken');

module.exports = function(app) {

  // Public: tells the frontend whether to show the "Sign in with Microsoft" button
  app.get('/api/auth/entra/config', (_req, res) => {
    res.json({ enabled: entra.isEnabled() });
  });

  if (!entra.isEnabled()) return;

  // Initiate the Entra OIDC auth code flow
  app.get('/api/auth/entra/login', async (req, res) => {
    try {
      const url = await entra.getLoginUrl(req);
      res.redirect(url);
    } catch (err) {
      console.error('[Entra] Login initiation failed:', err.message);
      res.redirect('/login?entraError=login_failed');
    }
  });

  // Entra redirects here after the user authenticates
  app.get('/api/auth/entra/callback', async (req, res) => {
    try {
      const tokenResponse = await entra.handleCallback(req);
      const claims = entra.extractClaims(tokenResponse);

      // Resolve groups — use Graph fallback if token has overage indicator
      const groups = claims.hasGroupOverage
        ? await entra.getGroupsFromGraph(claims.accessToken)
        : claims.groups;

      const role = entra.mapGroupsToRole(groups);
      if (!role) {
        console.warn(`[Entra] Access denied for ${claims.username} — not in any mapped group`);
        return res.redirect('/login?entraError=no_group');
      }

      // Find or create the PwnDoc user record
      const user = await User.findOrCreateFromEntra({
        entraId:   claims.entraId,
        username:  claims.username,
        firstname: claims.firstname,
        lastname:  claims.lastname,
        email:     claims.email,
        role,
      });

      // Issue PwnDoc JWT + refresh token (identical flow to local login)
      const userAgent    = req.headers['user-agent'];
      const refreshToken = jwt.sign({ sessionId: null, userId: user._id }, auth.jwtRefreshSecret);
      const tokens       = await User.updateRefreshToken(refreshToken, userAgent);

      res.cookie('token',        `JWT ${tokens.token}`,  { sameSite: 'strict', secure: true, httpOnly: true });
      res.cookie('refreshToken', tokens.refreshToken,     { sameSite: 'strict', secure: true, httpOnly: true, path: '/api/users/refreshtoken' });
      res.redirect('/');

    } catch (err) {
      console.error('[Entra] Callback failed:', err.message);
      res.redirect('/login?entraError=callback_failed');
    }
  });

  // Clear PwnDoc session (Entra's own session clears when they close the browser)
  app.get('/api/auth/entra/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.redirect('/login');
  });
};
