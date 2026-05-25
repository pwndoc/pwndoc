'use strict';
const msal = require('@azure/msal-node');
const crypto = require('crypto');
const https = require('https');

const isEnabled = () => process.env.ENTRA_ENABLED === 'true';

// Lazy singleton — only instantiate when Entra is enabled and a request arrives
let _cca = null;
const getCca = () => {
  if (!_cca) {
    _cca = new msal.ConfidentialClientApplication({
      auth: {
        clientId:     process.env.ENTRA_CLIENT_ID,
        authority:    `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}`,
        clientSecret: process.env.ENTRA_CLIENT_SECRET,
      },
      system: {
        loggerOptions: {
          loggerCallback: () => {},
          piiLoggingEnabled: false,
          logLevel: msal.LogLevel.Warning,
        }
      }
    });
  }
  return _cca;
};

// Scopes: openid/profile/email for identity, User.Read for Graph group fallback
const SCOPES = ['openid', 'profile', 'email', 'User.Read'];

const redirectUri = () =>
  process.env.ENTRA_REDIRECT_URI || 'https://localhost:4242/api/auth/entra/callback';

// Parse comma-separated group GUIDs from env
const adminGroupIds = () =>
  (process.env.ENTRA_GROUP_ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const userGroupIds = () =>
  (process.env.ENTRA_GROUP_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

// Generate auth code URL and store CSRF state in session
const getLoginUrl = async (req) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.entraState = state;

  return getCca().getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: redirectUri(),
    state,
    responseMode: msal.ResponseMode.QUERY,
  });
};

// Exchange auth code for tokens; validate CSRF state
const handleCallback = async (req) => {
  const { code, state } = req.query;

  if (!state || state !== req.session.entraState) {
    throw new Error('State mismatch — possible CSRF attack');
  }
  delete req.session.entraState;

  return getCca().acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: redirectUri(),
  });
};

// Map Entra group GUIDs to a PwnDoc role.
// Admin wins if the user is in any admin group. User wins otherwise.
// Returns null if not in any mapped group → deny access.
// DB group mappings take precedence; falls back to env vars if DB has none configured.
const mapGroupsToRole = async (groups) => {
  if (!groups || !groups.length) return null;

  // Lazy DB lookup — require here to avoid circular-dependency issues at module load time
  const Settings = require('mongoose').model('Settings');
  const s = await Settings.getEntraAuth();
  const dbGroups = s && s.entraAuth && s.entraAuth.groups;

  if (dbGroups && dbGroups.length) {
    // DB path: iterate in declaration order; first match wins (admin beats user if listed first)
    for (const mapping of dbGroups) {
      if (groups.includes(mapping.groupId)) return mapping.role;
    }
    return null;
  }

  // Env-var fallback
  if (adminGroupIds().some(g => groups.includes(g))) return 'admin';
  if (userGroupIds().some(g => groups.includes(g))) return 'user';
  return null;
};

// Verify MSAL configuration by attempting a client credentials token acquire
const testConnection = async () => {
  const cca = getCca();
  await cca.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });
  return { ok: true };
};

// Fall back to MS Graph when the token has a groups overage indicator
// (user is in more than 150 groups — rare for a 5-person team but handled)
const getGroupsFromGraph = (accessToken) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.microsoft.com',
      path: '/v1.0/me/memberOf?$select=id&$top=999',
      headers: { Authorization: `Bearer ${accessToken}` }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve((parsed.value || []).map(g => g.id));
        } catch (e) {
          reject(new Error('Failed to parse Graph groups response'));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

// Extract user claims from the MSAL token response
const extractClaims = (tokenResponse) => {
  const c = tokenResponse.idTokenClaims;
  return {
    entraId:         c.oid,
    username:        c.preferred_username || c.email || c.upn || c.oid,
    firstname:       c.given_name  || (c.name || '').split(' ')[0] || '',
    lastname:        c.family_name || (c.name || '').split(' ').slice(1).join(' ') || '',
    email:           c.preferred_username || c.email || '',
    groups:          c.groups || [],
    hasGroupOverage: !!(c._claim_names && c._claim_names.groups),
    accessToken:     tokenResponse.accessToken,
  };
};

module.exports = { isEnabled, getLoginUrl, handleCallback, mapGroupsToRole, getGroupsFromGraph, extractClaims, testConnection };
