import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

// Must mock stores/user before component import - settings.js calls useUserStore() at module scope
const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    roles: '',
    isAllowed: vi.fn(() => true)
  }
}))
vi.mock('stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore)
}))
vi.mock('src/stores/user', () => ({
  useUserStore: vi.fn(() => mockUserStore)
}))
vi.mock('src/boot/axios.js', () => ({ default: {} }))

import SettingsPage from '@/pages/settings/index.vue'

// Mock services
vi.mock('@/services/settings', () => ({
  default: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    exportSettings: vi.fn(),
    revertDefaults: vi.fn()
  }
}))

vi.mock('@/services/spellcheck', () => ({
  default: {
    testConnection: vi.fn()
  }
}))

vi.mock('@/services/backup', () => ({
  default: {
    getBackups: vi.fn(),
    getBackupStatus: vi.fn(),
    createBackup: vi.fn(),
    restoreBackup: vi.fn(),
    deleteBackup: vi.fn(),
    downloadBackup: vi.fn(),
    uploadBackup: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    bytesToHumanReadable: vi.fn((size) => `${size} bytes`),
    getRelativeDate: vi.fn((date) => date),
    customFilter: vi.fn()
  }
}))

vi.mock('boot/i18n', () => ({
  $t: (key) => key
}))

vi.mock('@/components/language-selector', () => ({
  default: {
    name: 'LanguageSelector',
    template: '<div class="mock-language-selector"></div>'
  }
}))

vi.mock('quasar', async () => {
  const actual = await vi.importActual('quasar')
  return {
    ...actual,
    Notify: {
      create: vi.fn()
    },
    Dialog: {
      create: vi.fn(() => ({
        onOk: vi.fn((cb) => {
          // Store callback for testing
          Dialog._lastOnOk = cb
          return { onCancel: vi.fn() }
        })
      }))
    }
  }
})

import SettingsService from '@/services/settings'
import SpellcheckService from '@/services/spellcheck'
import BackupService from '@/services/backup'
import { Notify, Dialog } from 'quasar'

const mockSettings = {
  report: {
    private: {
      imageBorder: false,
      imageBorderColor: '#000000'
    },
    public: {
      cvssColors: {
        criticalColor: '#ff0000',
        highColor: '#ff6600',
        mediumColor: '#ffcc00',
        lowColor: '#00cc00',
        noneColor: '#0000ff'
      },
      captions: [],
      highlightWarning: false,
      highlightWarningColor: '#ffff25',
      requiredFields: {
        company: false,
        client: false,
        dateStart: false,
        dateEnd: false,
        dateReport: false,
        scope: false,
        findingType: false,
        findingDescription: false,
        findingObservation: false,
        findingReferences: false,
        findingProofs: false,
        findingAffected: false,
        findingRemediationDifficulty: false,
        findingPriority: false,
        findingRemediation: false
      },
      scoringMethods: {
        CVSS3: true,
        CVSS4: false
      },
      enableSpellCheck: false
    }
  },
  reviews: {
    enabled: false,
    private: {
      removeApprovalsUponUpdate: true
    },
    public: {
      mandatoryReview: false,
      minReviewers: 1
    }
  }
}

const mockSettingsWithLt = {
  ...JSON.parse(JSON.stringify({
    report: {
      private: {
        imageBorder: false,
        imageBorderColor: '#000000',
        languageToolUrl: 'http://lt:8020',
        languageToolApiKey: 'original-key',
        languageToolUsername: ''
      },
      public: {
        cvssColors: { criticalColor: '#ff0000', highColor: '#ff6600', mediumColor: '#ffcc00', lowColor: '#00cc00', noneColor: '#0000ff' },
        captions: [],
        highlightWarning: false,
        highlightWarningColor: '#ffff25',
        requiredFields: { company: false, client: false, dateStart: false, dateEnd: false, dateReport: false, scope: false, findingType: false, findingDescription: false, findingObservation: false, findingReferences: false, findingProofs: false, findingAffected: false, findingRemediationDifficulty: false, findingPriority: false, findingRemediation: false },
        scoringMethods: { CVSS3: true, CVSS4: false },
        enableSpellCheck: true
      }
    },
    reviews: { enabled: false, private: { removeApprovalsUponUpdate: true }, public: { mandatoryReview: false, minReviewers: 1 } }
  }))
}

