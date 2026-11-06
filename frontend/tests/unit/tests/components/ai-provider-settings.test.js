import { describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createTestWrapper } from '../../test-utils'
import AiProviderSettings from '@/components/ai-provider-settings.vue'

vi.mock('@/services/ai', () => ({
  default: {
    testProvider: vi.fn(),
    getOrcaModels: vi.fn()
  }
}))

import AiService from '@/services/ai'

function buildSettings() {
  return {
    ai: {
      public: {
        defaultProvider: 'openai',
        allowedProviders: []
      },
      private: {
        openaiApiKey: '',
        openaiApiKeyConfigured: false,
        openaiBaseUrl: 'https://api.openai.com/v1',
        openaiModel: 'gpt-5.4-mini',
        anthropicApiKey: '',
        anthropicApiKeyConfigured: false,
        anthropicBaseUrl: 'https://api.anthropic.com/v1',
        anthropicModel: 'claude-opus-4-8',
        anthropicVersion: '2023-06-01',
        deepseekApiKey: '',
        deepseekApiKeyConfigured: false,
        deepseekBaseUrl: 'https://api.deepseek.com/v1',
        deepseekModel: 'deepseek-v4-flash',
        ollamaApiKey: '',
        ollamaApiKeyConfigured: false,
        ollamaBaseUrl: 'http://localhost:11434/v1',
        ollamaModel: 'llama3.1',
        bedrockApiKey: '',
        bedrockApiKeyConfigured: false,
        bedrockAccessKeyId: '',
        bedrockAccessKeyIdConfigured: false,
        bedrockSecretAccessKey: '',
        bedrockSecretAccessKeyConfigured: false,
        bedrockSessionToken: '',
        bedrockSessionTokenConfigured: false,
        bedrockRegion: 'us-east-1',
        bedrockModel: 'global.anthropic.claude-opus-4-8',
        orcarouterApiKey: '',
        orcarouterApiKeyConfigured: false,
        orcarouterBaseUrl: 'https://api.orcarouter.ai/v1',
        orcarouterModel: 'orcarouter/auto'
      }
    }
  }
}

const messages = {
  'en-US': {
    aiIntegration: {
      provider: {
        defaultBadge: 'Default',
        setDefaultLabel: 'Set as default provider',
        setDefaultHint: 'Used when a request does not specify a provider.',
        configuredHint: 'This provider is configured',
        allowUsersLabel: 'Allow users to select this provider',
        allowUsersHint: 'When enabled, users can pick this provider.',
        openaiBaseUrl: 'OpenAI Base URL',
        openaiModel: 'OpenAI Model',
        openaiApiKey: 'OpenAI API Key',
        orcarouterBaseUrl: 'OrcaRouter Base URL',
        orcarouterModel: 'OrcaRouter Model',
        orcarouterApiKey: 'OrcaRouter API Key',
        orcarouterDescription: 'OrcaRouter Cyber Inference',
        orcarouterCatalogLink: 'Cyber model catalog',
        orcarouterKeyConsole: 'Manage OrcaRouter API keys',
        orcarouterRefresh: 'Refresh models',
        orcarouterCatalogLoading: 'Loading models from OrcaRouter…',
        orcarouterCatalogLoaded: 'Live catalog: {count} compatible chat models',
        orcarouterCatalogEmpty: 'No compatible chat models were returned by the catalog',
        orcarouterCatalogDegraded: 'Catalog unreachable — showing {count} verified fallback models',
        orcarouterCatalogAuth: 'OrcaRouter rejected the API key.',
        orcarouterCatalogError: 'Could not load the OrcaRouter model catalog',
        orcarouterModelCleared: 'The previously selected model is no longer offered.',
        orcarouterModelUnverified: 'The selected model is not in the verified fallback list.',
        testConnection: 'Test connection',
        testSuccess: 'Connection successful',
        testSuccessWithModel: 'Connection successful (model: {model})',
        testFailed: 'Connection failed'
      }
    }
  }
}

function createWrapper(settings = buildSettings()) {
  return createTestWrapper(AiProviderSettings, {
    messages,
    props: {
      settings,
      canEdit: true
    }
  })
}

