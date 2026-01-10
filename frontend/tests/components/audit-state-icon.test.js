import { describe, it, expect } from 'vitest'
import { createTestWrapper } from '../utils/test-utils'
import AuditStateIcon from '@/components/audit-state-icon.vue'

describe('AuditStateIcon Component', () => {
  const mockSettings = {
    reviews: {
      public: {
        minReviewers: 2
      }
    }
  }

  it('should render', () => {
    const wrapper = createTestWrapper(AuditStateIcon, {
      props: {
        state: 'EDIT'
      },
      global: {
        mocks: {
          $settings: mockSettings
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('should display correct icon for REVIEW state', () => {
    const wrapper = createTestWrapper(AuditStateIcon, {
      props: {
        state: 'REVIEW',
        approvals: []
      },
      global: {
        mocks: {
          $settings: mockSettings
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('Reviewing')
  })

  it('should display correct icon for APPROVED state', () => {
    const wrapper = createTestWrapper(AuditStateIcon, {
      props: {
        state: 'APPROVED',
        approvals: [{ _id: '1', firstname: 'John', lastname: 'Doe' }]
      },
      global: {
        mocks: {
          $settings: mockSettings
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('Approved')
  })

  it('should calculate approval count correctly', () => {
    const wrapper = createTestWrapper(AuditStateIcon, {
      props: {
        state: 'REVIEW',
        approvals: [
          { _id: '1', firstname: 'John', lastname: 'Doe' },
          { _id: '2', firstname: 'Jane', lastname: 'Smith' }
        ]
      },
      global: {
        mocks: {
          $settings: mockSettings
        }
      }
    })

    expect(wrapper.vm.getApprovalCount()).toBe(2)
  })
})
