const Response = require('../lib/httpResponse.js');
const SpellingDictionary = require("../models/dictionary");
const acl = require('../lib/auth').acl

module.exports = function(app) {
    const LT_URL = process.env.LT_URL || "http://pwndoc-languagetools:8010";

    // ---------------------------
    // Spellcheck with MongoDB filtering
    // ---------------------------
    app.post("/api/spellcheck", acl.hasPermission("spellcheck:read"), async (req, res) => {
        try {
            const { text, language = "en-CA" } = req.body;
            if (!text)
                return Response.Ok(res, { matches: [] });

            // Load custom words from MongoDB
            const entries = await SpellingDictionary.find({});
            const dictionary = entries.map(e => e.word);

            // Build request to LanguageTool
            // Custom rules are managed by the LanguageTool container and loaded automatically
            const params = new URLSearchParams({ text, language });

            let ltResponse;
            try {
                ltResponse = await fetch(`${LT_URL}/v2/check`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: params
                });
            } catch (err) {
                const cause = err && err.cause ? err.cause : {};
                const code = cause.code || cause.errno;
                const detail = cause.message || err.message || String(err);
                console.error("LanguageTool fetch failed", { url: LT_URL, code, detail });
                return Response.Custom(res, "error", 502, `LanguageTool fetch failed${code ? ` (${code})` : ""}: ${detail}`);
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

            // Filter matches
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
