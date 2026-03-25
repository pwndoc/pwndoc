#!/usr/bin/env node
/**
 * LanguageTool Rule Management API
 * Handles grammar.xml updates and LanguageTool process management
 * All database operations are handled by the backend
 */
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuration
const GRAMMAR_XML_BASE = '/LanguageTool';
const GRAMMAR_XML_BASE_PATH = path.join(GRAMMAR_XML_BASE, 'org', 'languagetool', 'rules');
const API_PORT = parseInt(process.env.LT_API_PORT || '8020', 10);
const LT_JAVA_PORT = 8010;
const REQUIRE_API_KEY = (process.env.REQUIRE_API_KEY || 'true').toLowerCase() !== 'false';
const API_KEY_FILE = process.env.API_KEY_FILE || '/data/api-key';
const VERSION = '1.0.0';

// API key management
let apiKey = null;

function loadOrGenerateApiKey() {
    // Explicit env var takes precedence
    if (process.env.API_KEY) {
        apiKey = process.env.API_KEY;
        console.log('Using API key from environment variable');
        return;
    }

    // Try to load from file
    try {
        if (fs.existsSync(API_KEY_FILE)) {
            apiKey = fs.readFileSync(API_KEY_FILE, 'utf8').trim();
            console.log('Loaded API key from file');
            return;
        }
    } catch (err) {
        console.warn('Failed to read API key file:', err.message);
    }

    // Generate new key
    apiKey = crypto.randomBytes(32).toString('hex');
    try {
        const dir = path.dirname(API_KEY_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(API_KEY_FILE, apiKey, 'utf8');
        console.log('Generated and saved new API key');
    } catch (err) {
        console.warn('Failed to save API key to file:', err.message);
    }

    console.log(`\n========================================`);
    console.log(`API Key: ${apiKey}`);
    console.log(`Use this key in PwnDoc settings.`);
    console.log(`========================================\n`);
}

function validateApiKey(req, res, next) {
    if (!REQUIRE_API_KEY) return next();

    const key = req.headers['x-api-key'] || req.body?.apiKey || req.query?.apiKey;
    if (!key || key !== apiKey) {
        return res.status(401).json({ error: 'Invalid or missing API key' });
    }
    next();
}

// LanguageTool process tracking
let languageToolProcess = null;
let languageToolPid = null;
let isShuttingDown = false;
let intentionalStop = false;
let isRestarting = false;
let restartTimer = null;
let stabilityTimer = null;
let restartAttempts = 0;
let rapidCrashCount = 0;
let lastStartTime = null;
let languageToolStatus = 'crashed';
let crashLoopDetected = false;
let lastExitReason = null;

const RESTART_BASE_DELAY_MS = parseInt(process.env.LT_RESTART_BASE_DELAY_MS || '1000', 10);
const RESTART_MAX_DELAY_MS = parseInt(process.env.LT_RESTART_MAX_DELAY_MS || '30000', 10);
const RESTART_MAX_ATTEMPTS = parseInt(process.env.LT_RESTART_MAX_ATTEMPTS || '10', 10);
const RAPID_CRASH_WINDOW_MS = parseInt(process.env.LT_RAPID_CRASH_WINDOW_MS || '30000', 10);
const RAPID_CRASH_THRESHOLD = parseInt(process.env.LT_RAPID_CRASH_THRESHOLD || '5', 10);

function clearRestartTimer() {
    if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
    }
}

function clearStabilityTimer() {
    if (stabilityTimer) {
        clearTimeout(stabilityTimer);
        stabilityTimer = null;
    }
}

function markLanguageToolStable(pid) {
    if (!languageToolProcess || languageToolPid !== pid) {
        return;
    }

    stabilityTimer = null;
    languageToolStatus = 'ok';
    restartAttempts = 0;
    rapidCrashCount = 0;
}

