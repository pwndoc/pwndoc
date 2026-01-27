#!/usr/bin/env node
/**
 * LanguageTool Rule Management API
 * Handles grammar.xml updates and LanguageTool process management
 * All database operations are handled by the backend
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// HTTPS agent that ignores certificate errors (for self-signed/expired certs)
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

// Configuration
const GRAMMAR_XML_BASE = '/LanguageTool';
const GRAMMAR_XML_BASE_PATH = path.join(GRAMMAR_XML_BASE, 'org', 'languagetool', 'rules');
const API_PORT = parseInt(process.env.LT_API_PORT || '8020', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://pwndoc-backend:4242';

// LanguageTool process tracking
let languageToolProcess = null;
let languageToolPid = null;
let isShuttingDown = false;
let restartTimer = null;
let restartAttempts = 0;

const RESTART_BASE_DELAY_MS = parseInt(process.env.LT_RESTART_BASE_DELAY_MS || '1000', 10);
const RESTART_MAX_DELAY_MS = parseInt(process.env.LT_RESTART_MAX_DELAY_MS || '30000', 10);
const RESTART_MAX_ATTEMPTS = parseInt(process.env.LT_RESTART_MAX_ATTEMPTS || '10', 10);

function clearRestartTimer() {
    if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
    }
}

function scheduleRestart(reason) {
    if (isShuttingDown) {
        return;
    }
    if (Number.isFinite(RESTART_MAX_ATTEMPTS) && RESTART_MAX_ATTEMPTS >= 0 &&
        restartAttempts >= RESTART_MAX_ATTEMPTS) {
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
    if (fs.existsSync(GRAMMAR_XML_BASE)) {
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

/**
 * Fetch all rules from the backend API (internal endpoint, no auth required)
 */