describe('AiProviderSettings test connection', () => {
  it('sends the current form values (including an unsaved API key) to the test endpoint', async () => {
    AiService.testProvider.mockResolvedValue({ data: { datas: { ok: true, provider: 'openai', model: 'gpt-5.4-mini' } } })
    const wrapper = createWrapper()
    wrapper.vm.openaiApiKeyInput = 'sk-newly-typed-key'

    await wrapper.vm.testConnection('openai')

    expect(AiService.testProvider).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'openai',
      openaiApiKey: 'sk-newly-typed-key',
      openaiBaseUrl: 'https://api.openai.com/v1',
      openaiModel: 'gpt-5.4-mini'
    }))
    expect(wrapper.vm.testResults.openai.ok).toBe(true)
    expect(wrapper.vm.testResults.openai.message).toContain('gpt-5.4-mini')
  })

  it('shows a clear inline error when the test fails', async () => {
    AiService.testProvider.mockRejectedValue({
      response: { data: { datas: 'OpenAI provider is not configured. Set API key.' } }
    })
    const wrapper = createWrapper()

    await wrapper.vm.testConnection('openai')

    expect(wrapper.vm.testResults.openai.ok).toBe(false)
    expect(wrapper.vm.testResults.openai.message).toBe('OpenAI provider is not configured. Set API key.')
  })

  it('clears the loading state after the test completes', async () => {
    AiService.testProvider.mockResolvedValue({ data: { datas: { ok: true, model: 'gpt-5.4-mini' } } })
    const wrapper = createWrapper()

    const promise = wrapper.vm.testConnection('openai')
    expect(wrapper.vm.testingProvider).toBe('openai')
    await promise

    expect(wrapper.vm.testingProvider).toBeNull()
  })
})

describe('AiProviderSettings masked secret sentinel', () => {
  // Pinned to the literal value, not just re-derived, so a drift from the backend's
  // independent copy in settings-secrets.js is caught here (see the comment on
  // MASKED_SECRET in ai-provider-settings.vue).
  it('masks a configured secret with the sentinel the backend expects back on save', () => {
    const wrapper = createWrapper()

    expect(wrapper.vm.maskedValue(true)).toBe('••••••••••••••••')
    expect(wrapper.vm.maskedValue(false)).toBe('')
  })

  it('pre-fills each configured secret field with the masked sentinel on mount', () => {
    const settings = buildSettings()
    settings.ai.private.openaiApiKeyConfigured = true

    const wrapper = createWrapper(settings)

    expect(wrapper.vm.openaiApiKeyInput).toBe('••••••••••••••••')
  })
})

describe('AiProviderSettings configured badge', () => {
  it('reports a provider as configured once its API key is stored', () => {
    const settings = buildSettings()
    settings.ai.private.anthropicApiKeyConfigured = true
    const wrapper = createWrapper(settings)

    expect(wrapper.vm.isProviderConfigured('anthropic')).toBe(true)
    expect(wrapper.vm.isProviderConfigured('openai')).toBe(false)
  })

  it('reports bedrock configured via IAM credentials without an API key', () => {
    const settings = buildSettings()
    settings.ai.private.bedrockAccessKeyIdConfigured = true
    settings.ai.private.bedrockSecretAccessKeyConfigured = true
    const wrapper = createWrapper(settings)

    expect(wrapper.vm.isProviderConfigured('bedrock')).toBe(true)
  })
})

describe('AiProviderSettings default provider', () => {
  it('reports which provider is the current default', () => {
    const wrapper = createWrapper()

    expect(wrapper.vm.isDefaultProvider('openai')).toBe(true)
    expect(wrapper.vm.isDefaultProvider('anthropic')).toBe(false)
  })

  it('switches the default and drops the new default from allowedProviders', () => {
    const settings = buildSettings()
    settings.ai.public.allowedProviders = ['anthropic']
    const wrapper = createWrapper(settings)

    wrapper.vm.setDefaultProvider('anthropic')

    expect(settings.ai.public.defaultProvider).toBe('anthropic')
    // The new default is implicitly allowed, so it is removed from the explicit list.
    expect(settings.ai.public.allowedProviders).not.toContain('anthropic')
    // It is still reported as allowed (implicitly, as the default).
    expect(wrapper.vm.isProviderAllowed('anthropic')).toBe(true)
  })
})

describe('AiProviderSettings allow-list', () => {
  it('always reports the default provider as allowed and locks its toggle', () => {
    const wrapper = createWrapper()

    expect(wrapper.vm.isProviderAllowed('openai')).toBe(true)
    expect(wrapper.vm.allowToggleDisabled('openai')).toBe(true)
  })

  it('disables the allow toggle for a provider that is not configured', () => {
    const wrapper = createWrapper()

    expect(wrapper.vm.allowToggleDisabled('anthropic')).toBe(true)
  })

  it('adds and removes a configured provider from allowedProviders', () => {
    const settings = buildSettings()
    settings.ai.private.anthropicApiKeyConfigured = true
    const wrapper = createWrapper(settings)

    wrapper.vm.setProviderAllowed('anthropic', true)
    expect(settings.ai.public.allowedProviders).toContain('anthropic')
    expect(wrapper.vm.isProviderAllowed('anthropic')).toBe(true)

    wrapper.vm.setProviderAllowed('anthropic', false)
    expect(settings.ai.public.allowedProviders).not.toContain('anthropic')
    expect(wrapper.vm.isProviderAllowed('anthropic')).toBe(false)
  })
})