function enterCrashLoop(reason) {
    crashLoopDetected = true;
    languageToolStatus = 'crash_loop';
    clearRestartTimer();
    console.error(
        `[LanguageTool] Crash loop detected (${rapidCrashCount} rapid failures). ` +
        `Check Java memory settings (LT_JAVA_XMS/LT_JAVA_XMX). Not restarting. Last reason: ${reason}`
    );
}

function scheduleRestart(reason) {
    if (isShuttingDown || crashLoopDetected) {
        return;
    }
    if (Number.isFinite(RESTART_MAX_ATTEMPTS) && RESTART_MAX_ATTEMPTS >= 0 &&
        restartAttempts >= RESTART_MAX_ATTEMPTS) {
        languageToolStatus = 'crashed';
        console.error(`[LanguageTool] Restart limit reached (${RESTART_MAX_ATTEMPTS}). Not restarting.`);
        return;
    }

    restartAttempts += 1;
    const delay = Math.min(RESTART_MAX_DELAY_MS, RESTART_BASE_DELAY_MS * Math.pow(2, restartAttempts - 1));
    console.warn(`[LanguageTool] Scheduling restart in ${delay}ms. Reason: ${reason}`);
    clearRestartTimer();
    restartTimer = setTimeout(() => {
        restartTimer = null;
        startLanguageTool();
    }, delay);
}

/**
 * Get list of supported languages by checking org/languagetool/rules directory
 */
function getSupportedLanguages() {
    const languages = [];
    if (fs.existsSync(GRAMMAR_XML_BASE_PATH)) {
        const entries = fs.readdirSync(GRAMMAR_XML_BASE_PATH);
        for (const entry of entries) {
            const entryPath = path.join(GRAMMAR_XML_BASE_PATH, entry);
            if (fs.statSync(entryPath).isDirectory()) {
                languages.push(entry);
            }
        }
    }
    return languages.sort();
}

/**
 * Validate that a language is supported
 */
function isLanguageSupported(lang) {
    const langPath = path.join(GRAMMAR_XML_BASE_PATH, lang);
    return fs.existsSync(langPath) && fs.statSync(langPath).isDirectory();
}

// fetchAllRulesFromBackend removed — PwnDoc now pushes rules to this service

/**
 * Get the grammar.xml file path for a language
 */
function getGrammarXmlPath(lang) {
    return path.join(GRAMMAR_XML_BASE_PATH, lang, 'grammar.xml');
}

/**
 * Get the backup grammar.xml file path for a language
 */
function getGrammarXmlBackupPath(lang) {
    return path.join(GRAMMAR_XML_BASE_PATH, lang, 'grammar.xml.backup');
}

/**
 * Create backup of original grammar.xml if it doesn't exist
 */
function ensureGrammarXmlBackup(lang) {
    const grammarXmlPath = getGrammarXmlPath(lang);
    const backupPath = getGrammarXmlBackupPath(lang);

    if (!fs.existsSync(grammarXmlPath)) {
        throw new Error(`grammar.xml not found for language ${lang}`);
    }

    // Create backup if it doesn't exist
    if (!fs.existsSync(backupPath)) {
        const content = fs.readFileSync(grammarXmlPath, 'utf8');
        fs.writeFileSync(backupPath, content, 'utf8');
    }
}

/**
 * Extract DOCTYPE section (everything before <rules> tag)
 * Returns { doctype: string, xmlContent: string }
 * The DOCTYPE section includes XML declaration, stylesheet, and DOCTYPE declaration
 */
function extractDoctype(content) {
    // Find the opening <rules> tag (may have attributes like lang="fr" xsi:noNamespaceSchemaLocation=...)
    // Match <rules followed by optional whitespace and attributes, then >
    const rulesTagMatch = content.match(/<rules(?:\s+[^>]*)?>/);

    if (!rulesTagMatch) {
        // No <rules> tag found, return everything as content
        return {
            doctype: '',
            xmlContent: content
        };
    }

    const rulesIndex = rulesTagMatch.index;
    return {
        doctype: content.substring(0, rulesIndex).trim(),
        xmlContent: content.substring(rulesIndex)
    };
}

