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
  }
]

const stubs = {
  'q-card-section': { template: '<section><slot /></section>' },
  'q-input': {
    props: ['modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'q-icon': { props: ['name'], template: '<span class="q-icon">{{name}}</span>' },
  'q-chip': { props: ['label'], template: '<span class="q-chip">{{label}}</span>' },
  'q-btn': { props: ['label'], template: '<button @click="$emit(\'click\')">{{label}}</button>' },
  'q-expansion-item': { template: '<div class="permission-group"><slot name="header" /><slot /></div>' },
  'q-item-section': { template: '<div><slot /></div>' },
  'q-badge': { props: ['label'], template: '<span class="q-badge">{{label}}</span>' },
  'q-checkbox': { props: ['label', 'disable'], template: '<label class="q-checkbox" :data-disable="disable">{{label}}</label>' },
  'q-item': { template: '<div class="q-item"><slot /></div>' },
  'q-item-label': { template: '<span><slot /></span>' }
}

const createWrapper = (props = {}) => {
  return mount(RolePermissionsPanel, {
    props: {
      permissionsCatalog: catalog,
      allows: ['roles:read'],
      search: '',
      expandedPermissionGroups: { roles: true, users: true },
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

    expect(wrapper.vm.selectedPermissionsCount).toBe(3)
    expect(wrapper.text()).toContain('3 / 3 assigned')
  })

  it('filters permissions by search text', async () => {
    const wrapper = createWrapper()

    await wrapper.setProps({ search: 'users' })

    expect(wrapper.text()).toContain('users:read')
    expect(wrapper.text()).not.toContain('roles:read')
  })
})
