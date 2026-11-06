import { describe, expect, it } from 'vitest'
import { allowedProviderOptions, providerLabel, providerLogo, AI_PROVIDERS } from '@/services/ai-providers'

describe('ai-providers allowedProviderOptions', () => {
  it('always includes the default provider even with an empty allow-list', () => {
    const options = allowedProviderOptions({ defaultProvider: 'openai', allowedProviders: [] })
    expect(options.map((o) => o.value)).toEqual(['openai'])
  })

  it('includes the default provider plus every allowed provider, in canonical order', () => {
    const options = allowedProviderOptions({
      defaultProvider: 'anthropic',
      allowedProviders: ['openai', 'deepseek']
    })
    // Canonical order from AI_PROVIDER_OPTIONS: openai, anthropic, deepseek, ...
    expect(options.map((o) => o.value)).toEqual(['openai', 'anthropic', 'deepseek'])
  })

  it('ignores unknown provider ids in the allow-list', () => {
    const options = allowedProviderOptions({
      defaultProvider: 'openai',
      allowedProviders: ['not-a-provider', 'ollama']
    })
    expect(options.map((o) => o.value)).toEqual(['openai', 'ollama'])
  })

  it('tolerates missing settings', () => {
    expect(allowedProviderOptions(undefined)).toEqual([])
    expect(allowedProviderOptions({})).toEqual([])
  })
})

describe('ai-providers metadata', () => {
  it('exposes the six backend provider ids', () => {
    expect(AI_PROVIDERS).toEqual(['openai', 'anthropic', 'deepseek', 'ollama', 'bedrock', 'orcarouter'])
  })

  it('maps ids to human labels and falls back to the id', () => {
    expect(providerLabel('bedrock')).toBe('AWS Bedrock')
    expect(providerLabel('unknown')).toBe('unknown')
  })

  it('provides a local logo asset for every provider and null for unknown ids', () => {
    AI_PROVIDERS.forEach((provider) => {
      expect(providerLogo(provider)).toBeTruthy()
    })
    expect(providerLogo('unknown')).toBeNull()
  })
})

describe('ai-providers OrcaRouter entry', () => {
  it('registers OrcaRouter Cyber Inference as a named provider with a bundled logo', () => {
    expect(providerLabel('orcarouter')).toBe('OrcaRouter Cyber Inference')
    expect(providerLogo('orcarouter')).toBeTruthy()
  })

  it('can be selected once the administrator allows it', () => {
    const options = allowedProviderOptions({
      defaultProvider: 'openai',
      allowedProviders: ['orcarouter']
    })
    expect(options.map((option) => option.value)).toEqual(['openai', 'orcarouter'])
  })
})
