const Response = require('../lib/httpResponse.js');
const SpellingDictionary = require("../models/dictionary");
const acl = require('../lib/auth').acl

module.exports = function(app) {
    const LT_URL = process.env.LT_URL || "http://pwndoc-languagetools:8010";

    // ---------------------------
    // Spellcheck with MongoDB filtering
    // ---------------------------
    app.post("/api/spellcheck", acl.hasPermission("audit:read"), async (req, res) => {
        try {
            const { text, language = "en-CA" } = req.body;
            if (!text)
                return res.status(200).json({ matches: [] });

            // Load custom words from MongoDB
            const entries = await SpellingDictionary.find({});
            const dictionary = entries.map(e => e.word);

            // Build request to LanguageTool
            // Custom rules are managed by the LanguageTool container and loaded automatically
            const params = new URLSearchParams({ text, language });

            const ltResponse = await fetch(`${LT_URL}/v2/check`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: params
            });

            if (!ltResponse.ok) {
                return res.status(502).json({
                    error: `LanguageTool HTTP ${ltResponse.status}`
                });
            }

            const ltResult = await ltResponse.json();

            // Filter matches
            ltResult.matches = ltResult.matches.filter(match => {
                const word = text.substring(match.offset, match.offset + match.length);
                return !dictionary.includes(word.toLowerCase());
            });

            res.json(ltResult);

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.toString() });
        }
    });

    app.get("/api/spellcheck/dict", acl.hasPermission('settings:read-public'), async (req, res) => {
        return SpellingDictionary.getAll()
            .then(dict => Response.Ok(res, dict))
            .catch(err => Response.Internal(res, err));
    });

    app.post("/api/spellcheck/dict", acl.hasPermission("settings:update"), async (req, res) => {
        try {
            const { word } = req.body;
            if (!word)
                return res.status(400).json({ error: "Missing 'word'" });
            
            const w = word.toLowerCase();
            
            await SpellingDictionary.updateOne(
                { word: w },
                { word: w },
                { upsert: true }
            );

            res.json({ success: true, word: w });

        } catch (err) {
            res.status(500).json({ error: err.toString() });
        }
    });

    app.delete("/api/spellcheck/dict", acl.hasPermission("settings:update"), async (req, res) => {
        try {
            const { word } = req.body;
            if (!word)
                return res.status(400).json({ error: "Missing 'word'" });

            const w = word.toLowerCase();

            await SpellingDictionary.deleteOne({ word: w });

            res.json({ success: true, removed: w });

        } catch (err) {
            res.status(500).json({ error: err.toString() });
        }
    });
};
