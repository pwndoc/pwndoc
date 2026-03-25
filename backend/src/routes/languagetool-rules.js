const acl = require('../lib/auth').acl;
const Response = require('../lib/httpResponse');
const LanguageToolRule = require('mongoose').model('LanguageToolRule');
const xml2js = require('xml2js');
const { getLanguageToolConfig } = require('../lib/languagetool-config');

module.exports = function(app) {

    const parser = new xml2js.Parser();

    /**
     * Helper function to call LanguageTool admin API with apiKey auth
     */
    async function callLTApi(method, path, body = null) {
        const config = await getLanguageToolConfig();
        if (!config) {
            throw new Error('LanguageTool is not configured');
        }

        const url = `${config.url}${path}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (config.apiKey) {
            options.headers['X-Api-Key'] = config.apiKey;
        }

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText || `HTTP ${response.status}` };
            }
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Extract rule ID from XML
     */
    function extractRuleId(xmlContent) {
        return new Promise((resolve, reject) => {
            parser.parseString(xmlContent, (err, result) => {
                if (err) {
                    return reject(new Error(`Error parsing XML: ${err.message}`));
                }

                const rule = result.rule || (result.rules && result.rules.rule && result.rules.rule[0]);
                if (!rule || !rule.$ || !rule.$.id) {
                    return reject(new Error('Rule XML must contain a rule with an id attribute'));
                }

                resolve(rule.$.id);
            });
        });
    }

    /**
     * Extract rule Name from XML
     */
    function extractRuleName(xmlContent) {
        return new Promise((resolve, reject) => {
            parser.parseString(xmlContent, (err, result) => {
                if (err) {
                    return reject(new Error(`Error parsing XML: ${err.message}`));
                }

                const rule = result.rule || (result.rules && result.rules.rule && result.rules.rule[0]);
                if (!rule || !rule.$ || !rule.$.name) {
                    return reject(new Error('Rule XML must contain a rule with a name attribute'));
                }

                resolve(rule.$.name);
            });
        });
    }

    // ---------------------------
    // Get supported languages
    // ---------------------------
    app.get("/api/languagetool-rules/languages", acl.hasPermission("settings:read"), async (req, res) => {
        try {
            const data = await callLTApi('GET', '/api/languages');
            Response.Ok(res, { languages: data.languages || [] });
        } catch (err) {
            Response.Internal(res, err);
        }
    });

    // ---------------------------
    // List all custom rules
    // ---------------------------
    app.get("/api/languagetool-rules", acl.hasPermission('settings:read-public'), async (req, res) => {
        LanguageToolRule.getAll()
            .then(rules => {
                const transformedRules = rules.map(rule => {
                    return {
                        _id: rule._id.toString(),
                        id: rule.id,
                        name: rule.name,
                        language: rule.language,
                        ruleXml: rule.xml
                    };
                });
                Response.Ok(res, transformedRules);
            })
            .catch(err => Response.Internal(res, err));
    });

    // ---------------------------
    // Get a specific rule by ID
    // ---------------------------
    app.get("/api/languagetool-rules/:id", acl.hasPermission('settings:read-public'), async (req, res) => {
        const ruleId = req.params.id;

        LanguageToolRule.getById(ruleId)
            .then(rule => {
                if (!rule) {
                    return Response.NotFound(res, 'Rule not found');
                }

                Response.Ok(res, {
                    _id: rule._id.toString(),
                    id: rule.id,
                    name: rule.name,
                    language: rule.language,
                    ruleXml: rule.xml
                });
            })
            .catch(err => Response.Internal(res, err));
    });

    // ---------------------------
    // Create a new rule
    // ---------------------------
    app.post("/api/languagetool-rules", acl.hasPermission("settings:update"), async (req, res) => {
        const { language, ruleXml } = req.body;

        if (!language) {
            return Response.BadParameters(res, 'Language is required');
        }

        if (!ruleXml) {
            return Response.BadParameters(res, 'Rule XML is required');
        }

        try {
            const ruleId = await extractRuleId(ruleXml);
            const ruleName = await extractRuleName(ruleXml);

            const rule = {
                id: ruleId,
                language,
                name: ruleName,
                xml: ruleXml,
                creator: req.decodedToken ? req.decodedToken.id : null
            };

            LanguageToolRule.create(rule)
                .then(savedRule => {
                    return LanguageToolRule.getByLanguage(language)
                        .then(allRules => {
                            // Push updated rules to LanguageTool (best-effort)
                            return callLTApi('POST', '/api/rules/update-grammar', { language, rules: allRules })
                                .then(() => callLTApi('POST', '/api/rules/restart'))
                                .then(() => {
                                    Response.Created(res, {
                                        _id: savedRule._id.toString(),
                                        ruleId,
                                        language,
                                        name: ruleName
                                    });
                                });
                        });
                })
                .catch(err => Response.Internal(res, err));
        } catch (err) {
            Response.BadParameters(res, err.message);
        }
    });

    // ---------------------------
    // Delete a rule
    // ---------------------------
    app.delete("/api/languagetool-rules/:id", acl.hasPermission("settings:update"), async (req, res) => {
        const ruleId = req.params.id;

        try {
            let rule = await LanguageToolRule.getById(ruleId);

            if (!rule) {
                return Response.NotFound(res, 'Rule not found');
            }

            LanguageToolRule.delete(rule._id)
                .then(() => {
                    return LanguageToolRule.getByLanguage(rule.language)
                        .then(remainingRules => {
                            return callLTApi('POST', '/api/rules/update-grammar', { language: rule.language, rules: remainingRules })
                                .then(() => callLTApi('POST', '/api/rules/restart'))
                                .then(() => {
                                    Response.Ok(res, 'Rule deleted successfully');
                                });
                        });
                })
                .catch(err => Response.Internal(res, err));
        } catch (err) {
            Response.Internal(res, err);
        }
    });

    // ---------------------------
    // Reload rules (update grammar.xml and restart LanguageTool)
    // ---------------------------
    app.post("/api/languagetool-rules/reload", acl.hasPermission("settings:update"), async (req, res) => {
        try {
            const allRules = await LanguageToolRule.getAll();
            const rulesByLanguage = {};

            for (const rule of allRules) {
                if (!rulesByLanguage[rule.language]) {
                    rulesByLanguage[rule.language] = [];
                }
                rulesByLanguage[rule.language].push(rule);
            }

            for (const [language, rules] of Object.entries(rulesByLanguage)) {
                await callLTApi('POST', '/api/rules/update-grammar', { language, rules });
            }

            const result = await callLTApi('POST', '/api/rules/restart');
            Response.Ok(res, {
                message: 'Rules reloaded and LanguageTool restarted successfully',
                pid: result.pid
            });
        } catch (err) {
            Response.Internal(res, err);
        }
    });

    // ---------------------------
    // Restart LanguageTool process
    // ---------------------------
    app.post("/api/languagetool-rules/restart", acl.hasPermission("settings:update"), async (req, res) => {
        try {
            const result = await callLTApi('POST', '/api/rules/restart');
            Response.Ok(res, {
                message: result.message,
                pid: result.pid
            });
        } catch (err) {
            Response.Internal(res, err);
        }
    });
};