const mockBackups = [
  { name: 'Backup 1', slug: 'backup-1', size: 1024, date: '2025-01-01', type: 'full', data: [], protected: false },
  { name: 'Backup 2', slug: 'backup-2', size: 2048, date: '2025-01-02', type: 'partial', data: ['Audits'], protected: true }
]

describe('Settings Page', () => {
  let router, pinia, i18n

  const setRefs = (wrapper, refs) => {
    const mergedRefs = { ...(wrapper.vm.$?.refs || {}) }
    Object.entries(refs).forEach(([name, refValue]) => {
      const existingRef = mergedRefs[name]
      mergedRefs[name] = existingRef ? { ...existingRef, ...refValue } : refValue
    })
    if (wrapper.vm.$) wrapper.vm.$.refs = mergedRefs
  }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    pinia = createPinia()
    setActivePinia(pinia)

    // Grant all permissions by default
    mockUserStore.roles = '*'
    mockUserStore.isAllowed.mockImplementation((permission) => {
      if (mockUserStore.roles === '*') return true
      const roles = (mockUserStore.roles || '')
        .split(',')
        .map(role => role.trim())
        .filter(Boolean)
      return roles.includes(permission)
    })

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/settings', component: SettingsPage },
        { path: '/', component: { template: '<div>Home</div>' } }
      ]
    })

    i18n = createI18n({
      legacy: false,
      globalInjection: true,
      locale: 'en-US',
      fallbackLocale: 'en-US',
      messages: { 'en-US': {} }
    })

    // Default mock implementations
    SettingsService.getSettings.mockResolvedValue({
      data: { datas: JSON.parse(JSON.stringify(mockSettings)) }
    })
    BackupService.getBackups.mockResolvedValue({
      data: { datas: [...mockBackups] }
    })
    BackupService.getBackupStatus.mockResolvedValue({
      data: { datas: { state: 'idle', operation: 'idle', message: '' } }
    })

    vi.clearAllMocks()

    // Re-apply mocks after clearAllMocks
    SettingsService.getSettings.mockResolvedValue({
      data: { datas: JSON.parse(JSON.stringify(mockSettings)) }
    })
    BackupService.getBackups.mockResolvedValue({
      data: { datas: [...mockBackups] }
    })
    BackupService.getBackupStatus.mockResolvedValue({
      data: { datas: { state: 'idle', operation: 'idle', message: '' } }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const createWrapper = (options = {}) => {
    return mount(SettingsPage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-page': true,
          'q-card': true,
          'q-card-section': true,
          'q-card-actions': true,
          'q-input': true,
          'q-btn': true,
          'q-btn-toggle': true,
          'q-table': true,
          'q-dialog': { template: '<div><slot /></div>', methods: { show: vi.fn(), hide: vi.fn() } },
          'q-select': true,
          'q-toggle': true,
          'q-separator': true,
          'q-item': true,
          'q-item-section': true,
          'q-item-label': true,
          'q-icon': true,
          'q-list': true,
          'q-space': true,
          'q-banner': true,
          'q-radio': true,
          'q-checkbox': true,
          'q-tree': true,
          'q-td': true,
          'q-tooltip': true,
          'q-menu': true,
          'q-file': true,
          'q-bar': true,
          'q-pagination': true,
          'q-popup-proxy': true,
          'q-badge': true,
          'q-linear-progress': true,
          'q-spinner-hourglass': true,
          'language-selector': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => key,
          $settings: {
            refresh: vi.fn().mockResolvedValue({})
          },
          $_: {
            cloneDeep: (obj) => JSON.parse(JSON.stringify(obj))
          },
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should load settings and backups on mount when user has permission', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(SettingsService.getSettings).toHaveBeenCalled()
      expect(BackupService.getBackups).toHaveBeenCalled()
      expect(BackupService.getBackupStatus).toHaveBeenCalled()
    })

    it('should set loading to false when user does not have settings:read permission', async () => {
      mockUserStore.roles = ''

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.loading).toBe(false)
      expect(SettingsService.getSettings).not.toHaveBeenCalled()
    })

    it('should set canEdit when user has settings:update permission', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canEdit).toBe(true)
    })

    it('should not set canEdit when user lacks settings:update permission', async () => {
      mockUserStore.roles = 'settings:read,backups:read'

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.canEdit).toBe(false)
    })
  })

  describe('getSettings', () => {
    it('should populate settings data on success', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.settings).toEqual(mockSettings)
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should store original settings for change detection', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.settingsOrig).toEqual(mockSettings)
    })

    it('should show notification on error', async () => {
      SettingsService.getSettings.mockRejectedValue({
        response: { data: { datas: 'Failed to get settings' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to get settings',
          color: 'negative'
        })
      )
    })
  })

  describe('updateSettings', () => {
    it('should call SettingsService.updateSettings with current settings', async () => {
      SettingsService.updateSettings.mockResolvedValue({ data: { datas: 'ok' } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.updateSettings()
      await wrapper.vm.$nextTick()

      expect(SettingsService.updateSettings).toHaveBeenCalledWith(wrapper.vm.settings)
    })

    it('should clamp minReviewers to min=1 if below', async () => {
      SettingsService.updateSettings.mockResolvedValue({ data: { datas: 'ok' } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.settings.reviews.public.minReviewers = 0
      wrapper.vm.updateSettings()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.settings.reviews.public.minReviewers).toBe(1)
    })

    it('should clamp minReviewers to max=99 if above', async () => {
      SettingsService.updateSettings.mockResolvedValue({ data: { datas: 'ok' } })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.settings.reviews.public.minReviewers = 100
      wrapper.vm.updateSettings()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.settings.reviews.public.minReviewers).toBe(99)
    })

    it('should refresh settings and show success notification', async () => {
      SettingsService.updateSettings.mockResolvedValue({ data: { datas: 'ok' } })
      const mockRefresh = vi.fn().mockResolvedValue({})

      const wrapper = createWrapper({
        mocks: {
          $settings: { refresh: mockRefresh }
        }
      })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.updateSettings()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(mockRefresh).toHaveBeenCalled()
      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'msg.settingsUpdatedOk',
          color: 'positive'
        })
      )
    })

    it('should show error notification on failure', async () => {
      SettingsService.updateSettings.mockRejectedValue({
        message: 'Network error',
        response: { data: { datas: 'Update failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.updateSettings()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error',
          color: 'negative'
        })
      )
    })

    describe('LT auto-test on save', () => {
      beforeEach(() => {
        SettingsService.getSettings.mockResolvedValue({
          data: { datas: JSON.parse(JSON.stringify(mockSettingsWithLt)) }
        })
        SettingsService.updateSettings.mockResolvedValue({ data: { datas: 'ok' } })
      })

      it('should test connection when LT URL changes', async () => {
        SpellcheckService.testConnection.mockResolvedValue({
          data: { datas: { reachable: true, supportsCustomRules: false, authValid: null, requiresApiKey: false } }
        })

        const wrapper = createWrapper()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        // Change the LT URL (differs from settingsOrig)
        wrapper.vm.settings.report.private.languageToolUrl = 'http://new-lt:8020'

        await wrapper.vm.updateSettings()

        expect(SpellcheckService.testConnection).toHaveBeenCalledWith(
          'http://new-lt:8020',
          'original-key',
          ''
        )
        expect(SettingsService.updateSettings).toHaveBeenCalled()
      })

      it('should block save and show error when LT URL is unreachable', async () => {
        SpellcheckService.testConnection.mockResolvedValue({
          data: { datas: { reachable: false, supportsCustomRules: false, authValid: null, requiresApiKey: false } }
        })

        const wrapper = createWrapper()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        wrapper.vm.settings.report.private.languageToolUrl = 'http://unreachable:8020'

        await wrapper.vm.updateSettings()

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ color: 'negative' })
        )
        expect(SettingsService.updateSettings).not.toHaveBeenCalled()
      })

      it('should block save and show error when credentials are invalid', async () => {
        SpellcheckService.testConnection.mockResolvedValue({
          data: { datas: { reachable: true, supportsCustomRules: true, authValid: false, requiresApiKey: false } }
        })

        const wrapper = createWrapper()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        wrapper.vm.settings.report.private.languageToolApiKey = 'bad-key'

        await wrapper.vm.updateSettings()

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ color: 'negative' })
        )
        expect(SettingsService.updateSettings).not.toHaveBeenCalled()
      })

      it('should block save when requiresApiKey is true but no key provided', async () => {
        SpellcheckService.testConnection.mockResolvedValue({
          data: { datas: { reachable: true, supportsCustomRules: true, authValid: false, requiresApiKey: true } }
        })

        const wrapper = createWrapper()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        wrapper.vm.settings.report.private.languageToolApiKey = ''

        await wrapper.vm.updateSettings()

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ color: 'negative' })
        )
        expect(SettingsService.updateSettings).not.toHaveBeenCalled()
      })

      it('should block save and show error when testConnection throws', async () => {
        SpellcheckService.testConnection.mockRejectedValue({
          response: { data: { datas: 'Connection refused' } }
        })

        const wrapper = createWrapper()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        wrapper.vm.settings.report.private.languageToolUrl = 'http://broken:8020'

        await wrapper.vm.updateSettings()

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({ color: 'negative' })
        )
        expect(SettingsService.updateSettings).not.toHaveBeenCalled()
      })

      it('should skip LT test when LT fields are unchanged', async () => {
        const wrapper = createWrapper()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        // Don't change any LT fields
        await wrapper.vm.updateSettings()

        expect(SpellcheckService.testConnection).not.toHaveBeenCalled()
        expect(SettingsService.updateSettings).toHaveBeenCalled()
      })

      it('should skip LT test when LT URL is empty after change', async () => {
        const wrapper = createWrapper()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        // Clear the URL
        wrapper.vm.settings.report.private.languageToolUrl = ''

        await wrapper.vm.updateSettings()

        expect(SpellcheckService.testConnection).not.toHaveBeenCalled()
        expect(SettingsService.updateSettings).toHaveBeenCalled()
      })
    })
  })

  describe('unsavedChanges', () => {
    it('should return false when settings match original', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.unsavedChanges()).toBe(false)
    })

    it('should return true when settings differ from original', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.settings.reviews.enabled = true
      expect(wrapper.vm.unsavedChanges()).toBe(true)
    })
  })

  describe('getBackups', () => {
    it('should populate backups on success', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.backups).toEqual(mockBackups)
      expect(wrapper.vm.loadingBackups).toBe(false)
    })

    it('should show notification on error', async () => {
      BackupService.getBackups.mockRejectedValue({
        response: { data: { datas: 'Failed to get backups' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to get backups',
          color: 'negative'
        })
      )
    })
  })

  describe('getBackupStatus', () => {
    it('should update backupStatus from response', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.backupStatus).toEqual({
        state: 'idle',
        operation: 'idle',
        message: ''
      })
    })

    it('should refresh backups when status transitions to idle', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Set a non-idle state first
      wrapper.vm.backupStatus.state = 'running'

      // Clear mocks to track new calls
      BackupService.getBackups.mockClear()
      BackupService.getBackupStatus.mockResolvedValue({
        data: { datas: { state: 'idle', operation: 'idle', message: '' } }
      })

      wrapper.vm.getBackupStatus()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(BackupService.getBackups).toHaveBeenCalled()
    })
  })

  describe('createBackup', () => {
    it('should call BackupService.createBackup with currentBackup', async () => {
      BackupService.createBackup.mockResolvedValue({
        data: { datas: 'Backup created' }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Mock the ref
      setRefs(wrapper, { createBackupModal: { hide: vi.fn() } })

      wrapper.vm.currentBackup = { name: 'Test Backup', data: [], password: '' }
      wrapper.vm.createBackup()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(BackupService.createBackup).toHaveBeenCalledWith({
        name: 'Test Backup',
        data: [],
        password: ''
      })
    })

    it('should show success notification after creating backup', async () => {
      BackupService.createBackup.mockResolvedValue({
        data: { datas: 'Backup created successfully' }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      setRefs(wrapper, { createBackupModal: { hide: vi.fn() } })
      wrapper.vm.createBackup()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Backup created successfully',
          color: 'positive'
        })
      )
    })

    it('should show error notification on failure', async () => {
      BackupService.createBackup.mockRejectedValue({
        response: { data: { datas: 'Backup creation failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.createBackup()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Backup creation failed',
          color: 'negative'
        })
      )
    })
  })

  describe('restoreBackup', () => {
    it('should call BackupService.restoreBackup with correct data for full restore', async () => {
      BackupService.restoreBackup.mockResolvedValue({
        data: { datas: 'Restore started' }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      setRefs(wrapper, { restoreBackupModal: { hide: vi.fn() } })
      wrapper.vm.currentBackup = { slug: 'backup-1', name: 'Test', data: ['Audits'], password: 'pass' }
      wrapper.vm.backupType = 'full'
      wrapper.vm.restoreMode = 'revert'

      wrapper.vm.restoreBackup()
      await wrapper.vm.$nextTick()

      expect(BackupService.restoreBackup).toHaveBeenCalledWith('backup-1', {
        data: [],
        password: 'pass',
        mode: 'revert'
      })
    })

    it('should call BackupService.restoreBackup with selected data for partial restore', async () => {
      BackupService.restoreBackup.mockResolvedValue({
        data: { datas: 'Restore started' }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      setRefs(wrapper, { restoreBackupModal: { hide: vi.fn() } })
      wrapper.vm.currentBackup = { slug: 'backup-1', name: 'Test', data: ['Audits', 'Users'], password: '' }
      wrapper.vm.backupType = 'partial'
      wrapper.vm.restoreMode = 'upsert'

      wrapper.vm.restoreBackup()
      await wrapper.vm.$nextTick()

      expect(BackupService.restoreBackup).toHaveBeenCalledWith('backup-1', {
        data: ['Audits', 'Users'],
        password: '',
        mode: 'upsert'
      })
    })

    it('should show error notification on restore failure', async () => {
      BackupService.restoreBackup.mockRejectedValue({
        response: { data: { datas: 'Restore failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentBackup = { slug: 'backup-1', name: 'Test', data: [], password: '' }
      wrapper.vm.restoreBackup()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Restore failed',
          color: 'negative'
        })
      )
    })
  })

  describe('deleteBackup', () => {
    it('should call BackupService.deleteBackup with backup slug', async () => {
      BackupService.deleteBackup.mockResolvedValue({
        data: { datas: 'Backup deleted' }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteBackup({ slug: 'backup-1', name: 'Backup 1' })
      await wrapper.vm.$nextTick()

      expect(BackupService.deleteBackup).toHaveBeenCalledWith('backup-1')
    })

    it('should refresh backups and show success notification', async () => {
      BackupService.deleteBackup.mockResolvedValue({
        data: { datas: 'Backup deleted successfully' }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      BackupService.getBackups.mockClear()
      wrapper.vm.deleteBackup({ slug: 'backup-1', name: 'Backup 1' })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(BackupService.getBackups).toHaveBeenCalled()
      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Backup deleted successfully',
          color: 'positive'
        })
      )
    })

    it('should show error notification on delete failure', async () => {
      BackupService.deleteBackup.mockRejectedValue({
        response: { data: { datas: 'Delete failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.deleteBackup({ slug: 'backup-1', name: 'Backup 1' })
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Delete failed',
          color: 'negative'
        })
      )
    })
  })

  describe('downloadBackup', () => {
    it('should call BackupService.downloadBackup with row slug', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.downloadBackup({ slug: 'backup-1' })

      expect(BackupService.downloadBackup).toHaveBeenCalledWith('backup-1')
    })
  })

  describe('exportSettings', () => {
    it('should call SettingsService.exportSettings and create download link', async () => {
      const mockUrl = 'blob:http://localhost/test'
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn()
      }

      SettingsService.exportSettings.mockResolvedValue({
        data: { test: 'data' },
        headers: { 'content-disposition': 'attachment; filename="settings.json"' }
      })

      const createObjectUrlSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue(mockUrl)
      const originalCreateElement = document.createElement.bind(document)
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') return mockLink
        return originalCreateElement(tagName)
      })
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      try {
        await wrapper.vm.exportSettings()

        expect(SettingsService.exportSettings).toHaveBeenCalled()
        expect(mockLink.click).toHaveBeenCalled()
        expect(mockLink.remove).toHaveBeenCalled()
      } finally {
        createObjectUrlSpy.mockRestore()
        createElementSpy.mockRestore()
        appendChildSpy.mockRestore()
      }
    })
  })

  describe('cleanCurrentBackup', () => {
    it('should reset currentBackup and backupType', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.currentBackup = { name: 'modified', data: ['Audits'], password: 'secret' }
      wrapper.vm.backupType = 'partial'
      wrapper.vm.backupEncrypted = true

      wrapper.vm.cleanCurrentBackup()

      expect(wrapper.vm.backupType).toBe('full')
      expect(wrapper.vm.backupEncrypted).toBe(false)
      expect(wrapper.vm.currentBackup.data).toEqual([])
      expect(wrapper.vm.currentBackup.password).toBe('')
    })
  })

  describe('handleBackupTicked', () => {
    it('should auto-add Companies when Clients is ticked', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const ticked = ['Clients']
      wrapper.vm.handleBackupTicked(ticked)

      expect(ticked).toContain('Companies')
    })

    it('should auto-add Templates when Audit Types is ticked', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const ticked = ['Audit Types']
      wrapper.vm.handleBackupTicked(ticked)

      expect(ticked).toContain('Templates')
      expect(ticked).toContain('Custom Sections')
    })

    it('should auto-add Vulnerabilities when Vulnerabilities Updates is ticked', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const ticked = ['Vulnerabilities Updates']
      wrapper.vm.handleBackupTicked(ticked)

      expect(ticked).toContain('Vulnerabilities')
    })
  })

  describe('uploadBackup', () => {
    it('should not upload if no file is selected', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.uploadBackupFile = null
      wrapper.vm.uploadBackup()

      expect(BackupService.uploadBackup).not.toHaveBeenCalled()
    })

    it('should call BackupService.uploadBackup with FormData when file selected', async () => {
      BackupService.uploadBackup.mockResolvedValue({
        data: { datas: 'Upload successful' }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      setRefs(wrapper, { uploadBackupModal: { hide: vi.fn() } })
      wrapper.vm.uploadBackupFile = new File(['content'], 'backup.tar')

      wrapper.vm.uploadBackup()
      await wrapper.vm.$nextTick()

      expect(BackupService.uploadBackup).toHaveBeenCalled()
      expect(wrapper.vm.uploadBackupLoading).toBe(true)
    })

    it('should show error notification on upload failure', async () => {
      BackupService.uploadBackup.mockRejectedValue({
        response: { data: { datas: 'Upload failed' } }
      })

      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      setRefs(wrapper, { uploadBackupModal: { hide: vi.fn() } })
      wrapper.vm.uploadBackupFile = new File(['content'], 'backup.tar')

      wrapper.vm.uploadBackup()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Upload failed',
          color: 'negative'
        })
      )
    })
  })

  describe('counterLabelFn', () => {
    it('should return totalSize when filesNumber > 0', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const result = wrapper.vm.counterLabelFn({ totalSize: '1.5MB', filesNumber: 1, maxFiles: 1 })
      expect(result).toBe('1.5MB')
    })

    it('should return empty string when no files', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const result = wrapper.vm.counterLabelFn({ totalSize: '0', filesNumber: 0, maxFiles: 1 })
      expect(result).toBe('')
    })
  })

  describe('rejectUploadFile', () => {
    it('should show notification for wrong file format', async () => {
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.rejectUploadFile([])

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'wrongFileFormat',
          color: 'negative'
        })
      )
    })
  })

  describe('Keyboard shortcut', () => {
    it('should add keydown listener on mount', async () => {
      const addSpy = vi.spyOn(document, 'addEventListener')
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), false)
      addSpy.mockRestore()
    })

    it('should remove keydown listener on unmount', async () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.unmount()

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), false)
      removeSpy.mockRestore()
    })
  })

  describe('Data properties', () => {
    it('should have correct initial data state', async () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.loading).toBe(true)
      expect(wrapper.vm.loadingBackups).toBe(true)
      expect(wrapper.vm.backupType).toBe('full')
      expect(wrapper.vm.backupEncrypted).toBe(false)
      expect(wrapper.vm.restoreMode).toBe('revert')
      expect(wrapper.vm.uploadBackupFile).toBe(null)
      expect(wrapper.vm.uploadBackupLoading).toBe(false)
      expect(wrapper.vm.uploadProgress).toBe(0)
    })

    it('should have pagination defaults', async () => {
      const wrapper = createWrapper()

      expect(wrapper.vm.pagination.page).toBe(1)
      expect(wrapper.vm.pagination.rowsPerPage).toBe(10)
      expect(wrapper.vm.pagination.sortBy).toBe('date')
      expect(wrapper.vm.pagination.descending).toBe(true)
    })

    it('should have highlightPalette with 15 colors', async () => {
      const wrapper = createWrapper()
      expect(wrapper.vm.highlightPalette).toHaveLength(15)
    })
  })
})
