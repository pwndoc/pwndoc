const Settings = require('mongoose').model('Settings');

let cachedConfig = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000; // 60 seconds

/**
 * Get the LanguageTool configuration from settings (cached) with env var fallback.
 * Returns { url, apiKey, username } or null if no URL is configured.
 */
async function getLanguageToolConfig() {
    const now = Date.now();
    if (cachedConfig !== null && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedConfig;
    }

    let url = '';
    let apiKey = '';
    let username = '';

    try {
        const settings = await Settings.getAll();
        if (settings?.report?.private) {
            url = settings.report.private.languageToolUrl || '';
            apiKey = settings.report.private.languageToolApiKey || '';
            username = settings.report.private.languageToolUsername || '';
        }
    } catch (err) {
        console.error('Failed to load LanguageTool settings:', err.message);
    }

    // Env var fallback for URL only
    if (!url) {
        url = process.env.LT_URL || process.env.LT_API_URL || '';
    }

    if (!url) {
        cachedConfig = null;
        cacheTimestamp = now;
        return null;
    }

    // Remove trailing slash
    url = url.replace(/\/+$/, '');

    cachedConfig = { url, apiKey, username };
    cacheTimestamp = now;
    return cachedConfig;
}

/**
 * Invalidate the cached config (call after settings are updated).
 */
function invalidateLanguageToolConfigCache() {
    cachedConfig = null;
    cacheTimestamp = 0;
}

module.exports = { getLanguageToolConfig, invalidateLanguageToolConfigCache };
