import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    isAllowed: vi.fn(() => false)
  }
}))

vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore)
}))

vi.mock('@/services/role', () => ({
  default: {
    getRoles: vi.fn(),
    getPermissionsCatalog: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    normalizeString: vi.fn((value) => String(value || '').toLowerCase()),
    paginationRange: vi.fn(() => ({ start: 1, end: 1 }))
  }
}))

vi.mock('@/boot/i18n', () => ({
  $t: (key) => key
}))

import RoleService from '@/services/role'
import RolesPage from '@/pages/data/roles/index.vue'

const permissionsCatalog = [
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

const roles = [
  {
    name: 'reader',
    displayName: 'Reader',
    description: 'Read roles only',
    allows: ['roles:read'],
    users: 1
  },
  {
    name: 'admin',
    displayName: 'Admin',
    allows: '*',
    virtual: true,
    users: 1
  }
]

const stubs = {
  'q-table': {
    props: ['rows'],
    template: `
      <div>
        <slot name="top" />
        <div v-for="row in rows" :key="row.name" class="role-row">
          <slot name="body-cell-action" :row="row" />
          <slot name="body-cell-permissions" :row="row" />
        </div>
        <slot name="bottom" :pages-number="1" />
      </div>
    `
  },
  'q-dialog': {
    template: '<div><slot /></div>',
    methods: {
      show: vi.fn(),
      hide: vi.fn()
    }
  },
  'q-btn': {
    props: ['icon', 'label'],
    template: '<button class="q-btn" :data-icon="icon" @click="$emit(\'click\', $event)"><slot />{{label}}</button>'
  },
  'q-icon': { props: ['name'], template: '<span class="q-icon">{{name}}</span>' },
  'q-tooltip': true,
  'q-td': { template: '<td><slot /></td>' },
  'q-chip': { props: ['label'], template: '<span>{{label}}</span>' },
  'q-linear-progress': true,
  'q-input': true,
  'q-select': true,
  'q-pagination': true,
  'q-space': true,
  'q-card': { template: '<div><slot /></div>' },
  'q-card-section': { template: '<section><slot /></section>' },
  'q-card-actions': { template: '<div><slot /></div>' },
  'q-bar': { template: '<div><slot /></div>' },
  'role-permissions-panel': true
}

describe('Roles Page', () => {
  let router, pinia, i18n

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/data/roles', component: RolesPage }
      ]
    })

    i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: { 'en-US': {} }
    })

    vi.clearAllMocks()
    mockUserStore.isAllowed.mockImplementation((permission) => permission === 'roles:read')
    RoleService.getPermissionsCatalog.mockResolvedValue({ data: { datas: permissionsCatalog } })
    RoleService.getRoles.mockResolvedValue({ data: { datas: roles } })
  })

  const createWrapper = () => {
    return mount(RolesPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs,
        mocks: {
          $t: (key) => key
        }
      }
    })
  }

  it('shows view actions but not edit or delete actions for roles:read only users', async () => {
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    const icons = wrapper.findAll('button.q-btn').map(button => button.attributes('data-icon'))

    expect(icons).toContain('visibility')
    expect(icons).not.toContain('fa fa-edit')
    expect(icons).not.toContain('fa fa-trash')
  })

  it('keeps view actions only for system roles when the user can update roles', async () => {
    mockUserStore.isAllowed.mockImplementation((permission) => ['roles:read', 'roles:update'].includes(permission))
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    const icons = wrapper.findAll('button.q-btn').map(button => button.attributes('data-icon'))

    expect(icons.filter(icon => icon === 'visibility')).toHaveLength(1)
    expect(icons).toContain('fa fa-edit')
  })

  it('opens read-only view state for a custom role', async () => {
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    wrapper.vm.viewRole(roles[0])

    expect(wrapper.vm.currentRole).toMatchObject({
      name: 'reader',
      displayName: 'Reader',
      description: 'Read roles only',
      allows: ['roles:read']
    })
    expect(wrapper.vm.permissionSearch).toBe('')
  })

  it('keeps all-permissions roles readable as all permissions selected', async () => {
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    wrapper.vm.viewRole(roles[1])

    expect(wrapper.vm.currentRole.allows).toBe('*')
    expect(wrapper.vm.selectedPermissionsCount).toBe(3)
    expect(wrapper.vm.permissionSummary(wrapper.vm.currentRole)).toBe('allPermissions')
  })
})
