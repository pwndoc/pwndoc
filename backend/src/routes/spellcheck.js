const Response = require('../lib/httpResponse.js');
const SpellingDictionary = require("../models/dictionary");
const acl = require('../lib/auth').acl
const { getLanguageToolConfig } = require('../lib/languagetool-config');
const { testLanguageToolConnection } = require('../lib/languagetool-test');

module.exports = function(app) {

    // ---------------------------
    // Capabilities endpoint
    // ---------------------------
    app.get("/api/spellcheck/capabilities", acl.hasPermission("spellcheck:read"), async (req, res) => {
        try {
            const Settings = require('mongoose').model('Settings');
            const settings = await Settings.getAll();
            const enabled = !!settings?.report?.public?.enableSpellCheck;
            const config = await getLanguageToolConfig();
            const configured = !!config?.url;
            const hasApiKey = !!config?.apiKey;

            let supportsCustomRules = false;
            if (configured) {
                try {
                    const healthUrl = `${config.url}/health`;
                    const healthRes = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
                    if (healthRes.ok) {
                        const healthData = await healthRes.json();
                        supportsCustomRules = healthData.type === 'pwndoc-languagetools';
                    }
                } catch (_) {
                    // Unreachable or timeout — supportsCustomRules stays false
                }
            }

            Response.Ok(res, { enabled, configured, hasApiKey, supportsCustomRules });
        } catch (err) {
            Response.Internal(res, err);
        }
    });

    // ---------------------------
    // Live connection test (uses request body, not saved settings)
    // ---------------------------
    app.post("/api/spellcheck/test", acl.hasPermission("settings:update"), async (req, res) => {
        try {
            const { url, apiKey, username } = req.body;
            const result = await testLanguageToolConnection(url, apiKey, username);
            if (result.error) return Response.BadParameters(res, result.error);
            const { valid, ...data } = result;
            Response.Ok(res, data);
        } catch (err) {
            Response.Internal(res, err);
        }
    });

    // ---------------------------
    // Spellcheck with MongoDB filtering
    // ---------------------------
    app.post("/api/spellcheck", acl.hasPermission("spellcheck:read"), async (req, res) => {
        try {
            const { text, language = "en-CA", enabledOnly, disabledCategories } = req.body;
            if (!text)
                return Response.Ok(res, { matches: [] });

            const config = await getLanguageToolConfig();
            if (!config) {
                return Response.Ok(res, { matches: [] });
            }

            // Load custom words from MongoDB (lowercased for case-insensitive matching)
            const entries = await SpellingDictionary.find({});
            const dictionary = entries.map(e => e.word.toLowerCase());

            // Build request to LanguageTool
            const params = new URLSearchParams({ text, language });
            if (enabledOnly !== undefined) params.append('enabledOnly', enabledOnly);
            if (disabledCategories) params.append('disabledCategories', disabledCategories);
            // Only send apiKey+username as form params when both are present (public LT Premium).
            // When only apiKey is set (pwndoc-languagetools), use X-Api-Key header instead to
            // avoid the "apiKey set but username was not" 400 error from vanilla LT.
            if (config.apiKey && config.username) {
                params.append('apiKey', config.apiKey);
                params.append('username', config.username);
            }

            const ltHeaders = { "Content-Type": "application/x-www-form-urlencoded" };
            if (config.apiKey) ltHeaders['X-Api-Key'] = config.apiKey;

            let ltResponse;
            try {
                ltResponse = await fetch(`${config.url}/v2/check`, {
                    method: "POST",
                    headers: ltHeaders,
                    body: params,
                    signal: AbortSignal.timeout(10000),
                });
            } catch (err) {
                const cause = err && err.cause ? err.cause : {};
                const code = cause.code || cause.errno;
                const detail = cause.message || err.message || String(err);
                console.error("LanguageTool fetch failed", { url: config.url, code, detail });
                return Response.Custom(res, "error", 502, `LanguageTool fetch failed${code ? ` (${code})` : ""}: ${detail}`);
            }

            if (ltResponse.status === 429) {
                return Response.Ok(res, { matches: [], rateLimited: true });
            }

            if (!ltResponse.ok) {
                let errorDetail = ltResponse.statusText || 'Unknown error';
                try {
                    const errorBody = await ltResponse.text();
                    if (errorBody) errorDetail = errorBody;
                } catch (_) {}
                return Response.Custom(res, "error", 502, `LanguageTool HTTP ${ltResponse.status}: ${errorDetail}`);
            }

            const ltResult = await ltResponse.json();

            // Filter matches against custom dictionary
            ltResult.matches = ltResult.matches.filter(match => {
                const word = text.substring(match.offset, match.offset + match.length);
                return !dictionary.includes(word.toLowerCase());
            });

            Response.Ok(res, ltResult);

        } catch (err) {
            Response.Internal(res, err);
        }
    });

    app.get("/api/spellcheck/dict", acl.hasPermission('spellcheck:read'), async (req, res) => {
        return SpellingDictionary.getAll()
            .then(dict => Response.Ok(res, dict))
            .catch(err => Response.Internal(res, err));
    });

    app.post("/api/spellcheck/dict", acl.hasPermission("spellcheck:create"), async (req, res) => {
        try {
            const { word } = req.body;
            if (!word)
                return Response.BadParameters(res, "Missing required parameter: word");

            const savedWord = await SpellingDictionary.create(word);
            Response.Ok(res, { success: true, word: savedWord.word });
        } catch (err) {
            if (err.fn === 'BadParameters') {
                Response.BadParameters(res, err.message);
            } else {
                Response.Internal(res, err);
            }
        }
    });

    app.delete("/api/spellcheck/dict", acl.hasPermission("spellcheck:delete"), async (req, res) => {
        try {
            const { word } = req.body;
            if (!word)
                return Response.BadParameters(res, "Missing required parameter: word");

            const deletedWord = await SpellingDictionary.delete(word);
            Response.Ok(res, { success: true, removed: deletedWord.word });
        } catch (err) {
            if (err.fn === 'BadParameters') {
                Response.BadParameters(res, err.message);
            } else if (err.fn === 'NotFound') {
                Response.NotFound(res, err.message);
            } else {
                Response.Internal(res, err);
            }
        }
    });
};