async function fetchAllRulesFromBackend() {
    try {
        const url = new URL(`${BACKEND_URL}/api/internal/languagetool-rules`);
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                agent: httpsAgent
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        // Backend returns { status: "success", datas: [...] }
                        const rules = jsonData.datas || [];
                        
                        // Group rules by language
                        const rulesByLanguage = {};
                        for (const rule of rules) {
                            if (!rulesByLanguage[rule.language]) {
                                rulesByLanguage[rule.language] = [];
                            }
                            // Convert rule format to match what ensureGrammarXmlIncludesCustomRules expects
                            rulesByLanguage[rule.language].push({
                                name: rule.name,
                                xml: rule.ruleXml || rule.xml
                            });
                        }
                        
                        resolve(rulesByLanguage);
                    } catch (err) {
                        reject(new Error(`Failed to parse response: ${err.message}`));
                    }
                });
            });
            
            req.on('error', (err) => {
                reject(err);
            });
            
            req.end();
        });
    } catch (err) {
        console.error('Error fetching rules from backend:', err);
        // Return empty object if backend is not available (might be starting up)
        return {};
    }
}

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
        console.log(`Created backup of grammar.xml for language ${lang}`);
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
    
    // Ensure backup exists
    ensureGrammarXmlBackup(lang);
    
    // Always restore from backup first to ensure clean state
    if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup grammar.xml not found for language ${lang}`);
    }
    
    // Restore from backup
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
    const Xms = process.env.Java_Xms || '256m';
    const Xmx = process.env.Java_Xmx || '512m';
    
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
    
    // Spawn the Java process
    const javaProcess = spawn('java', [...prioArgs, ...ltArgs], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
    });
    
    // Store process reference and PID
    languageToolProcess = javaProcess;
    languageToolPid = javaProcess.pid;
    
    // Handle process events
    javaProcess.stdout.on('data', (data) => {
        console.log(`[LanguageTool] ${data.toString().trim()}`);
    });
    
    javaProcess.stderr.on('data', (data) => {
        console.error(`[LanguageTool] ${data.toString().trim()}`);
    });
    
    javaProcess.on('exit', (code, signal) => {
        const reason = `exit code ${code} signal ${signal}`;
        console.log(`[LanguageTool] Process exited with ${reason}`);
        languageToolProcess = null;
        languageToolPid = null;
        scheduleRestart(reason);
    });
    
    javaProcess.on('error', (err) => {
        const reason = `spawn error: ${err.message}`;
        console.error(`[LanguageTool] Failed to start process: ${err.message}`);
        languageToolProcess = null;
        languageToolPid = null;
        scheduleRestart(reason);
    });
    
    console.log(`[LanguageTool] Started with PID: ${languageToolPid}`);
    restartAttempts = 0;
    return { process: javaProcess, pid: languageToolPid };
}

/**
 * Stop LanguageTool Java process
 */
async function stopLanguageTool() {
    clearRestartTimer();
    if (languageToolProcess && languageToolPid) {
        try {
            // Check if process is still alive
            try {
                process.kill(languageToolPid, 0); // Signal 0 just checks if process exists
            } catch (err) {
                // Process already dead
                languageToolProcess = null;
                languageToolPid = null;
                return { success: true, message: 'LanguageTool process was already stopped' };
            }
            
            // Send SIGTERM for graceful shutdown
            languageToolProcess.kill('SIGTERM');
            
            // Wait for graceful shutdown (max 5 seconds)
            let waited = 0;
            while (waited < 5000) {
                try {
                    process.kill(languageToolPid, 0); // Check if still alive
                    await new Promise(resolve => setTimeout(resolve, 100));
                    waited += 100;
                } catch (err) {
                    // Process has exited
                    break;
                }
            }
            
            // If still running, force kill
            try {
                process.kill(languageToolPid, 0);
                languageToolProcess.kill('SIGKILL');
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                // Process already dead, ignore
            }
            
            languageToolProcess = null;
            languageToolPid = null;
            return { success: true, message: 'LanguageTool process stopped' };
        } catch (err) {
            console.error(`Error stopping LanguageTool: ${err.message}`);
            languageToolProcess = null;
            languageToolPid = null;
            return { success: false, message: err.toString() };
        }
    }
    return { success: true, message: 'LanguageTool process was not running' };
}

/**
 * Restart LanguageTool Java process
 */
async function restartLanguageTool() {
    try {
        // Stop existing process
        await stopLanguageTool();
        
        // Wait a bit before starting new process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Start new process
        const result = startLanguageTool();
        
        // Wait a bit for the process to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the process is still running
        if (!languageToolProcess || !languageToolPid) {
            return { success: false, message: 'LanguageTool process failed to start' };
        }
        
        // Check if process is still alive
        try {
            process.kill(languageToolPid, 0); // Signal 0 just checks if process exists
        } catch (err) {
            return { success: false, message: 'LanguageTool process died immediately after start' };
        }
        
        return { success: true, message: 'LanguageTool process restarted successfully', pid: languageToolPid };
    } catch (err) {
        return { success: false, message: err.toString() };
    }
}

// ==================== API ROUTES ====================

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'languagetool-rule-api' });
});

// Get supported languages
app.get('/api/languages', (req, res) => {
    const languages = getSupportedLanguages();
    res.json({ languages });
});

// Update grammar.xml for a language (called by backend)
// Body: { language: string, rules: array of rule objects with xml property }
app.post('/api/rules/update-grammar', async (req, res) => {
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
app.post('/api/rules/restart', async (req, res) => {
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
            // Create backups for all languages before starting LanguageTool
            console.log('Creating backups of grammar.xml files...');
            const languages = getSupportedLanguages();
            for (const lang of languages) {
                try {
                    // Always create backup first (if it doesn't exist)
                    ensureGrammarXmlBackup(lang);
                    console.log(`Backup created/verified for language: ${lang}`);
                } catch (err) {
                    console.error(`Error creating backup for language ${lang}:`, err);
                }
            }
            
            // Fetch all rules from backend and update grammar.xml files
            console.log('Fetching rules from backend and updating grammar.xml files...');
            try {
                // Wait a bit for backend to be ready (if it's starting up)
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const rulesByLanguage = await fetchAllRulesFromBackend();
                
                if (Object.keys(rulesByLanguage).length === 0) {
                    console.log('No rules found in backend (backend may still be starting up)');
                } else {
                    // Update grammar.xml for each language that has rules
                    for (const [lang, rules] of Object.entries(rulesByLanguage)) {
                        try {
                            if (isLanguageSupported(lang)) {
                                await ensureGrammarXmlIncludesCustomRules(lang, rules);
                                console.log(`Updated grammar.xml for language: ${lang} (${rules.length} rules)`);
                            } else {
                                console.warn(`Language ${lang} is not supported, skipping`);
                            }
                        } catch (err) {
                            console.error(`Error updating grammar.xml for language ${lang}:`, err);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching/updating rules from backend:', err);
                console.log('Continuing startup without rules (backend may not be ready yet)');
            }
            
            // Start LanguageTool when API starts
            console.log('Starting LanguageTool Java process...');
            startLanguageTool();
            
            // Handle graceful shutdown
            process.on('SIGTERM', async () => {
                console.log('Received SIGTERM, shutting down gracefully...');
                await stopLanguageTool();
                process.exit(0);
            });
            
            process.on('SIGINT', async () => {
                console.log('Received SIGINT, shutting down gracefully...');
                await stopLanguageTool();
                process.exit(0);
            });

            app.listen(API_PORT, '0.0.0.0', () => {
                console.log(`LanguageTool Rule Management API listening on port ${API_PORT}`);
                console.log(`LanguageTool Java process PID: ${languageToolPid || 'starting...'}`);
                console.log(`Supported languages: ${getSupportedLanguages().join(', ')}`);
            });
        } catch (err) {
            console.error('Failed to start API:', err);
            process.exit(1);
        }
    })();
}

module.exports = app;
