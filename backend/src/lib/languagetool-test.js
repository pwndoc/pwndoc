const { isHttpUrl } = require('./utils');

/**
 * Test a LanguageTool endpoint and return a structured result.
 * @param {string} url - Base URL of the LanguageTool service
 * @param {string} [apiKey]
 * @param {string} [username]
 * @returns {{ valid: boolean, reachable: boolean, isLanguageTool: boolean, supportsCustomRules: boolean, authValid: boolean|null, requiresApiKey: boolean, error?: string }}
 */
async function testLanguageToolConnection(url, apiKey, username) {
    if (!url) return { valid: false, error: 'url is required' };
    if (!isHttpUrl(url)) return { valid: false, error: 'url must use http or https' };

    const baseUrl = url.replace(/\/?$/, '/');
    let reachable = false;
    let isLanguageTool = false;
    let supportsCustomRules = false;
    let authValid = null;
    let isPwndocLT = false;

    // Step 1: probe health — definitive if pwndoc-languagetools
    try {
        const healthRes = await fetch(new URL('health', baseUrl), { signal: AbortSignal.timeout(5000) });
        if (healthRes.ok) {
            try {
                const healthData = await healthRes.json();
                isPwndocLT = healthData.type === 'pwndoc-languagetools';
                if (isPwndocLT) {
                    reachable = true;
                    isLanguageTool = true;
                    supportsCustomRules = true;
                }
            } catch (_) {}
        }
    } catch (_) {}

    // Step 2: if not pwndoc-LT, probe v2/info (vanilla LT or public LT)
    if (!isPwndocLT) {
        try {
            const infoRes = await fetch(new URL('v2/info', baseUrl), { signal: AbortSignal.timeout(5000) });
            reachable = true;
            const infoData = await infoRes.json();
            if (infoRes.ok && infoData.software?.name === 'LanguageTool') {
                isLanguageTool = true;
            }
        } catch (_) {}
    }

    if (!reachable) {
        return { valid: false, reachable: false, isLanguageTool: false, supportsCustomRules: false, authValid: null, requiresApiKey: false };
    }

    // Step 3: validate credentials if provided
    let requiresApiKey = false;
    if (isPwndocLT) {
        const headers = {};
        if (apiKey) headers['X-Api-Key'] = apiKey;
        try {
            const rulesRes = await fetch(new URL('api/languages', baseUrl), { headers, signal: AbortSignal.timeout(5000) });
            if (rulesRes.status === 401) {
                authValid = false;
                if (!apiKey) requiresApiKey = true;
            } else {
                authValid = true;
            }
        } catch (_) {}
    } else if (apiKey && username) {
        const params = new URLSearchParams({ text: 'test', language: 'en', apiKey, username });
        try {
            const checkRes = await fetch(new URL('v2/check', baseUrl), {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params,
                signal: AbortSignal.timeout(8000)
            });
            authValid = checkRes.status !== 401 && checkRes.status !== 403;
        } catch (_) {}
    }

    return { valid: true, reachable, isLanguageTool, supportsCustomRules, authValid, requiresApiKey };
}

module.exports = { testLanguageToolConnection };
