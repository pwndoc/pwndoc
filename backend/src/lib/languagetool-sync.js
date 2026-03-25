const { getLanguageToolConfig } = require('./languagetool-config');

/**
 * Best-effort async: push all custom rules from MongoDB to LanguageTool.
 * Called on backend startup. Non-blocking — logs warnings on failure.
 */
async function syncRulesToLanguageTool() {
    const config = await getLanguageToolConfig();
    if (!config) {
        return; // No LanguageTool configured
    }

    // Check if it's a pwndoc-languagetools instance (supports custom rules)
    let healthData;
    try {
        const healthRes = await fetch(`${config.url}/health`, {
            signal: AbortSignal.timeout(5000)
        });
        if (!healthRes.ok) return;
        healthData = await healthRes.json();
    } catch {
        return; // Not reachable
    }

    if (healthData.type !== 'pwndoc-languagetools') {
        return; // Not a pwndoc-languagetools instance
    }

    // Push all rules
    const LanguageToolRule = require('mongoose').model('LanguageToolRule');
    const allRules = await LanguageToolRule.getAll();

    if (allRules.length === 0) {
        console.log('LanguageTool sync: no custom rules to push');
        return;
    }

    const rulesByLanguage = {};
    for (const rule of allRules) {
        if (!rulesByLanguage[rule.language]) {
            rulesByLanguage[rule.language] = [];
        }
        rulesByLanguage[rule.language].push(rule);
    }

    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
        headers['X-Api-Key'] = config.apiKey;
    }

    for (const [language, rules] of Object.entries(rulesByLanguage)) {
        const res = await fetch(`${config.url}/api/rules/update-grammar`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ language, rules }),
            signal: AbortSignal.timeout(10000)
        });
        if (!res.ok) {
            const err = await res.text();
            console.warn(`LanguageTool sync: failed to push rules for ${language}: ${err}`);
        }
    }

    // Restart to pick up changes
    const restartRes = await fetch(`${config.url}/api/rules/restart`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(15000)
    });

    if (restartRes.ok) {
        console.log(`LanguageTool sync: pushed ${allRules.length} rules and restarted`);
    } else {
        console.warn('LanguageTool sync: push succeeded but restart failed');
    }
}

module.exports = { syncRulesToLanguageTool };