describe('AiProviderSettings OrcaRouter catalog', () => {
  const liveModels = [
    { id: 'orcarouter/auto', name: 'OrcaRouter Auto', contextLength: null, inputModalities: ['text'], supportedEndpointTypes: ['openai'] },
    { id: 'openai/gpt-5.5', name: 'GPT-5.5', contextLength: 400000, inputModalities: ['text', 'image'], supportedEndpointTypes: ['openai'] },
    { id: 'anthropic/claude-opus-4.8', name: 'Claude Opus 4.8', contextLength: 200000, inputModalities: ['text', 'image'], supportedEndpointTypes: ['anthropic'] }
  ]

  function orcaSettings() {
    const settings = buildSettings()
    settings.ai.public.defaultProvider = 'orcarouter'
    settings.ai.private.orcarouterApiKeyConfigured = true
    settings.ai.private.orcarouterApiKey = ''
    settings.ai.private.orcarouterModel = 'orcarouter/auto'
    return settings
  }

  it('loads the model options from the backend catalog, not a typed value', async () => {
    AiService.getOrcaModels.mockResolvedValue({
      data: { datas: { models: liveModels, source: 'live', degraded: false } }
    })
    const wrapper = createWrapper(orcaSettings())
    await flushPromises()

    expect(AiService.getOrcaModels).toHaveBeenCalledWith(expect.objectContaining({
      orcarouterBaseUrl: 'https://api.orcarouter.ai/v1'
    }))
    expect(wrapper.vm.orcaModelsState).toBe('live')
    expect(wrapper.vm.orcaModelOptions.map((option) => option.value))
      .toEqual(['orcarouter/auto', 'openai/gpt-5.5', 'anthropic/claude-opus-4.8'])
  })

  it('clears a stored model that the authoritative live catalog no longer offers', async () => {
    const settings = orcaSettings()
    settings.ai.private.orcarouterModel = 'orcarouter/legacy-removed'
    AiService.getOrcaModels.mockResolvedValue({
      data: { datas: { models: liveModels, source: 'live', degraded: false } }
    })
    const wrapper = createWrapper(settings)
    await flushPromises()

    expect(settings.ai.private.orcarouterModel).toBe('')
    expect(wrapper.vm.orcaModelCleared).toBe(true)
  })

  it('keeps the selection but flags it when only the verified fallback is available', async () => {
    const settings = orcaSettings()
    settings.ai.private.orcarouterModel = 'orca/orcacyber-ultra-1.0'
    AiService.getOrcaModels.mockResolvedValue({
      data: {
        datas: {
          models: [{ id: 'orcarouter/auto', name: 'OrcaRouter Auto', supportedEndpointTypes: ['openai'], inputModalities: ['text'] }],
          source: 'fallback',
          degraded: true,
          error: 'Could not reach the OrcaRouter model catalog'
        }
      }
    })
    const wrapper = createWrapper(settings)
    await flushPromises()

    expect(wrapper.vm.orcaModelsState).toBe('degraded')
    expect(settings.ai.private.orcarouterModel).toBe('orca/orcacyber-ultra-1.0')
    expect(wrapper.vm.orcaModelUnverified).toBe(true)
  })

  it('shows the auth error state instead of an unverified fallback after a 401', async () => {
    AiService.getOrcaModels.mockRejectedValue({
      response: { status: 401, data: { datas: 'OrcaRouter rejected the API key.' } }
    })
    const wrapper = createWrapper(orcaSettings())
    await flushPromises()

    expect(wrapper.vm.orcaModelsState).toBe('auth')
    expect(wrapper.vm.orcaModels).toEqual([])
  })

  it('reloads the catalog when the provider tab changes to OrcaRouter', async () => {
    AiService.getOrcaModels.mockClear()
    AiService.getOrcaModels.mockResolvedValue({
      data: { datas: { models: liveModels, source: 'live', degraded: false } }
    })
    const wrapper = createWrapper()
    expect(AiService.getOrcaModels).not.toHaveBeenCalled()

    wrapper.vm.activeTab = 'orcarouter'
    await flushPromises()

    expect(AiService.getOrcaModels).toHaveBeenCalledTimes(1)
  })

  it('does not fetch the catalog for read-only viewers', async () => {
    AiService.getOrcaModels.mockClear()
    const wrapper = createTestWrapper(AiProviderSettings, {
      messages,
      props: { settings: buildSettings(), canEdit: false }
    })

    wrapper.vm.activeTab = 'orcarouter'
    await flushPromises()

    expect(AiService.getOrcaModels).not.toHaveBeenCalled()
  })

  it('only forwards catalog ids: setOrcaModel never invents a free-text model', () => {
    const wrapper = createWrapper(orcaSettings())

    wrapper.vm.setOrcaModel('openai/gpt-5.5')
    expect(wrapper.vm.settings.ai.private.orcarouterModel).toBe('openai/gpt-5.5')
    expect(wrapper.vm.orcaModelOptions.every((option) => typeof option.value === 'string')).toBe(true)
  })
})
