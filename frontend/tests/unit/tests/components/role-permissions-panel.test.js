import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RolePermissionsPanel from '@/pages/data/roles/role-permissions-panel.vue'

const catalog = [
  {
    key: 'roles',
    label: 'Roles',
    permissions: [
      { scope: 'roles:read', core: true },
      { scope: 'roles:update' }
    ]
  },
  {
    key: 'users',
    label: 'Users',
    permissions: [
      { scope: 'users:read', core: true }
    ]
  },
  {
    key: 'backups',
    label: 'Backups',
    permissions: [
      { scope: 'backups:update' }
    ]
  }
]

const stubs = {
  'q-card-section': { template: '<section><slot /></section>' },
  'q-input': {
    props: ['modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'q-icon': { props: ['name'], template: '<span class="q-icon">{{name}}<slot /></span>' },
  'q-tooltip': { template: '<span class="q-tooltip"><slot /></span>' },
  'q-chip': { props: ['label'], template: '<span class="q-chip">{{label}}</span>' },
  'q-btn': { props: ['label'], template: '<button @click="$emit(\'click\')">{{label}}</button>' },
  'q-expansion-item': { template: '<div class="permission-group"><slot name="header" /><slot /></div>' },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-badge': { props: ['label'], template: '<span class="q-badge">{{label}}</span>' },
  'q-checkbox': { props: ['label', 'disable'], template: '<label class="q-checkbox" :data-disable="disable">{{label}}</label>' },
  'q-item': { template: '<div class="q-item"><slot /></div>' },
  'q-item-label': { template: '<span><slot /></span>' },
  'q-banner': { template: '<div class="q-banner"><slot name="avatar" /><slot /></div>' }
}

const createWrapper = (props = {}) => {
  return mount(RolePermissionsPanel, {
    props: {
      permissionsCatalog: catalog,
      allows: ['roles:read'],
      search: '',
      expandedPermissionGroups: { roles: true, users: true, backups: true },
      ...props
    },
    global: {
      stubs,
      mocks: {
        $t: (key) => key
      }
    }
  })
}

describe('RolePermissionsPanel', () => {
  it('renders readonly assigned permissions as disabled checkboxes', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('roles:read')
    expect(wrapper.text()).toContain('assigned')
    expect(wrapper.find('.q-checkbox').attributes('data-disable')).toBe('true')
  })

  it('treats all permissions as selected when allPermissions is true', () => {
    const wrapper = createWrapper({ allows: [], allPermissions: true })

    expect(wrapper.vm.selectedPermissionsCount).toBe(4)
    expect(wrapper.text()).toContain('4 / 4 assigned')
  })

  it('filters permissions by search text', async () => {
    const wrapper = createWrapper()

    await wrapper.setProps({ search: 'users' })

    expect(wrapper.text()).toContain('users:read')
    expect(wrapper.text()).not.toContain('roles:read')
  })

  it('shows a sensitive-permission warning icon only for backups:update', () => {
    const wrapper = createWrapper()

    const sensitiveCheckbox = wrapper.find('[data-testid="role-permission-backups:update-checkbox"]')
    expect(sensitiveCheckbox.element.parentElement.querySelector('.q-icon')).not.toBeNull()

    const plainCheckbox = wrapper.find('[data-testid="role-permission-roles:read-checkbox"]')
    expect(plainCheckbox.element.parentElement.querySelector('.q-icon')).toBeNull()
  })

  it('flags the backups group with a critical badge and a high-impact banner', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('criticalPermissionBadge')
    expect(wrapper.text()).toContain('highImpactPermissionTitle')
    expect(wrapper.find('.critical-permission-banner').exists()).toBe(true)
  })
})
