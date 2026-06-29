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

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Notify: {
      create: vi.fn()
    }
  }
})

import RoleService from '@/services/role'
import { Notify } from 'quasar'
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

  const setRefs = (wrapper, refs) => {
    const instanceRefs = wrapper.vm.$?.refs
    Object.entries(refs).forEach(([name, refValue]) => {
      if (instanceRefs) {
        const existingRef = instanceRefs[name]
        instanceRefs[name] = existingRef ? { ...existingRef, ...refValue } : refValue
        return
      }

      const existingRef = wrapper.vm.$refs?.[name]
      if (existingRef && typeof existingRef === 'object')
        Object.assign(existingRef, refValue)
    })
  }

  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

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

  it('validates required fields before creating a role', async () => {
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    wrapper.vm.currentRole = { name: '', displayName: '', description: '', allows: [] }

    wrapper.vm.createRole()

    expect(wrapper.vm.errors.name).toBe('msg.roleNameRequired')
    expect(wrapper.vm.errors.displayName).toBe('msg.roleDisplayNameRequired')
    expect(RoleService.createRole).not.toHaveBeenCalled()
  })

  it('creates a role, refreshes rows, and closes the modal', async () => {
    RoleService.createRole.mockResolvedValue({})
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()
    RoleService.getRoles.mockClear()

    const hideMock = vi.fn()
    setRefs(wrapper, {
      createModal: { hide: hideMock }
    })
    wrapper.vm.currentRole = {
      name: 'client-reader',
      displayName: 'Client Reader',
      description: 'Read client records',
      allows: ['clients:read']
    }

    wrapper.vm.createRole()
    await flushPromises()

    expect(RoleService.createRole).toHaveBeenCalledWith({
      name: 'client-reader',
      displayName: 'Client Reader',
      description: 'Read client records',
      allows: ['clients:read']
    })
    expect(RoleService.getRoles).toHaveBeenCalled()
    expect(hideMock).toHaveBeenCalled()
    expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
      message: 'msg.roleCreatedOk',
      color: 'positive'
    }))
  })

  it('shows role creation errors from the API', async () => {
    RoleService.createRole.mockRejectedValue({
      response: { data: { datas: 'Role already exists' } }
    })
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()
    wrapper.vm.currentRole = {
      name: 'client-reader',
      displayName: 'Client Reader',
      description: '',
      allows: []
    }

    wrapper.vm.createRole()
    await flushPromises()

    expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Role already exists',
      color: 'negative'
    }))
  })

  it('validates required fields before updating a role', async () => {
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    wrapper.vm.currentRole = { name: '', displayName: '', description: '', allows: [] }

    wrapper.vm.updateRole()

    expect(wrapper.vm.errors.name).toBe('msg.roleNameRequired')
    expect(wrapper.vm.errors.displayName).toBe('msg.roleDisplayNameRequired')
    expect(RoleService.updateRole).not.toHaveBeenCalled()
  })

  it('updates a role by immutable original id', async () => {
    RoleService.updateRole.mockResolvedValue({})
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()
    RoleService.getRoles.mockClear()

    const hideMock = vi.fn()
    setRefs(wrapper, {
      editModal: { hide: hideMock }
    })
    wrapper.vm.idUpdate = 'client-reader'
    wrapper.vm.currentRole = {
      name: 'ignored-client-reader',
      displayName: 'Client Reader Updated',
      description: 'Updated description',
      allows: ['clients:read']
    }

    wrapper.vm.updateRole()
    await flushPromises()

    expect(RoleService.updateRole).toHaveBeenCalledWith('client-reader', wrapper.vm.currentRole)
    expect(RoleService.getRoles).toHaveBeenCalled()
    expect(hideMock).toHaveBeenCalled()
    expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
      message: 'msg.roleUpdatedOk',
      color: 'positive'
    }))
  })

  it('tracks delete target and deletes a role', async () => {
    RoleService.deleteRole.mockResolvedValue({})
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()
    RoleService.getRoles.mockClear()

    const showMock = vi.fn()
    const hideMock = vi.fn()
    setRefs(wrapper, {
      deleteModal: { show: showMock, hide: hideMock }
    })

    wrapper.vm.confirmDeleteRole({ name: 'client-reader', users: 2 })
    expect(wrapper.vm.roleToDelete).toEqual({ name: 'client-reader', users: 2 })
    expect(wrapper.vm.usersCount).toBe(2)
    expect(showMock).toHaveBeenCalled()

    wrapper.vm.deleteRole()
    await flushPromises()

    expect(RoleService.deleteRole).toHaveBeenCalledWith('client-reader')
    expect(RoleService.getRoles).toHaveBeenCalled()
    expect(hideMock).toHaveBeenCalled()
    expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
      message: 'msg.roleDeletedOk',
      color: 'positive'
    }))
  })

  it('shows role deletion errors from the API', async () => {
    RoleService.deleteRole.mockRejectedValue({
      response: { data: { datas: 'System roles cannot be modified' } }
    })
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()
    wrapper.vm.roleToDelete = { name: 'admin' }

    wrapper.vm.deleteRole()
    await flushPromises()

    expect(Notify.create).toHaveBeenCalledWith(expect.objectContaining({
      message: 'System roles cannot be modified',
      color: 'negative'
    }))
  })

  it('initializes new roles with core permissions and resets modal state', async () => {
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    wrapper.vm.currentRole = { name: 'dirty', displayName: 'Dirty', description: 'Dirty', allows: ['roles:update'] }
    wrapper.vm.roleNameTouched = true
    wrapper.vm.cloneFrom = 'reader'
    wrapper.vm.permissionSearch = 'roles'

    wrapper.vm.cleanCurrentRole()

    expect(wrapper.vm.currentRole).toEqual({
      name: '',
      displayName: '',
      description: '',
      allows: ['roles:read', 'users:read']
    })
    expect(wrapper.vm.roleNameTouched).toBe(false)
    expect(wrapper.vm.cloneFrom).toBe('')
    expect(wrapper.vm.permissionSearch).toBe('')
    expect(wrapper.vm.expandedPermissionGroups).toEqual({ roles: true, users: true })
  })

  it('clones permissions from selected roles', async () => {
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    wrapper.vm.roles = [
      { name: 'reader', displayName: 'Reader', allows: ['roles:read'] },
      { name: 'admin', displayName: 'Admin', allows: '*' }
    ]
    wrapper.vm.currentRole = { allows: [] }

    wrapper.vm.cloneFrom = 'reader'
    wrapper.vm.applyClone()
    expect(wrapper.vm.currentRole.allows).toEqual(['roles:read'])

    wrapper.vm.cloneFrom = 'admin'
    wrapper.vm.applyClone()
    expect(wrapper.vm.currentRole.allows).toEqual(['roles:read', 'roles:update', 'users:read'])
  })

  it('toggles permissions and clears all permissions', async () => {
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    wrapper.vm.currentRole = { allows: ['roles:read'] }

    wrapper.vm.togglePermission('users:read')
    expect(wrapper.vm.currentRole.allows).toEqual(['roles:read', 'users:read'])

    wrapper.vm.togglePermission('roles:read')
    expect(wrapper.vm.currentRole.allows).toEqual(['users:read'])

    wrapper.vm.clearPermissions()
    expect(wrapper.vm.currentRole.allows).toEqual([])
  })

  it('filters roles by query and type', async () => {
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    const rows = [
      { name: 'reader', displayName: 'Reader', description: 'Read only', type: 'custom' },
      { name: 'admin', displayName: 'Admin', description: 'System admin', type: 'system' }
    ]

    expect(wrapper.vm.roleFilter(rows, { query: 'read', type: null })).toEqual([rows[0]])
    expect(wrapper.vm.roleFilter(rows, { query: '', type: 'system' })).toEqual([rows[1]])
  })

  it('generates role slugs until the user edits the name manually', async () => {
    const wrapper = createWrapper()
    await vi.dynamicImportSettled()

    wrapper.vm.currentRole = { name: '', displayName: '', description: '', allows: [] }

    wrapper.vm.updateDisplayName('Équipe Rouge Senior!')
    expect(wrapper.vm.currentRole.displayName).toBe('Équipe Rouge Senior!')
    expect(wrapper.vm.currentRole.name).toBe('equipe-rouge-senior')

    wrapper.vm.updateRoleName('custom-name')
    wrapper.vm.updateDisplayName('Another Display Name')

    expect(wrapper.vm.currentRole.name).toBe('custom-name')
    expect(wrapper.vm.roleNameTouched).toBe(true)
  })
})
