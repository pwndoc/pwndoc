import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestWrapper } from '../../test-utils'
import Cvss4Calculator from '@/components/cvss4calculator.vue'

// Mock boot/i18n to avoid localStorage and i18n initialization issues
vi.mock('boot/i18n', () => ({
  $t: (key) => key
}))

// Mock ae-cvss-calculator
// Must use class/function (not arrow function) for vi.fn() used with `new`
vi.mock('ae-cvss-calculator', () => ({
  Cvss4P0: vi.fn().mockImplementation(function(vectorString) {
    this.createJsonSchema = vi.fn().mockReturnValue({
      baseScore: 9.3,
      baseSeverity: 'Critical'
    })
  })
}))

import { Cvss4P0 } from 'ae-cvss-calculator'

const FULL_VECTOR = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H'

describe('Cvss4Calculator Component', () => {
  beforeEach(() => {
    // Reset mock state between tests while preserving implementation
    Cvss4P0.mockClear()
    Cvss4P0.mockImplementation(function(vectorString) {
      this.createJsonSchema = vi.fn().mockReturnValue({
        baseScore: 9.3,
        baseSeverity: 'Critical'
      })
    })
  })

  const createWrapper = (overrides = {}) => {
    return createTestWrapper(Cvss4Calculator, {
      props: {
        modelValue: '',
        readonly: false,
        ...(overrides.props || {})
      },
      global: {
        stubs: {
          'q-card': { template: '<div class="q-card"><slot /></div>' },
          'q-card-section': { template: '<div class="q-card-section"><slot /></div>' },
          'q-separator': true,
          'q-space': true,
          'q-tooltip': true,
          'q-expansion-item': { template: '<div class="q-expansion-item"><slot /></div>' },
          'q-btn-toggle': { template: '<div class="q-btn-toggle"><slot /></div>' },
          ...(overrides.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          ...(overrides.mocks || {})
        }
      }
    })
  }

  describe('rendering', () => {
    it('should render the component', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render with a modelValue prop', () => {
      const wrapper = createWrapper({ props: { modelValue: FULL_VECTOR } })
      expect(wrapper.exists()).toBe(true)
    })

    it('should render in readonly mode', () => {
      const wrapper = createWrapper({ props: { readonly: true } })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('cvss4StrToObject', () => {
    it('should parse a full CVSS4 vector string into cvss4Obj', () => {
      const wrapper = createWrapper({
        props: { modelValue: FULL_VECTOR }
      })

      expect(wrapper.vm.cvss4Obj.AV).toBe('N')
      expect(wrapper.vm.cvss4Obj.AC).toBe('L')
      expect(wrapper.vm.cvss4Obj.AT).toBe('N')
      expect(wrapper.vm.cvss4Obj.PR).toBe('N')
      expect(wrapper.vm.cvss4Obj.UI).toBe('N')
      expect(wrapper.vm.cvss4Obj.VC).toBe('H')
      expect(wrapper.vm.cvss4Obj.VI).toBe('H')
      expect(wrapper.vm.cvss4Obj.VA).toBe('H')
      expect(wrapper.vm.cvss4Obj.SC).toBe('H')
      expect(wrapper.vm.cvss4Obj.SI).toBe('H')
      expect(wrapper.vm.cvss4Obj.SA).toBe('H')
    })

    it('should parse optional/supplemental metrics from vector string', () => {
      const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H/E:A/CR:H/IR:M/AR:L'
      const wrapper = createWrapper({ props: { modelValue: vector } })

      expect(wrapper.vm.cvss4Obj.E).toBe('A')
      expect(wrapper.vm.cvss4Obj.CR).toBe('H')
      expect(wrapper.vm.cvss4Obj.IR).toBe('M')
      expect(wrapper.vm.cvss4Obj.AR).toBe('L')
    })

    it('should parse environmental modified metrics from vector string', () => {
      const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H/MAV:A/MAC:H/MAT:P/MPR:L/MUI:P'
      const wrapper = createWrapper({ props: { modelValue: vector } })

      expect(wrapper.vm.cvss4Obj.MAV).toBe('A')
      expect(wrapper.vm.cvss4Obj.MAC).toBe('H')
      expect(wrapper.vm.cvss4Obj.MAT).toBe('P')
      expect(wrapper.vm.cvss4Obj.MPR).toBe('L')
      expect(wrapper.vm.cvss4Obj.MUI).toBe('P')
    })

    it('should parse additional supplemental metrics (S, AU, R, V, RE, U)', () => {
      const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H/S:P/AU:Y/R:A/V:C/RE:H/U:Red'
      const wrapper = createWrapper({ props: { modelValue: vector } })

      expect(wrapper.vm.cvss4Obj.S).toBe('P')
      expect(wrapper.vm.cvss4Obj.AU).toBe('Y')
      expect(wrapper.vm.cvss4Obj.R).toBe('A')
      expect(wrapper.vm.cvss4Obj.V).toBe('C')
      expect(wrapper.vm.cvss4Obj.RE).toBe('H')
      expect(wrapper.vm.cvss4Obj.U).toBe('Red')
    })

    it('should leave fields empty when modelValue is empty string', () => {
      const wrapper = createWrapper({ props: { modelValue: '' } })

      expect(wrapper.vm.cvss4Obj.AV).toBe('')
      expect(wrapper.vm.cvss4Obj.AC).toBe('')
      expect(wrapper.vm.cvss4Obj.VC).toBe('')
    })

    it('should handle null modelValue gracefully', () => {
      const wrapper = createWrapper({ props: { modelValue: null } })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.vm.cvss4Obj.AV).toBe('')
    })
  })

  describe('cvss4ObjectToStr', () => {
    it('should build a CVSS vector string from cvss4Obj fields', async () => {
      const wrapper = createWrapper()

      await wrapper.vm.$nextTick()
      wrapper.vm.cvss4Obj.AV = 'N'
      wrapper.vm.cvss4Obj.AC = 'L'
      wrapper.vm.cvss4Obj.AT = 'N'
      wrapper.vm.cvss4Obj.PR = 'N'
      wrapper.vm.cvss4Obj.UI = 'N'
      wrapper.vm.cvss4Obj.VC = 'H'
      wrapper.vm.cvss4Obj.VI = 'H'
      wrapper.vm.cvss4Obj.VA = 'H'
      wrapper.vm.cvss4Obj.SC = 'H'
      wrapper.vm.cvss4Obj.SI = 'H'
      wrapper.vm.cvss4Obj.SA = 'H'

      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmitted = emitted[emitted.length - 1][0]
      expect(lastEmitted).toContain('CVSS:4.0')
      expect(lastEmitted).toContain('AV:N')
      expect(lastEmitted).toContain('AC:L')
      expect(lastEmitted).toContain('VC:H')
    })

    it('should emit update:modelValue when cvss4Obj changes', async () => {
      const wrapper = createWrapper()

      wrapper.vm.cvss4Obj.AV = 'L'
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted.length).toBeGreaterThan(0)
    })

    it('should only include non-empty fields in the vector string', async () => {
      const wrapper = createWrapper()

      wrapper.vm.cvss4Obj.AV = 'N'
      wrapper.vm.cvss4Obj.AC = 'L'
      // Leave other fields empty
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmitted = emitted[emitted.length - 1][0]
      expect(lastEmitted).toContain('AV:N')
      expect(lastEmitted).toContain('AC:L')
      // Fields not set should not appear
      expect(lastEmitted).not.toContain('AT:')
    })
  })

  describe('modelValue watcher', () => {
    it('should update cvss4Obj when modelValue prop changes', async () => {
      const wrapper = createWrapper({ props: { modelValue: '' } })

      expect(wrapper.vm.cvss4Obj.AV).toBe('')

      await wrapper.setProps({ modelValue: FULL_VECTOR })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.cvss4Obj.AV).toBe('N')
      expect(wrapper.vm.cvss4Obj.VC).toBe('H')
    })
  })

  describe('initial data state', () => {
    it('should initialize cvss4Obj with empty string fields', () => {
      const wrapper = createWrapper()
      const obj = wrapper.vm.cvss4Obj

      expect(obj.version).toBe('4.0')
      expect(obj.AV).toBe('')
      expect(obj.AC).toBe('')
      expect(obj.AT).toBe('')
      expect(obj.PR).toBe('')
      expect(obj.UI).toBe('')
      expect(obj.VC).toBe('')
      expect(obj.VI).toBe('')
      expect(obj.VA).toBe('')
      expect(obj.SC).toBe('')
      expect(obj.SI).toBe('')
      expect(obj.SA).toBe('')
    })

    it('should initialize cvss4Items with options for each metric', () => {
      const wrapper = createWrapper()
      const items = wrapper.vm.cvss4Items

      expect(items.AV).toHaveLength(4)
      expect(items.AC).toHaveLength(2)
      expect(items.AT).toHaveLength(2)
      expect(items.PR).toHaveLength(3)
      expect(items.UI).toHaveLength(3)
      expect(items.VC).toHaveLength(3)
      expect(items.E).toHaveLength(4)
      expect(items.CR).toHaveLength(4)
      expect(items.IR).toHaveLength(4)
      expect(items.AR).toHaveLength(4)
    })

    it('should initialize tooltip with correct default values', () => {
      const wrapper = createWrapper()
      const tooltip = wrapper.vm.tooltip

      expect(tooltip.anchor).toBe('bottom middle')
      expect(tooltip.self).toBe('top left')
      expect(tooltip.delay).toBe(500)
      expect(tooltip.maxWidth).toBe('700px')
    })
  })

  describe('Cvss4P0 score computation', () => {
    it('should compute cvss4 score on creation when modelValue is a valid vector', async () => {
      const wrapper = createWrapper({ props: { modelValue: FULL_VECTOR } })
      await wrapper.vm.$nextTick()

      expect(Cvss4P0).toHaveBeenCalledWith(FULL_VECTOR)
      expect(wrapper.vm.cvss4.baseScore).toBe(9.3)
      expect(wrapper.vm.cvss4.baseSeverity).toBe('Critical')
    })

    it('should set cvss4 to empty object when Cvss4P0 throws on creation', () => {
      Cvss4P0.mockImplementationOnce(function() {
        throw new Error('Invalid vector')
      })

      const wrapper = createWrapper({ props: { modelValue: 'INVALID' } })
      // cvss4 should be reset to {} on error
      expect(wrapper.vm.cvss4).toEqual({})
    })
  })
})
