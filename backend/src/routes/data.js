module.exports = function(app) {

    var Response = require('../lib/httpResponse.js');
    var acl = require('../lib/auth').acl;
    var utils = require('../lib/utils')
    var Language = require('mongoose').model('Language');
    var AuditType = require('mongoose').model('AuditType');
    var VulnerabilityType = require('mongoose').model('VulnerabilityType');
    var VulnerabilityCategory = require('mongoose').model('VulnerabilityCategory');
    var CustomSection = require('mongoose').model('CustomSection');
    var CustomField = require('mongoose').model('CustomField');
    var AiPrompt = require('mongoose').model('AiPrompt');
    var Settings = require('mongoose').model('Settings');
    const {
        AI_PROVIDERS,
        AI_DEFAULT_PROVIDER,
        AI_PROVIDER_DEFAULTS,
        normalizePromptValue,
        toPromptCompositeKey,
        buildAiFieldCatalog,
        buildPromptMappings
    } = require('../lib/ai-prompts');

    var _ = require('lodash')

    const getAiPromptsPayload = async (settings, isAdmin) => {
        const aiSettings = settings?.ai || {};
        const customFields = await CustomField.getAll();
        const fieldCatalog = buildAiFieldCatalog(customFields);
        const promptRows = await AiPrompt.find({}).select('entityType fieldKey fieldLabel outputType enabled prompt customFieldId').lean();

        const promptMappings = buildPromptMappings(fieldCatalog, promptRows);
        const defaultProvider = AI_PROVIDERS.includes(settings?.ai?.public?.defaultProvider) ?
            settings.ai.public.defaultProvider :
            AI_DEFAULT_PROVIDER;

        const payload = {
            aiEnabled: settings?.ai?.public?.enabled !== false,
            defaultProvider: defaultProvider,
            promptMappings: promptMappings
        };

        if (!isAdmin)
            return payload;

        payload.hasOpenAIApiKey = Boolean((aiSettings?.private?.openaiApiKey || '').trim());
        payload.openaiBaseUrl = String(aiSettings?.private?.openaiBaseUrl || AI_PROVIDER_DEFAULTS.openai.baseUrl);
        payload.openaiModel = String(aiSettings?.private?.openaiModel || AI_PROVIDER_DEFAULTS.openai.model);

        payload.hasAnthropicApiKey = Boolean((aiSettings?.private?.anthropicApiKey || '').trim());
        payload.anthropicBaseUrl = String(aiSettings?.private?.anthropicBaseUrl || AI_PROVIDER_DEFAULTS.anthropic.baseUrl);
        payload.anthropicModel = String(aiSettings?.private?.anthropicModel || AI_PROVIDER_DEFAULTS.anthropic.model);
        payload.anthropicVersion = String(aiSettings?.private?.anthropicVersion || AI_PROVIDER_DEFAULTS.anthropic.version);

        payload.hasDeepseekApiKey = Boolean((aiSettings?.private?.deepseekApiKey || '').trim());
        payload.deepseekBaseUrl = String(aiSettings?.private?.deepseekBaseUrl || AI_PROVIDER_DEFAULTS.deepseek.baseUrl);
        payload.deepseekModel = String(aiSettings?.private?.deepseekModel || AI_PROVIDER_DEFAULTS.deepseek.model);

        payload.hasOllamaApiKey = Boolean((aiSettings?.private?.ollamaApiKey || '').trim());
        payload.ollamaBaseUrl = String(aiSettings?.private?.ollamaBaseUrl || AI_PROVIDER_DEFAULTS.ollama.baseUrl);
        payload.ollamaModel = String(aiSettings?.private?.ollamaModel || AI_PROVIDER_DEFAULTS.ollama.model);

        return payload;
    }

/* ===== ROLES ===== */

    // Get Roles list
    app.get("/api/data/roles", acl.hasPermission('roles:read'), function(req, res) {
        try {
            var result = Object.keys(acl.roles)
            Response.Ok(res, result)
        }
        catch (error) {
            Response.Internal(res, error)
        }
    })

/* ===== AI PROMPTS ===== */

    // Get AI prompts
    app.get("/api/data/ai-prompts", acl.hasPermission('settings:read-public'), async function(req, res) {
        try {
            const settings = await Settings.getAll();
            const isAdmin = acl.isAllowed(req.decodedToken.role, 'settings:update');
            const payload = await getAiPromptsPayload(settings, isAdmin);
            Response.Ok(res, payload);
        } catch (err) {
            Response.Internal(res, err);
        }
    });

    // Update AI prompts (admin only)
    app.put("/api/data/ai-prompts", acl.hasPermission('settings:update'), async function(req, res) {
        try {
            let currentSettings = await Settings.getAll() || {};
            const update = {$set: {}};

            if (req.body.aiEnabled !== undefined) {
                if (typeof req.body.aiEnabled !== 'boolean') {
                    Response.BadParameters(res, 'Invalid aiEnabled payload');
                    return;
                }
                update.$set['ai.public.enabled'] = req.body.aiEnabled;
            }

            if (req.body.defaultProvider !== undefined) {
                const provider = String(req.body.defaultProvider || '').toLowerCase().trim();
                if (!AI_PROVIDERS.includes(provider)) {
                    Response.BadParameters(res, `Invalid defaultProvider. Allowed values: ${AI_PROVIDERS.join(', ')}`);
                    return;
                }
                update.$set['ai.public.defaultProvider'] = provider;
            }

            const apiKeyFields = [
                { bodyField: 'openaiApiKey', settingsField: 'ai.private.openaiApiKey' },
                { bodyField: 'anthropicApiKey', settingsField: 'ai.private.anthropicApiKey' },
                { bodyField: 'deepseekApiKey', settingsField: 'ai.private.deepseekApiKey' },
                { bodyField: 'ollamaApiKey', settingsField: 'ai.private.ollamaApiKey' }
            ];

            for (const entry of apiKeyFields) {
                if (!Object.prototype.hasOwnProperty.call(req.body, entry.bodyField))
                    continue;

                const keyValue = req.body[entry.bodyField];
                if (typeof keyValue !== 'string') {
                    Response.BadParameters(res, `Invalid ${entry.bodyField} payload`);
                    return;
                }

                const apiKey = keyValue.trim();
                if (apiKey) {
                    update.$set[entry.settingsField] = apiKey;
                } else {
                    update.$unset = update.$unset || {};
                    update.$unset[entry.settingsField] = 1;
                }
            }

            const providerConfigFields = [
                { bodyField: 'openaiBaseUrl', settingsField: 'ai.private.openaiBaseUrl', fallback: AI_PROVIDER_DEFAULTS.openai.baseUrl },
                { bodyField: 'openaiModel', settingsField: 'ai.private.openaiModel', fallback: AI_PROVIDER_DEFAULTS.openai.model },
                { bodyField: 'anthropicBaseUrl', settingsField: 'ai.private.anthropicBaseUrl', fallback: AI_PROVIDER_DEFAULTS.anthropic.baseUrl },
                { bodyField: 'anthropicModel', settingsField: 'ai.private.anthropicModel', fallback: AI_PROVIDER_DEFAULTS.anthropic.model },
                { bodyField: 'anthropicVersion', settingsField: 'ai.private.anthropicVersion', fallback: AI_PROVIDER_DEFAULTS.anthropic.version },
                { bodyField: 'deepseekBaseUrl', settingsField: 'ai.private.deepseekBaseUrl', fallback: AI_PROVIDER_DEFAULTS.deepseek.baseUrl },
                { bodyField: 'deepseekModel', settingsField: 'ai.private.deepseekModel', fallback: AI_PROVIDER_DEFAULTS.deepseek.model },
                { bodyField: 'ollamaBaseUrl', settingsField: 'ai.private.ollamaBaseUrl', fallback: AI_PROVIDER_DEFAULTS.ollama.baseUrl },
                { bodyField: 'ollamaModel', settingsField: 'ai.private.ollamaModel', fallback: AI_PROVIDER_DEFAULTS.ollama.model }
            ];

            for (const entry of providerConfigFields) {
                if (!Object.prototype.hasOwnProperty.call(req.body, entry.bodyField))
                    continue;

                const value = req.body[entry.bodyField];
                if (typeof value !== 'string') {
                    Response.BadParameters(res, `Invalid ${entry.bodyField} payload`);
                    return;
                }

                const normalized = value.trim();
                update.$set[entry.settingsField] = normalized || entry.fallback;
            }

            if (Array.isArray(req.body.promptMappings)) {
                const customFields = await CustomField.getAll();
                const fieldCatalog = buildAiFieldCatalog(customFields);
                const fieldByCompositeKey = new Map(
                    fieldCatalog.map((field) => [toPromptCompositeKey(field.entityType, field.fieldKey), field])
                );
                const seenCompositeKeys = new Set();
                const operations = [];

                for (const mapping of req.body.promptMappings) {
                    if (!mapping || typeof mapping !== 'object') {
                        Response.BadParameters(res, 'Invalid promptMappings payload');
                        return;
                    }

                    const entityType = String(mapping.entityType || '').trim();
                    const fieldKey = String(mapping.fieldKey || '').trim();
                    const compositeKey = toPromptCompositeKey(entityType, fieldKey);
                    if (!entityType || !fieldKey || !fieldByCompositeKey.has(compositeKey)) {
                        Response.BadParameters(res, `Invalid prompt mapping: ${entityType || '(entityType missing)'} / ${fieldKey || '(fieldKey missing)'}`);
                        return;
                    }
                    if (seenCompositeKeys.has(compositeKey))
                        continue;

                    seenCompositeKeys.add(compositeKey);
                    const fieldMeta = fieldByCompositeKey.get(compositeKey);
                    const prompt = normalizePromptValue(mapping.prompt);
                    let enabled = true;
                    if (Object.prototype.hasOwnProperty.call(mapping, 'enabled')) {
                        if (typeof mapping.enabled !== 'boolean') {
                            Response.BadParameters(res, `Invalid prompt enabled flag for: ${fieldMeta.entityType} / ${fieldMeta.fieldKey}`);
                            return;
                        }
                        enabled = mapping.enabled;
                    }
                    operations.push({
                        updateOne: {
                            filter: {entityType: fieldMeta.entityType, fieldKey: fieldMeta.fieldKey},
                            update: {
                                $set: {
                                    entityType: fieldMeta.entityType,
                                    fieldKey: fieldMeta.fieldKey,
                                    fieldLabel: fieldMeta.fieldLabel,
                                    outputType: fieldMeta.outputType,
                                    customFieldId: fieldMeta.customFieldId || null,
                                    enabled: enabled,
                                    prompt: prompt
                                }
                            },
                            upsert: true
                        }
                    });
                }

                if (operations.length > 0)
                    await AiPrompt.bulkWrite(operations);

                const validCompositeKeys = new Set(Array.from(fieldByCompositeKey.keys()));
                const existingRows = await AiPrompt.find({}).select('_id entityType fieldKey').lean();
                const staleIds = existingRows
                .filter((row) => !validCompositeKeys.has(toPromptCompositeKey(row.entityType, row.fieldKey)))
                .map((row) => row._id);
                if (staleIds.length > 0)
                    await AiPrompt.deleteMany({_id: {$in: staleIds}});
            } else if (req.body.promptMappings !== undefined) {
                Response.BadParameters(res, 'Invalid promptMappings payload');
                return;
            }

            if (!update.$set || Object.keys(update.$set).length === 0)
                delete update.$set;
            if (!update.$unset || Object.keys(update.$unset).length === 0)
                delete update.$unset;

            if (update.$set || update.$unset) {
                currentSettings = await Settings.findOneAndUpdate({}, update, {
                    new: true,
                    runValidators: true,
                    upsert: true
                });
            }

            const payload = await getAiPromptsPayload(currentSettings, true);
            Response.Ok(res, payload);
        } catch (err) {
            Response.Internal(res, err);
        }
    });

/* ===== LANGUAGES ===== */

    // Get languages list
    app.get("/api/data/languages", acl.hasPermission('languages:read'), function(req, res) {
        Language.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create language
    app.post("/api/data/languages", acl.hasPermission('languages:create'), function(req, res) {
        if (!req.body.locale || !req.body.language) {
            Response.BadParameters(res, 'Missing required parameters: locale, language');
            return;
        }
        if (!utils.validFilename(req.body.language) || !utils.validFilename(req.body.locale)) {
            Response.BadParameters(res, 'language and locale value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
            return
        }
        
        var language = {};
        language.locale = req.body.locale;
        language.language = req.body.language;

        Language.create(language)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete Language
    app.delete("/api/data/languages/:locale", acl.hasPermission('languages:delete'), function(req, res) {
        Language.delete(req.params.locale)
        .then(msg => {
            Response.Ok(res, 'Language deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update Languages
    app.put("/api/data/languages", acl.hasPermission('languages:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var language = req.body[i]
            if (!language.locale || !language.language) {
                Response.BadParameters(res, 'Missing required parameters: locale, language')
                return
            }
            if (!utils.validFilename(language.language) || !utils.validFilename(language.locale)) {
                Response.BadParameters(res, 'language and locale value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
                return
            }
        }

        var languages = []
        req.body.forEach(e => {
            languages.push({language: e.language, locale: e.locale})
        })

        Language.updateAll(languages)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

/* ===== AUDIT TYPES ===== */

    // Get audit types list
    app.get("/api/data/audit-types", acl.hasPermission('audit-types:read'), function(req, res) {
        AuditType.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create audit type
    app.post("/api/data/audit-types", acl.hasPermission('audit-types:create'), function(req, res) {
        if (!req.body.name || !req.body.templates) {
            Response.BadParameters(res, 'Missing required parameters: name, templates');
            return;
        }
        if (!utils.validFilename(req.body.name)) {
            Response.BadParameters(res, 'name and locale value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
            return
        }

        var auditType = {};
        auditType.stage = 'default'
        // Required parameters
        auditType.name = req.body.name;
        auditType.templates = req.body.templates;

        // Optional parameters
        if (req.body.sections) auditType.sections = req.body.sections
        if (req.body.hidden) auditType.hidden = req.body.hidden
        if (req.body.stage && (req.body.stage === 'multi' || req.body.stage === 'retest'))
            auditType.stage = req.body.stage

        // Fix hidden sections for multi and retest audits
        if (auditType.stage === 'multi' || auditType.stage === 'retest')
            auditType.hidden = ['network']

        AuditType.create(auditType)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete audit type
    app.delete("/api/data/audit-types/:name", acl.hasPermission('audit-types:delete'), function(req, res) {
        AuditType.delete(req.params.name)
        .then(msg => {
            Response.Ok(res, 'Audit type deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update Audit Types
    app.put("/api/data/audit-types", acl.hasPermission('audit-types:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var auditType = req.body[i]
            if (!auditType.name || !auditType.templates) {
                Response.BadParameters(res, 'Missing required parameters: name, templates')
                return
            }
            if (!utils.validFilename(auditType.name)) {
                Response.BadParameters(res, 'name and locale value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
                return
            }
        }

        var auditTypes = []
        req.body.forEach(e => {
            // Fix hidden sections for multi and retest audits
            if (e.stage === 'multi' || e.stage === 'retest')
                auditTypes.push({
                    name: e.name,
                    templates: e.templates,
                    sections: e.sections,
                    hidden: ['network'],
                    stage: e.stage
                })
            else
                auditTypes.push({
                    name: e.name,
                    templates: e.templates,
                    sections: e.sections,
                    hidden: e.hidden,
                    stage: 'default'
                })
        })

        AuditType.updateAll(auditTypes)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

/* ===== VULNERABILITY TYPES ===== */

     // Get vulnerability types list
     app.get("/api/data/vulnerability-types", acl.hasPermission('vulnerability-types:read'), function(req, res) {
        VulnerabilityType.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create vulnerability type
    app.post("/api/data/vulnerability-types", acl.hasPermission('vulnerability-types:create'), function(req, res) {
        if (!req.body.name || !req.body.locale) {
            Response.BadParameters(res, 'Missing required parameters: name, locale');
            return;
        }
        if (!utils.validFilename(req.body.name) || !utils.validFilename(req.body.locale)) {
            Response.BadParameters(res, 'name and locale value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
            return
        }

        var vulnType = {};
        vulnType.name = req.body.name;
        vulnType.locale = req.body.locale;
        VulnerabilityType.create(vulnType)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete vulnerability type
    app.delete("/api/data/vulnerability-types/:name", acl.hasPermission('vulnerability-types:delete'), function(req, res) {
        VulnerabilityType.delete(req.params.name)
        .then(msg => {
            Response.Ok(res, 'Vulnerability type deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

    // Update Vulnerability Types
    app.put("/api/data/vulnerability-types", acl.hasPermission('vulnerability-types:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var vulnType = req.body[i]
            if (!vulnType.name || !vulnType.locale) {
                Response.BadParameters(res, 'Missing required parameters: name, locale')
                return
            }
            if (!utils.validFilename(vulnType.name) || !utils.validFilename(vulnType.locale)) {
                Response.BadParameters(res, 'name and locale value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
                return
            }
        }

        var vulnTypes = []
        req.body.forEach(e => {
            vulnTypes.push({name: e.name, locale: e.locale})
        })

        VulnerabilityType.updateAll(vulnTypes)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

/* ===== VULNERABILITY CATEGORY ===== */

     // Get vulnerability category list
     app.get("/api/data/vulnerability-categories", acl.hasPermission('vulnerability-categories:read'), function(req, res) {
        VulnerabilityCategory.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create vulnerability category
    app.post("/api/data/vulnerability-categories", acl.hasPermission('vulnerability-categories:create'), function(req, res) {
        if (!req.body.name) {
            Response.BadParameters(res, 'Missing required parameters: name');
            return;
        }
        if (!utils.validFilename(req.body.name)) {
            Response.BadParameters(res, 'name value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
            return
        }

        var vulnCat = {};
        // Required parameters
        vulnCat.name = req.body.name;

        // Optional parameters
        if (!_.isNil(req.body.sortValue)) vulnCat.sortValue = req.body.sortValue
        if (!_.isNil(req.body.sortOrder)) vulnCat.sortOrder = req.body.sortOrder
        if (!_.isNil(req.body.sortAuto)) vulnCat.sortAuto = req.body.sortAuto

        VulnerabilityCategory.create(vulnCat)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Update Vulnerability Category
    app.put("/api/data/vulnerability-categories", acl.hasPermission('vulnerability-categories:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var vulnCat = req.body[i]
            if (!vulnCat.name) {
                Response.BadParameters(res, 'Missing required parameters: name')
                return
            }
            if (!utils.validFilename(vulnCat.name)) {
                Response.BadParameters(res, 'name value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
                return
            }
        }

        var vulnCategories = []
        req.body.forEach(e => {
            // Required parameters
            var tmpCat = {name: e.name}

            // Optional parameters
            if (!_.isNil(e.sortValue)) tmpCat.sortValue = e.sortValue
            if (!_.isNil(e.sortOrder)) tmpCat.sortOrder = e.sortOrder
            if (!_.isNil(e.sortAuto)) tmpCat.sortAuto = e.sortAuto

            vulnCategories.push(tmpCat)
        })

        VulnerabilityCategory.updateAll(vulnCategories)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete vulnerability category
    app.delete("/api/data/vulnerability-categories/:name", acl.hasPermission('vulnerability-categories:delete'), function(req, res) {
        VulnerabilityCategory.delete(req.params.name)
        .then(msg => {
            Response.Ok(res, 'Vulnerability category deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

/* ===== SECTIONS ===== */

    // Get sections list
    app.get("/api/data/sections", acl.hasPermission('sections:read'), function(req, res) {
        CustomSection.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Create section
    app.post("/api/data/sections", acl.hasPermission('sections:create'), function(req, res) {
        if (!req.body.field || !req.body.name) {
            Response.BadParameters(res, 'Missing required parameters: field, name');
            return;
        }
        if (!utils.validFilename(req.body.field) || !utils.validFilename(req.body.name)) {
            Response.BadParameters(res, 'name and field value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
            return
        }
        
        var section = {};
        section.field = req.body.field;
        section.name = req.body.name;
        section.locale = req.body.locale;
        // Optional parameters
        if (req.body.text) section.text = req.body.text
        if (req.body.icon) section.icon = req.body.icon

        CustomSection.create(section)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });
    
    // Delete section
    app.delete("/api/data/sections/:field/:locale", acl.hasPermission('sections:delete'), function(req, res) {
        CustomSection.delete(req.params.field, req.params.locale)
        .then(msg => {
            Response.Ok(res, 'Section deleted successfully')
        })
        .catch(err => Response.Internal(res, err))
    });

     // Update sections
     app.put("/api/data/sections", acl.hasPermission('sections:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var section = req.body[i]
            if (!section.name || !section.field) {
                Response.BadParameters(res, 'Missing required parameters: name, field')
                return
            }
            if (!utils.validFilename(section.name) || !utils.validFilename(section.field)) {
                Response.BadParameters(res, 'name and field value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
                return
            }
        }

        var sections = []
        req.body.forEach(e => {
            sections.push({name: e.name, field: e.field, icon: e.icon || ""})
        })

        CustomSection.updateAll(sections)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

/* ===== CUSTOM FIELDS ===== */

    // Get custom fields
    app.get("/api/data/custom-fields", acl.hasPermission('custom-fields:read'), function(req, res) {
        CustomField.getAll()
        .then(msg => Response.Ok(res, msg))
        .catch(err => Response.Internal(res, err))
    })

    // Create custom field
    app.post("/api/data/custom-fields", acl.hasPermission('custom-fields:create'), function(req, res) {
        if ((!req.body.fieldType || !req.body.label || !req.body.display) && req.body.fieldType !== 'space') {
            Response.BadParameters(res, 'Missing required parameters: fieldType, label, display')
            return
        }
        if ((!utils.validFilename(req.body.fieldType) || !utils.validFilename(req.body.label)) && req.body.fieldType !== 'space') {
            Response.BadParameters(res, 'name and field value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
            return
        }
        
        var customField = {}
        customField.fieldType = req.body.fieldType
        customField.label = req.body.label
        customField.display = req.body.display
        if (req.body.displaySub) customField.displaySub = req.body.displaySub
        if (req.body.size) customField.size = req.body.size
        if (req.body.offset) customField.offset = req.body.offset
        if (typeof req.body.required === 'boolean' && req.body.fieldType !== 'space') customField.required = req.body.required
        if (typeof req.body.inline === 'boolean' && req.body.fieldType !== 'space') customField.required = req.body.inline
        if (req.body.description) customField.description = req.body.description
        if (req.body.text) customField.text = req.body.text
        if (req.body.options) customField.options = req.body.options
        if (typeof req.body.position === 'number') customField.position = req.body.position

        CustomField.create(customField)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    })

     // Update custom fields
     app.put("/api/data/custom-fields", acl.hasPermission('custom-fields:update'), function(req, res) {
        for (var i=0; i<req.body.length; i++) {
            var customField = req.body[i]
            if ((!customField.label || !customField._id || !customField.display) && customField.fieldType !== 'space') {
                Response.BadParameters(res, 'Missing required parameters: _id, label, display')
                return
            }
            if ((!utils.validFilename(customField.label || !utils.validFilename(customField.fieldType))) && customField.fieldType !== 'space') {
                Response.BadParameters(res, 'label and fieldType value must match /^[\p{Letter}\p{Mark}0-9 \[\]\'()_-]+$/iu')
                return
            }
        }

        var customFields = []
        req.body.forEach(e => {
            var field = {_id: e._id, label: e.label, display: e.display}
            if (typeof e.size === 'number') field.size = e.size
            if (typeof e.offset === 'number') field.offset = e.offset
            if (typeof e.required === 'boolean') field.required = e.required
            if (typeof e.inline === 'boolean') field.inline = e.inline
            if (!_.isNil(e.description)) field.description = e.description
            if (!_.isNil(e.text)) field.text = e.text
            if (isArray(e.options)) field.options = e.options
            if (typeof e.position === 'number') field.position = e.position
            customFields.push(field)
        })

        CustomField.updateAll(customFields)
        .then(msg => Response.Created(res, msg))
        .catch(err => Response.Internal(res, err))
    });

    // Delete custom field
    app.delete("/api/data/custom-fields/:fieldId", acl.hasPermission('custom-fields:delete'), function(req, res) {
        CustomField.delete(req.params.fieldId)
        .then(msg => {
            Response.Ok(res, msg)
        })
        .catch(err => Response.Internal(res, err))
    });
}
