// Local provider logos (bundled by Vite, no remote fetch). Imported as URLs for use as <img src>.
import openaiLogo from '@/assets/ai-providers/openai.svg'
import anthropicLogo from '@/assets/ai-providers/anthropic.svg'
import deepseekLogo from '@/assets/ai-providers/deepseek.svg'
import ollamaLogo from '@/assets/ai-providers/ollama.svg'
import bedrockLogo from '@/assets/ai-providers/bedrock.svg'
import orcarouterLogo from '@/assets/ai-providers/orcarouter.png'

// Single source of truth for AI provider metadata on the frontend. Mirrors AI_PROVIDERS in
// backend/src/lib/ai-prompts.js. Used by the settings component (provider tabs) and the
// provider selector (chat + QA). Values must match the backend provider ids exactly.
// `mono: true` marks a near-black single-color logo (no brand color of its own). Those get
// inverted to near-white in dark mode via a CSS filter, since an <img> src SVG can't inherit
// the theme text color. The brand-colored logos read fine on both themes and are left alone.
export const AI_PROVIDER_OPTIONS = [
  { label: 'OpenAI', value: 'openai', logo: openaiLogo, mono: true },
  { label: 'Anthropic', value: 'anthropic', logo: anthropicLogo },
  { label: 'DeepSeek', value: 'deepseek', logo: deepseekLogo },
  { label: 'Ollama', value: 'ollama', logo: ollamaLogo, mono: true },
  { label: 'AWS Bedrock', value: 'bedrock', logo: bedrockLogo },
  // Cyber positioning: authorized, scoped security reasoning for verified security teams.
  // https://www.orcarouter.ai/cyber
  { label: 'OrcaRouter Cyber Inference', value: 'orcarouter', logo: orcarouterLogo }
]

const PROVIDER_MONO_BY_VALUE = AI_PROVIDER_OPTIONS.reduce((map, option) => {
  map[option.value] = Boolean(option.mono)
  return map
}, {})

export function providerLogoIsMono(value) {
  return Boolean(PROVIDER_MONO_BY_VALUE[value])
}

const PROVIDER_LOGO_BY_VALUE = AI_PROVIDER_OPTIONS.reduce((map, option) => {
  map[option.value] = option.logo
  return map
}, {})

export function providerLogo(value) {
  return PROVIDER_LOGO_BY_VALUE[value] || null
}

export const AI_PROVIDERS = AI_PROVIDER_OPTIONS.map((option) => option.value)

const PROVIDER_LABEL_BY_VALUE = AI_PROVIDER_OPTIONS.reduce((map, option) => {
  map[option.value] = option.label
  return map
}, {})

export function providerLabel(value) {
  return PROVIDER_LABEL_BY_VALUE[value] || value
}

// The set of providers a user may pick at generation/QA time, derived from public settings.
// The default provider is always implicitly allowed; allowedProviders extends that set. An
// empty allowedProviders therefore restricts users to the default provider only. Mirrors
// getAllowedProviders in backend/src/routes/ai.js — keep the two in sync.
export function allowedProviderOptions(publicAiSettings) {
  const ai = publicAiSettings || {}
  const def = ai.defaultProvider
  const configured = Array.isArray(ai.allowedProviders) ? ai.allowedProviders : []
  const allowed = new Set([def, ...configured].filter((value) => AI_PROVIDERS.includes(value)))
  return AI_PROVIDER_OPTIONS.filter((option) => allowed.has(option.value))
}
