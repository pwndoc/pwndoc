const acl = require('../lib/auth').acl;
const Response = require('../lib/httpResponse');
const LanguageToolRule = require('mongoose').model('LanguageToolRule');
const xml2js = require('xml2js');

module.exports = function(app) {
    const LT_API_URL = process.env.LT_API_URL || "http://pwndoc-languagetools:8020";

    const parser = new xml2js.Parser();

    /**
     * Helper function to call LanguageTool API for grammar.xml updates and restarts
     */
    async function callLTApi(method, path, body = null) {
        try {
            const url = `${LT_API_URL}${path}`;
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

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
        } catch (err) {
            console.error('LanguageTool API error:', err);
            throw err;
        }
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
            // Extract languages array from the response and return it directly
            Response.Ok(res, { languages: data.languages || [] });
        } catch (err) {
            Response.Internal(res, err);
        }
    });

    // ---------------------------
    // Internal endpoint: Get all rules (no auth required, for LanguageTool API)
    // This endpoint is only accessible from the internal network
    // ---------------------------
    app.get("/api/internal/languagetool-rules", async (req, res) => {
        try {
            LanguageToolRule.getAll()
                .then(rules => {
                    // Transform to match expected format
                    const transformedRules = rules.map(rule => {
                        return {
                            _id: rule._id.toString(),
                            id: rule.id,  // Use the id field from database
                            name: rule.name,
                            language: rule.language,
                            ruleXml: rule.xml
                        };
                    });
                    Response.Ok(res, transformedRules);
                })
                .catch(err => Response.Internal(res, err));
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
                // Transform to match expected format
                const transformedRules = rules.map(rule => {
                    return {
                        _id: rule._id.toString(),
                        id: rule.id,  // Use the id field from database
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
        
        // Try to find by MongoDB _id or rule id field
        LanguageToolRule.getById(ruleId)
            .then(rule => {
                if (!rule) {
                    return Response.NotFound(res, 'Rule not found');
                }
                
                Response.Ok(res, {
                    _id: rule._id.toString(),
                    id: rule.id,  // Use the id field from database
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
            // Extract rule ID from XML
            const ruleId = await extractRuleId(ruleXml);
            const ruleName = await extractRuleName(ruleXml);
            
            // Create rule in MongoDB
            const rule = {
                id: ruleId,  // Store the rule ID from XML
                language,
                name: ruleName,
                xml: ruleXml,
                creator: req.decodedToken ? req.decodedToken.id : null
            };
            
            LanguageToolRule.create(rule)
                .then(savedRule => {
                    // Get all rules for this language to update grammar.xml
                    return LanguageToolRule.getByLanguage(language)
                        .then(allRules => {
                            // Update grammar.xml and restart LanguageTool
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
            // Find rule by MongoDB _id or by rule id field
            let rule = await LanguageToolRule.getById(ruleId);
            
            if (!rule) {
                return Response.NotFound(res, 'Rule not found');
            }
            
            // Delete rule from MongoDB
            LanguageToolRule.delete(rule._id)
                .then(() => {
                    // Get remaining rules for this language to update grammar.xml
                    return LanguageToolRule.getByLanguage(rule.language)
                        .then(remainingRules => {
                            // Update grammar.xml and restart LanguageTool
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
            // Get all rules from MongoDB grouped by language
            const allRules = await LanguageToolRule.getAll();
            const rulesByLanguage = {};
            
            for (const rule of allRules) {
                if (!rulesByLanguage[rule.language]) {
                    rulesByLanguage[rule.language] = [];
                }
                rulesByLanguage[rule.language].push(rule);
            }
            
            // Update grammar.xml for each language
            for (const [language, rules] of Object.entries(rulesByLanguage)) {
                await callLTApi('POST', '/api/rules/update-grammar', { language, rules });
            }
            
            // Restart LanguageTool
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

