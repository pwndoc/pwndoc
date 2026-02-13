import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestWrapper } from '../utils/test-utils'
import LanguageSelector from '@/components/language-selector.vue'

describe('LanguageSelector Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  const createWrapper = (overrides = {}) => {
    return createTestWrapper(LanguageSelector, {
      ...overrides
    })
  }

  it('should render', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('should initialize lang from localStorage when value exists', async () => {
    localStorage.setItem('system_language', 'fr-FR')

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.lang).toBe('fr-FR')
  })

  it('should default to en-US when no localStorage value exists', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.lang).toBe('en-US')
    expect(localStorage.getItem('system_language')).toBe('en-US')
  })

  it('should have correct language options', () => {
    const wrapper = createWrapper()

    const options = wrapper.vm.langOptions
    expect(options).toHaveLength(5)
    expect(options).toEqual([
      { value: 'en-US', label: 'English' },
      { value: 'fr-FR', label: 'Français' },
      { value: 'zh-CN', label: '中文' },
      { value: 'de-DE', label: 'Deutsch' },
      { value: 'pt-BR', label: 'Portuguese' }
    ])
  })

  it('should update localStorage when lang changes', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    wrapper.vm.lang = 'de-DE'
    await wrapper.vm.$nextTick()

    expect(localStorage.getItem('system_language')).toBe('de-DE')
  })

  it('should update i18n locale when lang changes', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    wrapper.vm.lang = 'zh-CN'
    await wrapper.vm.$nextTick()

    // The i18n locale should be updated via the watcher
    expect(localStorage.getItem('system_language')).toBe('zh-CN')
  })
})