/**
 * Ensure grammar.xml includes all custom rules directly in a category at the end
 * Accepts rules as parameter (from backend) and uses string manipulation to preserve entity references
 * Always starts from the original backup to ensure clean state
 */
async function ensureGrammarXmlIncludesCustomRules(lang, rules = []) {
    const grammarXmlPath = getGrammarXmlPath(lang);
    const backupPath = getGrammarXmlBackupPath(lang);

    // Ensure backup exists (creates it or throws if grammar.xml is missing)
    ensureGrammarXmlBackup(lang);

    // Restore from backup to ensure clean state
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    fs.writeFileSync(grammarXmlPath, backupContent, 'utf8');

    // Now work with the restored content
    const content = backupContent;

    // Extract DOCTYPE section (everything before <rules> tag)
    const { doctype, xmlContent } = extractDoctype(content);

    // Find and remove existing Custom Rules category using string manipulation
    // This preserves entity references and all other content
    let modifiedContent = xmlContent;

    // Pattern to match the Custom Rules category (multiline, with any content inside)
    // Matches: <category id="CUSTOM_RULES" ...>...</category> or <category name="Custom Rules" ...>...</category>
    const customCategoryPattern = /<category\s+[^>]*(?:id\s*=\s*["']CUSTOM_RULES["']|name\s*=\s*["']Custom\s+Rules["'])[^>]*>[\s\S]*?<\/category>/i;
    const customCategoryMatch = modifiedContent.match(customCategoryPattern);

    if (customCategoryMatch) {
        // Remove the existing Custom Rules category
        modifiedContent = modifiedContent.replace(customCategoryPattern, '');
    }

    // Process rules passed as parameter
    let customRulesXml = '';

    try {
        // Sort rules by name
        const sortedRules = [...rules].sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        for (const rule of sortedRules) {
            const ruleXml = rule.xml.trim();

            // Extract rule elements from the XML
            // Handle both <rules><rule>...</rule></rules> and standalone <rule>
            let ruleContent = '';
            if (ruleXml.includes('<rules')) {
                // Extract content between <rules> and </rules>, then get all <rule> elements
                const rulesMatch = ruleXml.match(/<rules[^>]*>([\s\S]*?)<\/rules>/i);
                if (rulesMatch) {
                    const rulesContent = rulesMatch[1];
                    // Extract all <rule>...</rule> elements
                    const ruleMatches = rulesContent.match(/<rule[\s\S]*?<\/rule>/gi);
                    if (ruleMatches) {
                        ruleContent = ruleMatches.join('\n');
                    }
                }
            } else if (ruleXml.includes('<rule')) {
                // Standalone <rule> element
                const ruleMatch = ruleXml.match(/<rule[\s\S]*?<\/rule>/i);
                if (ruleMatch) {
                    ruleContent = ruleMatch[0];
                }
            }

            if (ruleContent) {
                customRulesXml += ruleContent + '\n';
            }
        }
    } catch (err) {
        console.error(`Error processing rules for language ${lang}:`, err);
    }

    // Add Custom Rules category at the end if there are any rules
    if (customRulesXml.trim()) {
        // Find the closing </rules> tag
        const closingRulesIndex = modifiedContent.lastIndexOf('</rules>');
        if (closingRulesIndex === -1) {
            throw new Error('Invalid grammar.xml structure: no closing </rules> tag found');
        }

        // Build the new category XML with ID
        const newCategoryXml = `  <category id="CUSTOM_RULES" name="Custom Rules" type="style">
${customRulesXml.trim().split('\n').map(line => '    ' + line).join('\n')}
  </category>`;

        // Insert the category before </rules>
        modifiedContent = modifiedContent.substring(0, closingRulesIndex) +
                         newCategoryXml + '\n' +
                         modifiedContent.substring(closingRulesIndex);
    }

    // Reconstruct the full XML: DOCTYPE + modified content
    let finalXml = '';

    if (doctype) {
        finalXml += doctype + '\n';
    }

    finalXml += modifiedContent;

    // Write back
    fs.writeFileSync(grammarXmlPath, finalXml, 'utf8');
}

/**
 * Start LanguageTool Java process
 * Returns the spawned process and its PID
 */
function startLanguageTool() {
    if (languageToolProcess || languageToolPid) {
        return { process: languageToolProcess, pid: languageToolPid };
    }
    // Build Java arguments
    const Xms = process.env.LT_JAVA_XMS || process.env.Java_Xms || '256m';
    const Xmx = process.env.LT_JAVA_XMX || process.env.Java_Xmx || '512m';

    const prioArgs = [
        `-Xms${Xms}`,
        `-Xmx${Xmx}`
    ];

    if (fs.existsSync('/LanguageTool/logback.xml')) {
        prioArgs.push('-Dlogback.configurationFile=/LanguageTool/logback.xml');
    }

    const ltArgs = [
        '-cp', '/LanguageTool/languagetool-server.jar',
        'org.languagetool.server.HTTPServer',
        '--port', '8010',
        '--public',
        '--config', '/LanguageTool/server.properties',
        '--allow-origin', '*'
    ];

    // Spawn the Java process in its own process group so we can kill the whole
    // group (Java + fasttext children) at once and avoid zombie fasttext processes
    const javaProcess = spawn('java', [...prioArgs, ...ltArgs], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true
    });
    javaProcess.ref(); // keep the event loop alive while Java is running

    let handledProcessStop = false;
    const handleProcessStop = (reason, crashedQuickly) => {
        if (handledProcessStop) {
            return;
        }

        handledProcessStop = true;
        clearStabilityTimer();
        languageToolProcess = null;
        languageToolPid = null;
        lastExitReason = reason;
        lastStartTime = null;

        if (intentionalStop) {
            return;
        }

        languageToolStatus = 'crashed';
        if (crashedQuickly) {
            rapidCrashCount += 1;
            if (rapidCrashCount >= RAPID_CRASH_THRESHOLD) {
                enterCrashLoop(reason);
                return;
            }
        } else {
            rapidCrashCount = 0;
        }

        scheduleRestart(reason);
    };

    // Store process reference and PID
    languageToolProcess = javaProcess;
    languageToolPid = javaProcess.pid;
    lastStartTime = Date.now();
    lastExitReason = null;
    languageToolStatus = 'starting';
    clearStabilityTimer();
    stabilityTimer = setTimeout(() => markLanguageToolStable(javaProcess.pid), RAPID_CRASH_WINDOW_MS);

    // Forward only errors/warnings from the Java process (skip verbose INFO lines)
    const logJavaLine = (line) => {
        if (!line) return;
        if (/ (ERROR|WARN) /.test(line) || line.includes('Exception') || line.includes('OutOfMemory')) {
            console.error(`[LanguageTool] ${line}`);
        }
    };

    javaProcess.stdout.on('data', (data) => {
        data.toString().split('\n').forEach(line => logJavaLine(line.trim()));
    });

    javaProcess.stderr.on('data', (data) => {
        data.toString().split('\n').forEach(line => logJavaLine(line.trim()));
    });

    javaProcess.on('exit', (code, signal) => {
        const reason = `exit code ${code} signal ${signal}`;
        const crashedQuickly = lastStartTime !== null && (Date.now() - lastStartTime) < RAPID_CRASH_WINDOW_MS;
        console.log(`[LanguageTool] Process exited with ${reason}`);
        handleProcessStop(reason, crashedQuickly);
    });

    javaProcess.on('error', (err) => {
        const reason = `spawn error: ${err.message}`;
        console.error(`[LanguageTool] Failed to start process: ${err.message}`);
        handleProcessStop(reason, true);
    });

    console.log(`[LanguageTool] Started with PID: ${languageToolPid}`);
    return { process: javaProcess, pid: languageToolPid };
}

/**
 * Stop LanguageTool Java process
 */
async function stopLanguageTool() {
    clearRestartTimer();
    clearStabilityTimer();
    intentionalStop = true;
    languageToolStatus = 'crashed';

    if (languageToolProcess && languageToolPid) {
        // Save references locally — the exit handler nulls the globals mid-loop
        const pid = languageToolPid;
        const proc = languageToolProcess;

        try {
            // Check if process is still alive
            try {
                process.kill(pid, 0);
            } catch (err) {
                languageToolProcess = null;
                languageToolPid = null;
                lastStartTime = null;
                clearRestartTimer();
                clearStabilityTimer();
                return { success: true, message: 'LanguageTool process was already stopped' };
            }

            // Send SIGTERM to the entire process group (kills Java + fasttext children)
            try {
                process.kill(-pid, 'SIGTERM');
            } catch (err) {
                proc.kill('SIGTERM'); // fallback if not a group leader
            }

            // Wait for graceful shutdown (max 5 seconds)
            let waited = 0;
            while (waited < 5000) {
                try {
                    process.kill(pid, 0);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    waited += 100;
                } catch (err) {
                    // Process has exited
                    break;
                }
            }

            // If still running, force kill the entire group
            try {
                process.kill(pid, 0);
                try {
                    process.kill(-pid, 'SIGKILL');
                } catch (err) {
                    proc.kill('SIGKILL');
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                // Process already dead, ignore
            }

            languageToolProcess = null;
            languageToolPid = null;
            lastStartTime = null;
            // Clear again in case the exit handler set a new timer during the race
            clearRestartTimer();
            clearStabilityTimer();
            return { success: true, message: 'LanguageTool process stopped' };
        } catch (err) {
            console.error(`Error stopping LanguageTool: ${err.message}`);
            languageToolProcess = null;
            languageToolPid = null;
            lastStartTime = null;
            clearRestartTimer();
            clearStabilityTimer();
            return { success: false, message: err.toString() };
        }
    }
    return { success: true, message: 'LanguageTool process was not running' };
}

/**
 * Restart LanguageTool Java process
 */
async function restartLanguageTool() {
    if (isRestarting) {
        return { success: false, message: 'Restart already in progress' };
    }
    isRestarting = true;

    try {
        // Stop existing process (sets intentionalStop = true internally)
        await stopLanguageTool();

        crashLoopDetected = false;
        restartAttempts = 0;
        rapidCrashCount = 0;
        lastStartTime = null;
        lastExitReason = null;

        // Reset so the new process's exit handler can auto-restart on crashes
        intentionalStop = false;

        // Wait a bit before starting new process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Start new process
        startLanguageTool();

        // Wait a bit for the process to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify the process is still running
        if (!languageToolProcess || !languageToolPid) {
            return { success: false, message: 'LanguageTool process failed to start' };
        }

        // Check if process is still alive
        try {
            process.kill(languageToolPid, 0);
        } catch (err) {
            return { success: false, message: 'LanguageTool process died immediately after start' };
        }

        return { success: true, message: 'LanguageTool process restarted successfully', pid: languageToolPid };
    } catch (err) {
        return { success: false, message: err.toString() };
    } finally {
        isRestarting = false;
    }
}

// ==================== API ROUTES ====================

// Health check (no auth required)
app.get('/health', (req, res) => {
    const isHealthy = languageToolStatus === 'ok' || languageToolStatus === 'starting';
    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'error',
        type: 'pwndoc-languagetools',
        version: VERSION
    });
});

