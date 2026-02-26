import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestWrapper } from '../../test-utils'
import Cvss3Calculator from '@/components/cvss3calculator.vue'

// Mock boot/i18n since the component imports $t from it at module load time
vi.mock('boot/i18n', () => ({
  $t: (key) => key,
  default: { install: vi.fn() }
}))

describe('Cvss3Calculator Component', () => {
  const createWrapper = (overrides = {}) => {
    return createTestWrapper(Cvss3Calculator, {
      props: {
        modelValue: overrides.modelValue !== undefined ? overrides.modelValue : '',
        readonly: overrides.readonly !== undefined ? overrides.readonly : false,
        ...(overrides.props || {})
      },
      global: {
        mocks: {
          $t: (key) => key,
          ...(overrides.mocks || {})
        },
        stubs: {
          'q-tooltip': true,
          'q-expansion-item': true,
          'q-separator': true,
          'q-space': true,
          'q-chip': true,
          ...(overrides.stubs || {})
        }
      }
    })
  }

  it('should render', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('should render with a valid CVSS v3.1 vector string', () => {
    const wrapper = createWrapper({
      modelValue: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('should render with empty modelValue', () => {
    const wrapper = createWrapper({ modelValue: '' })
    expect(wrapper.exists()).toBe(true)
  })

  it('should render with null modelValue', () => {
    const wrapper = createWrapper({ modelValue: null })
    expect(wrapper.exists()).toBe(true)
  })

  describe('cvssStrToObject', () => {
    it('should parse a full base CVSS vector string into cvssObj', () => {
      const wrapper = createWrapper({
        modelValue: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
      })
      const cvssObj = wrapper.vm.cvssObj
      expect(cvssObj.AV).toBe('N')
      expect(cvssObj.AC).toBe('L')
      expect(cvssObj.PR).toBe('N')
      expect(cvssObj.UI).toBe('N')
      expect(cvssObj.S).toBe('U')
      expect(cvssObj.C).toBe('H')
      expect(cvssObj.I).toBe('H')
      expect(cvssObj.A).toBe('H')
    })

    it('should parse temporal metrics from vector string', () => {
      const wrapper = createWrapper({
        modelValue: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/E:F/RL:O/RC:C'
      })
      const cvssObj = wrapper.vm.cvssObj
      expect(cvssObj.E).toBe('F')
      expect(cvssObj.RL).toBe('O')
      expect(cvssObj.RC).toBe('C')
    })

    it('should parse environmental metrics from vector string', () => {
      const wrapper = createWrapper({
        modelValue: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/CR:H/IR:M/AR:L/MAV:N/MAC:L/MPR:N/MUI:N/MS:U/MC:H/MI:H/MA:H'
      })
      const cvssObj = wrapper.vm.cvssObj
      expect(cvssObj.CR).toBe('H')
      expect(cvssObj.IR).toBe('M')
      expect(cvssObj.AR).toBe('L')
      expect(cvssObj.MAV).toBe('N')
      expect(cvssObj.MAC).toBe('L')
      expect(cvssObj.MPR).toBe('N')
      expect(cvssObj.MUI).toBe('N')
      expect(cvssObj.MS).toBe('U')
      expect(cvssObj.MC).toBe('H')
      expect(cvssObj.MI).toBe('H')
      expect(cvssObj.MA).toBe('H')
    })

    it('should not modify cvssObj when modelValue is empty string', () => {
      const wrapper = createWrapper({ modelValue: '' })
      const cvssObj = wrapper.vm.cvssObj
      // All metric values remain as initial empty strings
      expect(cvssObj.AV).toBe('')
      expect(cvssObj.AC).toBe('')
      expect(cvssObj.PR).toBe('')
    })

    it('should set version from CVSS prefix', () => {
      const wrapper = createWrapper({
        modelValue: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
      })
      expect(wrapper.vm.cvssObj.version).toBe('3.1')
    })
  })

  describe('cvssObjectToStr', () => {
    it('should emit update:modelValue with constructed vector string', async () => {
      const wrapper = createWrapper({ modelValue: '' })

      // Directly invoke cvssObjectToStr after setting values
      wrapper.vm.cvssObj.AV = 'N'
      wrapper.vm.cvssObj.AC = 'L'
      wrapper.vm.cvssObj.PR = 'N'
      wrapper.vm.cvssObj.UI = 'N'
      wrapper.vm.cvssObj.S = 'U'
      wrapper.vm.cvssObj.C = 'H'
      wrapper.vm.cvssObj.I = 'H'
      wrapper.vm.cvssObj.A = 'H'
      wrapper.vm.cvssObjectToStr()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted[emitted.length - 1][0]
      expect(lastEmit).toContain('CVSS:3.1')
      expect(lastEmit).toContain('AV:N')
      expect(lastEmit).toContain('AC:L')
      expect(lastEmit).toContain('PR:N')
      expect(lastEmit).toContain('UI:N')
      expect(lastEmit).toContain('S:U')
      expect(lastEmit).toContain('C:H')
      expect(lastEmit).toContain('I:H')
      expect(lastEmit).toContain('A:H')
    })

    it('should omit empty optional metrics from vector string', () => {
      const wrapper = createWrapper({ modelValue: '' })
      wrapper.vm.cvssObj.AV = 'N'
      wrapper.vm.cvssObj.AC = 'L'
      wrapper.vm.cvssObj.PR = 'N'
      wrapper.vm.cvssObj.UI = 'N'
      wrapper.vm.cvssObj.S = 'U'
      wrapper.vm.cvssObj.C = 'H'
      wrapper.vm.cvssObj.I = 'H'
      wrapper.vm.cvssObj.A = 'H'
      wrapper.vm.cvssObj.E = ''    // empty — should be omitted
      wrapper.vm.cvssObj.RL = ''   // empty — should be omitted
      wrapper.vm.cvssObjectToStr()

      const emitted = wrapper.emitted('update:modelValue')
      const lastEmit = emitted[emitted.length - 1][0]
      expect(lastEmit).not.toContain('/E:')
      expect(lastEmit).not.toContain('/RL:')
    })

    it('should include temporal metrics when set', () => {
      const wrapper = createWrapper({ modelValue: '' })
      wrapper.vm.cvssObj.AV = 'N'
      wrapper.vm.cvssObj.AC = 'L'
      wrapper.vm.cvssObj.PR = 'N'
      wrapper.vm.cvssObj.UI = 'N'
      wrapper.vm.cvssObj.S = 'U'
      wrapper.vm.cvssObj.C = 'H'
      wrapper.vm.cvssObj.I = 'H'
      wrapper.vm.cvssObj.A = 'H'
      wrapper.vm.cvssObj.E = 'F'
      wrapper.vm.cvssObj.RL = 'O'
      wrapper.vm.cvssObj.RC = 'C'
      wrapper.vm.cvssObjectToStr()

      const emitted = wrapper.emitted('update:modelValue')
      const lastEmit = emitted[emitted.length - 1][0]
      expect(lastEmit).toContain('/E:F')
      expect(lastEmit).toContain('/RL:O')
      expect(lastEmit).toContain('/RC:C')
    })

    it('should update cvss object after cvssObjectToStr is called with valid vector', () => {
      const wrapper = createWrapper({ modelValue: '' })
      wrapper.vm.cvssObj.AV = 'N'
      wrapper.vm.cvssObj.AC = 'L'
      wrapper.vm.cvssObj.PR = 'N'
      wrapper.vm.cvssObj.UI = 'N'
      wrapper.vm.cvssObj.S = 'U'
      wrapper.vm.cvssObj.C = 'H'
      wrapper.vm.cvssObj.I = 'H'
      wrapper.vm.cvssObj.A = 'H'
      wrapper.vm.cvssObjectToStr()

      // cvss should be populated after a valid vector
      expect(wrapper.vm.cvss).toBeTruthy()
      expect(typeof wrapper.vm.cvss).toBe('object')
    })

    it('should set cvss to empty object when vector is truly invalid', () => {
      // The Cvss3P1 library does not throw on an incomplete vector like "CVSS:3.1/"
      // but it does throw on a malformed prefix. Test with a string that
      // causes a real parse error so cvss gets reset to {}.
      const wrapper = createWrapper({ modelValue: 'INVALID_VECTOR' })

      // cvss should be empty object since the initial vector is invalid
      expect(wrapper.vm.cvss).toEqual({})
    })
  })

  describe('watcher: modelValue', () => {
    it('should update cvssObj when modelValue prop changes', async () => {
      const wrapper = createWrapper({ modelValue: '' })
      expect(wrapper.vm.cvssObj.AV).toBe('')

      await wrapper.setProps({ modelValue: 'CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:C/C:L/I:L/A:N' })

      expect(wrapper.vm.cvssObj.AV).toBe('A')
      expect(wrapper.vm.cvssObj.AC).toBe('H')
      expect(wrapper.vm.cvssObj.PR).toBe('L')
      expect(wrapper.vm.cvssObj.UI).toBe('R')
      expect(wrapper.vm.cvssObj.S).toBe('C')
      expect(wrapper.vm.cvssObj.C).toBe('L')
      expect(wrapper.vm.cvssObj.I).toBe('L')
      expect(wrapper.vm.cvssObj.A).toBe('N')
    })
  })

  describe('initial cvssItems data', () => {
    it('should define AV options with correct values', () => {
      const wrapper = createWrapper()
      const avOptions = wrapper.vm.cvssItems.AV
      expect(avOptions).toHaveLength(4)
      const values = avOptions.map(o => o.value)
      expect(values).toContain('N')
      expect(values).toContain('A')
      expect(values).toContain('L')
      expect(values).toContain('P')
    })

    it('should define AC options with correct values', () => {
      const wrapper = createWrapper()
      const options = wrapper.vm.cvssItems.AC
      expect(options).toHaveLength(2)
      expect(options.map(o => o.value)).toEqual(['L', 'H'])
    })

    it('should define PR options with correct values', () => {
      const wrapper = createWrapper()
      const options = wrapper.vm.cvssItems.PR
      expect(options).toHaveLength(3)
      expect(options.map(o => o.value)).toContain('N')
      expect(options.map(o => o.value)).toContain('L')
      expect(options.map(o => o.value)).toContain('H')
    })

    it('should define UI options with correct values', () => {
      const wrapper = createWrapper()
      const options = wrapper.vm.cvssItems.UI
      expect(options).toHaveLength(2)
      expect(options.map(o => o.value)).toContain('N')
      expect(options.map(o => o.value)).toContain('R')
    })

    it('should define S options with correct values', () => {
      const wrapper = createWrapper()
      const options = wrapper.vm.cvssItems.S
      expect(options).toHaveLength(2)
      expect(options.map(o => o.value)).toContain('U')
      expect(options.map(o => o.value)).toContain('C')
    })

    it('should define CIA impact options (C, I, A) with N/L/H values', () => {
      const wrapper = createWrapper()
      for (const metric of ['C', 'I', 'A']) {
        const options = wrapper.vm.cvssItems[metric]
        expect(options).toHaveLength(3)
        expect(options.map(o => o.value)).toContain('N')
        expect(options.map(o => o.value)).toContain('L')
        expect(options.map(o => o.value)).toContain('H')
      }
    })

    it('should define temporal E options with 5 entries including empty not-defined', () => {
      const wrapper = createWrapper()
      const options = wrapper.vm.cvssItems.E
      expect(options).toHaveLength(5)
      expect(options[0].value).toBe('')  // Not Defined
      expect(options.map(o => o.value)).toContain('U')
      expect(options.map(o => o.value)).toContain('P')
      expect(options.map(o => o.value)).toContain('F')
      expect(options.map(o => o.value)).toContain('H')
    })

    it('should define RL options with 5 entries including empty not-defined', () => {
      const wrapper = createWrapper()
      const options = wrapper.vm.cvssItems.RL
      expect(options).toHaveLength(5)
      expect(options[0].value).toBe('')  // Not Defined
    })

    it('should define CR/IR/AR options with 4 entries including empty not-defined', () => {
      const wrapper = createWrapper()
      for (const metric of ['CR', 'IR', 'AR']) {
        const options = wrapper.vm.cvssItems[metric]
        expect(options).toHaveLength(4)
        expect(options[0].value).toBe('')  // Not Defined
        expect(options.map(o => o.value)).toContain('L')
        expect(options.map(o => o.value)).toContain('M')
        expect(options.map(o => o.value)).toContain('H')
      }
    })

    it('should define MAV options with 5 entries including empty not-defined', () => {
      const wrapper = createWrapper()
      const options = wrapper.vm.cvssItems.MAV
      expect(options).toHaveLength(5)
      expect(options[0].value).toBe('')  // Not Defined
      expect(options.map(o => o.value)).toContain('N')
      expect(options.map(o => o.value)).toContain('A')
      expect(options.map(o => o.value)).toContain('L')
      expect(options.map(o => o.value)).toContain('P')
    })
  })

  describe('readonly prop', () => {
    it('should accept readonly=true prop', () => {
      const wrapper = createWrapper({ readonly: true })
      expect(wrapper.vm.readonly).toBe(true)
    })

    it('should accept readonly=false prop', () => {
      const wrapper = createWrapper({ readonly: false })
      expect(wrapper.vm.readonly).toBe(false)
    })
  })

  describe('tooltip configuration', () => {
    it('should have default tooltip configuration', () => {
      const wrapper = createWrapper()
      const tooltip = wrapper.vm.tooltip
      expect(tooltip.anchor).toBe('bottom middle')
      expect(tooltip.self).toBe('top left')
      expect(tooltip.delay).toBe(500)
      expect(tooltip.maxWidth).toBe('700px')
      expect(tooltip.style).toBe('font-size: 12px')
    })
  })

  describe('initial state', () => {
    it('should initialize cvssObj with empty metric values', () => {
      const wrapper = createWrapper({ modelValue: '' })
      const cvssObj = wrapper.vm.cvssObj
      expect(cvssObj.version).toBe('3.1')
      expect(cvssObj.AV).toBe('')
      expect(cvssObj.AC).toBe('')
      expect(cvssObj.PR).toBe('')
      expect(cvssObj.UI).toBe('')
      expect(cvssObj.S).toBe('')
      expect(cvssObj.C).toBe('')
      expect(cvssObj.I).toBe('')
      expect(cvssObj.A).toBe('')
      expect(cvssObj.E).toBe('')
      expect(cvssObj.RL).toBe('')
      expect(cvssObj.RC).toBe('')
      expect(cvssObj.CR).toBe('')
      expect(cvssObj.IR).toBe('')
      expect(cvssObj.AR).toBe('')
      expect(cvssObj.MAV).toBe('')
      expect(cvssObj.MAC).toBe('')
      expect(cvssObj.MPR).toBe('')
      expect(cvssObj.MUI).toBe('')
      expect(cvssObj.MS).toBe('')
      expect(cvssObj.MC).toBe('')
      expect(cvssObj.MI).toBe('')
      expect(cvssObj.MA).toBe('')
    })

    it('should initialize cvss as populated object when given valid vector', () => {
      const wrapper = createWrapper({
        modelValue: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
      })
      expect(wrapper.vm.cvss).toBeTruthy()
      expect(typeof wrapper.vm.cvss).toBe('object')
    })

    it('should initialize cvss as empty object when given invalid vector', () => {
      const wrapper = createWrapper({ modelValue: 'INVALID' })
      expect(wrapper.vm.cvss).toEqual({})
    })
  })
})
