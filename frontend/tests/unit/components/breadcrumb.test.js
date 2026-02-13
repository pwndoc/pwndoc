import { describe, it, expect } from 'vitest'
import { createTestWrapper } from '../utils/test-utils'
import Breadcrumb from '@/components/breadcrumb.vue'

describe('Breadcrumb Component', () => {
  const mockSettings = {
    reviews: {
      enabled: true,
      public: {
        minReviewers: 2
      }
    }
  }

  const createWrapper = (overrides = {}) => {
    return createTestWrapper(Breadcrumb, {
      props: {
        title: 'Test Title',
        state: 'EDIT',
        ...overrides.props
      },
      global: {
        mocks: {
          $settings: mockSettings,
          ...(overrides.mocks || {})
        },
        stubs: {
          'audit-state-icon': true,
          'q-bar': { template: '<div class="q-bar"><slot /></div>' },
          'q-btn': true,
          'q-separator': true,
          'q-space': true,
          ...(overrides.stubs || {})
        }
      }
    })
  }

  it('should render', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('should display the title', () => {
    const wrapper = createWrapper({ props: { title: 'My Audit' } })
    expect(wrapper.text()).toContain('My Audit')
  })

  it('should render back button when path is provided', () => {
    const wrapper = createWrapper({
      props: {
        path: '/audits',
        pathName: 'Audits'
      }
    })

    const btn = wrapper.findComponent({ name: 'q-btn' })
    expect(btn.exists()).toBe(true)
  })

  it('should not render back button when path is not provided', () => {
    const wrapper = createWrapper({
      props: {
        path: undefined,
        pathName: undefined
      }
    })

    const btn = wrapper.findComponent({ name: 'q-btn' })
    expect(btn.exists()).toBe(false)
  })

  it('should show audit-state-icon when reviews are enabled and state is not EDIT', () => {
    const wrapper = createWrapper({
      props: {
        state: 'REVIEW',
        approvals: []
      }
    })

    const icon = wrapper.findComponent({ name: 'audit-state-icon' })
    expect(icon.exists()).toBe(true)
  })

  it('should not show audit-state-icon when state is EDIT', () => {
    const wrapper = createWrapper({
      props: {
        state: 'EDIT',
        approvals: []
      }
    })

    const icon = wrapper.findComponent({ name: 'audit-state-icon' })
    expect(icon.exists()).toBe(false)
  })

  it('should not show audit-state-icon when reviews are disabled', () => {
    const wrapper = createWrapper({
      props: {
        state: 'REVIEW',
        approvals: []
      },
      mocks: {
        $settings: {
          reviews: {
            enabled: false,
            public: { minReviewers: 2 }
          }
        }
      }
    })

    const icon = wrapper.findComponent({ name: 'audit-state-icon' })
    expect(icon.exists()).toBe(false)
  })

  it('should pass approvals and state props to audit-state-icon', () => {
    const approvals = [
      { _id: '1', firstname: 'John', lastname: 'Doe' }
    ]

    const wrapper = createWrapper({
      props: {
        state: 'APPROVED',
        approvals
      }
    })

    const icon = wrapper.findComponent({ name: 'audit-state-icon' })
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('state')).toBe('APPROVED')
  })

  it('should provide a buttons slot', () => {
    const wrapper = createTestWrapper(Breadcrumb, {
      props: {
        title: 'Test Title',
        state: 'EDIT'
      },
      global: {
        mocks: {
          $settings: mockSettings
        },
        stubs: {
          'audit-state-icon': true,
          'q-bar': { template: '<div class="q-bar"><slot /><slot name="buttons" /></div>' },
          'q-btn': true,
          'q-separator': true,
          'q-space': true
        }
      },
      slots: {
        buttons: '<span class="test-button">Action</span>'
      }
    })

    expect(wrapper.find('.test-button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Action')
  })
})
