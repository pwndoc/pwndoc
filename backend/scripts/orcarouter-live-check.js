#!/usr/bin/env node
// Internal connectivity check for the OrcaRouter Cyber Inference provider.
//
// It exercises the *implemented* provider path (ai-client -> @node-llm/core OpenAI
// transport -> https://api.orcarouter.ai/v1), not a standalone curl, and it fetches the
// live /v1/models catalog and applies the same chat filter the UI uses.
//
// The API key is read from ORCAROUTER_API_KEY and never printed. The provider's
// user-facing default model is orcarouter/auto (see ai-prompts.js). This probe uses
// whatever the supplied key can actually call so it can verify the wiring with both
// cyber-tier and public-tier credentials.
//
// Usage: ORCAROUTER_API_KEY=sk-orca-... node backend/scripts/orcarouter-live-check.js

const path = require('path');

const { generateWithProvider } = require(path.join(__dirname, '..', 'src', 'lib', 'ai-client'));
const { fetchOrcaModels } = require(path.join(__dirname, '..', 'src', 'lib', 'ai-orcarouter'));

const API_KEY = String(process.env.ORCAROUTER_API_KEY || '').trim();
const BASE_URL = String(process.env.ORCA_API_BASE_URL || 'https://api.orcarouter.ai/v1').replace(/\/+$/, '');

// Ordered probe list. Cyber models first (the tier this provider targets); the public
// model is the fallback for keys that are not cyber-verified.
const CANDIDATE_MODELS = [
    process.env.ORCAROUTER_LIVE_MODEL,
    'orcacyber-ultra-1.0',
    'orcacyber-zero-1.5',
    'deepseek/deepseek-v4.1-flash'
].map((value) => String(value || '').trim()).filter(Boolean);

const mask = (value) => String(value || '').replace(/sk-orca-[A-Za-z0-9_-]+/g, 'sk-orca-[redacted]');

const main = async () => {
    if (!API_KEY) {
        console.error('ORCAROUTER_API_KEY is not set');
        process.exit(1);
    }

    const catalog = await fetchOrcaModels({ apiKey: API_KEY, baseUrl: BASE_URL, capability: 'chat' });
    console.log(`catalog: source=${catalog.source} chat_models=${catalog.models.length}`);
    if (process.argv.includes('--list-models')) {
        if (process.argv.includes('--json'))
            console.log(JSON.stringify(catalog.models, null, 2));
        else
            catalog.models.forEach((model) => console.log(model.id));
        process.exit(0);
    }

    const candidates = [...new Set(CANDIDATE_MODELS)];

    const settings = {
        ai: {
            private: {
                orcarouterApiKey: API_KEY,
                orcarouterBaseUrl: BASE_URL
            }
        }
    };

    let lastError = null;
    for (const model of candidates) {
        try {
            const result = await generateWithProvider({
                provider: 'orcarouter',
                settings: {
                    ...settings,
                    ai: { private: { ...settings.ai.private, orcarouterModel: model } }
                },
                outputType: 'text',
                context: {},
                promptInstruction: 'Return ONLY the JSON object {"draft":"orcarouter-ok"}.'
            });
            console.log(`inference: ok model=${result.model} draft_length=${String(result.draft).length}`);
            process.exit(0);
        } catch (err) {
            lastError = err;
            console.log(`inference: model=${model} failed: ${mask(err?.message || err)}`);
        }
    }

    console.error(`live inference failed for every candidate: ${mask(lastError?.message || lastError)}`);
    process.exit(1);
};

main().catch((err) => {
    console.error(`live check failed: ${mask(err?.message || err)}`);
    process.exit(1);
});