// Proxy /v2/check to Java LanguageTool (auth via apiKey form param)
app.post('/v2/check', validateApiKey, (req, res) => {
    // Build params, stripping apiKey before forwarding to Java LT
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.body)) {
        if (key !== 'apiKey') params.append(key, value);
    }

    const postData = params.toString();
    const options = {
        hostname: 'localhost',
        port: LT_JAVA_PORT,
        path: '/v2/check',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.status(proxyRes.statusCode);
        for (const [key, value] of Object.entries(proxyRes.headers)) {
            res.setHeader(key, value);
        }
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        res.status(502).json({ error: `LanguageTool Java process unreachable: ${err.message}` });
    });

    proxyReq.write(postData);
    proxyReq.end();
});

// Get supported languages
app.get('/api/languages', validateApiKey, (req, res) => {
    const languages = getSupportedLanguages();
    res.json({ languages });
});

// Update grammar.xml for a language (called by backend)
// Body: { language: string, rules: array of rule objects with xml property }
app.post('/api/rules/update-grammar', validateApiKey, async (req, res) => {
    try {
        const { language, rules = [] } = req.body;

        if (!language) {
            return res.status(400).json({ error: 'Language is required' });
        }

        // Validate language
        if (!isLanguageSupported(language)) {
            return res.status(400).json({
                error: `Language '${language}' is not supported. Supported languages: ${getSupportedLanguages().join(', ')}`
            });
        }

        // Update grammar.xml with the provided rules
        await ensureGrammarXmlIncludesCustomRules(language, rules);

        res.json({
            success: true,
            message: `Grammar.xml updated for language ${language}`,
            ruleCount: rules.length
        });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// Restart LanguageTool process
app.post('/api/rules/restart', validateApiKey, async (req, res) => {
    try {
        const restartResult = await restartLanguageTool();

        if (!restartResult.success) {
            return res.status(500).json({ error: restartResult.message });
        }

        res.json({
            success: true,
            message: restartResult.message,
            pid: restartResult.pid
        });
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// Export app for testing
if (require.main === module) {
    // Start server only if run directly (not in tests)
    (async () => {
        try {
            // Initialize API key
            loadOrGenerateApiKey();

            // Create backups for all languages before starting LanguageTool
            const languages = getSupportedLanguages();
            for (const lang of languages) {
                try {
                    ensureGrammarXmlBackup(lang);
                } catch (err) {
                    console.error(`Error creating backup for language ${lang}:`, err);
                }
            }

            // Start LanguageTool when API starts
            // Rules will be pushed by PwnDoc backend after its startup
            console.log('Starting LanguageTool Java process...');
            startLanguageTool();

            // Handle graceful shutdown
            process.on('SIGTERM', async () => {
                console.log('Received SIGTERM, shutting down gracefully...');
                isShuttingDown = true;
                await stopLanguageTool();
                process.exit(0);
            });

            process.on('SIGINT', async () => {
                console.log('Received SIGINT, shutting down gracefully...');
                isShuttingDown = true;
                await stopLanguageTool();
                process.exit(0);
            });

            app.listen(API_PORT, '0.0.0.0', () => {
                console.log(`LanguageTool API listening on port ${API_PORT}, Java PID: ${languageToolPid || 'starting...'}`);
            });
        } catch (err) {
            console.error('Failed to start API:', err);
            process.exit(1);
        }
    })();
}

module.exports = app;
module.exports.__test = {
    startLanguageTool,
    stopLanguageTool,
    restartLanguageTool,
    scheduleRestart,
    getState: () => ({
        languageToolStatus,
        restartAttempts,
        rapidCrashCount,
        crashLoopDetected,
        languageToolPid,
        hasRestartTimer: Boolean(restartTimer),
        hasStabilityTimer: Boolean(stabilityTimer),
        lastExitReason
    }),
    resetState: () => {
        clearRestartTimer();
        clearStabilityTimer();
        languageToolProcess = null;
        languageToolPid = null;
        isShuttingDown = false;
        intentionalStop = false;
        isRestarting = false;
        restartAttempts = 0;
        rapidCrashCount = 0;
        lastStartTime = null;
        languageToolStatus = 'crashed';
        crashLoopDetected = false;
        lastExitReason = null;
    },
    constants: {
        RESTART_BASE_DELAY_MS,
        RESTART_MAX_DELAY_MS,
        RESTART_MAX_ATTEMPTS,
        RAPID_CRASH_WINDOW_MS,
        RAPID_CRASH_THRESHOLD
    }
};
