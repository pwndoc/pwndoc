import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ProfilePage from '@/pages/profile/index.vue'
import UserService from '@/services/user'
import Utils from '@/services/utils'

// Mock dependencies
vi.mock('@/services/user', () => ({
  default: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    refreshToken: vi.fn(),
    getTotpQrCode: vi.fn(),
    setupTotp: vi.fn(),
    cancelTotp: vi.fn()
  }
}))

vi.mock('@/services/utils', () => ({
  default: {
    strongPassword: vi.fn()
  }
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

vi.mock('@/boot/i18n', () => {
  const messages = {
    'msg.usernameRequired': 'Username required',
    'msg.firstnameRequired': 'First name required',
    'msg.lastnameRequired': 'Last name required',
    'msg.currentPasswordRequired': 'Current password required',
    'msg.confirmPasswordDifferents': 'Passwords do not match',
    'msg.passwordComplexity': 'Password does not meet complexity requirements',
    'msg.profileUpdateOk': 'Profile updated successfully'
  }
  return {
    $t: (key) => messages[key] || key
  }
})

describe('Profile Page', () => {
  let router, pinia, i18n, wrapper

  const mockUser = {
    username: 'testuser',
    firstname: 'Test',
    lastname: 'User',
    email: 'test@example.com',
    phone: '1234567890',
    role: 'user',
    totpEnabled: false
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/profile', component: ProfilePage }
      ]
    })

    i18n = createI18n({
      legacy: false,
      globalInjection: true,
      locale: 'en-US',
      fallbackLocale: 'en-US',
      messages: {
        'en-US': {
          updateUserInformation: 'Update User Information',
          role: 'Role',
          username: 'Username',
          firstname: 'First Name',
          lastname: 'Last Name',
          newPassword: 'New Password',
          confirmPassword: 'Confirm Password',
          currentPassword: 'Current Password',
          'btn.update': 'Update',
          'msg.usernameRequired': 'Username required',
          'msg.firstnameRequired': 'First name required',
          'msg.lastnameRequired': 'Last name required',
          'msg.currentPasswordRequired': 'Current password required',
          'msg.confirmPasswordDifferents': 'Passwords do not match',
          'msg.passwordComplexity': 'Password does not meet complexity requirements',
          'msg.profileUpdateOk': 'Profile updated successfully'
        }
      }
    })

    vi.clearAllMocks()

    // Default mock for getProfile
    UserService.getProfile.mockResolvedValue({
      data: { datas: { ...mockUser } }
    })
  })

  const createWrapper = (options = {}) => {
    return mount(ProfilePage, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          'q-card': true,
          'q-card-section': true,
          'q-separator': true,
          'q-list': true,
          'q-item': true,
          'q-item-section': true,
          'q-input': true,
          'q-btn': true,
          'q-toggle': true,
          'q-field': true,
          'q-img': true,
          'q-chip': true,
          ...(options.stubs || {})
        },
        mocks: {
          $t: (key) => i18n.global.t(key),
          $settings: {},
          ...(options.mocks || {})
        }
      }
    })
  }

  describe('Initialization', () => {
    it('should call getProfile on mount', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(UserService.getProfile).toHaveBeenCalled()
    })

    it('should populate user data from getProfile response', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.user.username).toBe('testuser')
      expect(wrapper.vm.user.firstname).toBe('Test')
      expect(wrapper.vm.user.lastname).toBe('User')
      expect(wrapper.vm.user.email).toBe('test@example.com')
      expect(wrapper.vm.user.phone).toBe('1234567890')
      expect(wrapper.vm.user.role).toBe('user')
    })

    it('should set totpEnabled from user data', async () => {
      UserService.getProfile.mockResolvedValue({
        data: { datas: { ...mockUser, totpEnabled: true } }
      })

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.totpEnabled).toBe(true)
    })

    it('should handle getProfile errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      UserService.getProfile.mockRejectedValue(new Error('Network error'))

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should initialize with empty errors', () => {
      wrapper = createWrapper()

      expect(wrapper.vm.errors.username).toBe('')
      expect(wrapper.vm.errors.firstname).toBe('')
      expect(wrapper.vm.errors.lastname).toBe('')
      expect(wrapper.vm.errors.currentPassword).toBe('')
      expect(wrapper.vm.errors.newPassword).toBe('')
    })
  })

  describe('updateProfile', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should validate username is required', () => {
      wrapper.vm.user.username = ''
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = 'password123'

      wrapper.vm.updateProfile()

      expect(wrapper.vm.errors.username).toBe('Username required')
    })

    it('should validate firstname is required', () => {
      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = ''
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = 'password123'

      wrapper.vm.updateProfile()

      expect(wrapper.vm.errors.firstname).toBe('First name required')
    })

    it('should validate lastname is required', () => {
      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = ''
      wrapper.vm.user.currentPassword = 'password123'

      wrapper.vm.updateProfile()

      expect(wrapper.vm.errors.lastname).toBe('Last name required')
    })

    it('should validate current password is required', () => {
      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = ''

      wrapper.vm.updateProfile()

      expect(wrapper.vm.errors.currentPassword).toBe('Current password required')
    })

    it('should validate password confirmation matches', () => {
      // strongPassword must return true so the complexity check doesn't overwrite the mismatch error
      Utils.strongPassword.mockReturnValue(true)

      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = 'password123'
      wrapper.vm.user.newPassword = 'newpass123'
      wrapper.vm.user.confirmPassword = 'differentpass'

      wrapper.vm.updateProfile()

      expect(wrapper.vm.errors.newPassword).toBe('Passwords do not match')
    })

    it('should validate password complexity when new password is provided', () => {
      Utils.strongPassword.mockReturnValue('Too weak')

      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = 'password123'
      wrapper.vm.user.newPassword = 'weak'
      wrapper.vm.user.confirmPassword = 'weak'

      wrapper.vm.updateProfile()

      expect(Utils.strongPassword).toHaveBeenCalledWith('weak')
      expect(wrapper.vm.errors.newPassword).toBe('Password does not meet complexity requirements')
    })

    it('should not check password complexity when new password is empty', () => {
      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = 'password123'
      wrapper.vm.user.newPassword = ''
      wrapper.vm.user.confirmPassword = ''

      UserService.updateProfile.mockResolvedValue({ data: {} })

      wrapper.vm.updateProfile()

      expect(Utils.strongPassword).not.toHaveBeenCalled()
    })

    it('should not call service when validation fails', () => {
      wrapper.vm.user.username = ''

      wrapper.vm.updateProfile()

      expect(UserService.updateProfile).not.toHaveBeenCalled()
    })

    it('should clear errors before validation', () => {
      wrapper.vm.errors.username = 'Previous error'
      wrapper.vm.errors.firstname = 'Previous error'

      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = ''

      wrapper.vm.updateProfile()

      // username and firstname errors should be cleared, currentPassword should be set
      expect(wrapper.vm.errors.username).toBe('')
      expect(wrapper.vm.errors.firstname).toBe('')
      expect(wrapper.vm.errors.currentPassword).toBe('Current password required')
    })

    it('should call UserService.updateProfile with user data on valid form', async () => {
      UserService.updateProfile.mockResolvedValue({ data: {} })
      UserService.refreshToken.mockResolvedValue()
      Utils.strongPassword.mockReturnValue(true)

      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = 'password123'

      wrapper.vm.updateProfile()

      await wrapper.vm.$nextTick()

      expect(UserService.updateProfile).toHaveBeenCalledWith(wrapper.vm.user)
    })

    it('should call refreshToken after successful profile update', async () => {
      UserService.updateProfile.mockResolvedValue({ data: {} })
      UserService.refreshToken.mockResolvedValue()

      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = 'password123'

      wrapper.vm.updateProfile()

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(UserService.refreshToken).toHaveBeenCalled()
    })

    it('should show success notification after profile update', async () => {
      const { Notify } = await import('quasar')
      UserService.updateProfile.mockResolvedValue({ data: {} })
      UserService.refreshToken.mockResolvedValue()

      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = 'password123'

      wrapper.vm.updateProfile()

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Profile updated successfully',
          color: 'positive'
        })
      )
    })

    it('should show error notification on update failure', async () => {
      const { Notify } = await import('quasar')
      UserService.updateProfile.mockRejectedValue({
        response: { data: { datas: 'Wrong password' } }
      })

      wrapper.vm.user.username = 'testuser'
      wrapper.vm.user.firstname = 'Test'
      wrapper.vm.user.lastname = 'User'
      wrapper.vm.user.currentPassword = 'wrongpassword'

      wrapper.vm.updateProfile()

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(Notify.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Wrong password',
          color: 'negative'
        })
      )
    })
  })

  describe('TOTP Management', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
    })

    describe('getTotpQrcode', () => {
      it('should fetch QR code when enabling TOTP for user without TOTP', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        UserService.getTotpQrCode.mockResolvedValue({
          data: {
            datas: {
              totpQrCode: 'data:image/png;base64,qrcode',
              totpSecret: 'SECRETKEY123'
            }
          }
        })

        wrapper.vm.totpEnabled = true
        wrapper.vm.user.totpEnabled = false

        wrapper.vm.getTotpQrcode()

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        expect(UserService.getTotpQrCode).toHaveBeenCalled()
        // The $refs.totpEnableInput.focus() call will fail in test environment
        // since the ref element is not rendered with stubs, but the service call
        // and data assignment happen before the focus call throws
        expect(wrapper.vm.totpQrcode).toBe('data:image/png;base64,qrcode')
        expect(wrapper.vm.totpSecret).toBe('SECRETKEY123')

        consoleSpy.mockRestore()
      })

      it('should not fetch QR code when disabling TOTP', () => {
        wrapper.vm.totpEnabled = false
        wrapper.vm.user.totpEnabled = false

        wrapper.vm.getTotpQrcode()

        expect(UserService.getTotpQrCode).not.toHaveBeenCalled()
        expect(wrapper.vm.totpQrcode).toBe('')
        expect(wrapper.vm.totpSecret).toBe('')
        expect(wrapper.vm.totpToken).toBe('')
      })

      it('should handle QR code fetch errors', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        UserService.getTotpQrCode.mockRejectedValue(new Error('Server error'))

        wrapper.vm.totpEnabled = true
        wrapper.vm.user.totpEnabled = false

        wrapper.vm.getTotpQrcode()

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        expect(consoleSpy).toHaveBeenCalled()
        consoleSpy.mockRestore()
      })
    })

    describe('setupTotp', () => {
      it('should call UserService.setupTotp with token and secret', async () => {
        UserService.setupTotp.mockResolvedValue({ data: {} })

        wrapper.vm.totpToken = '123456'
        wrapper.vm.totpSecret = 'SECRETKEY123'

        wrapper.vm.setupTotp()

        await wrapper.vm.$nextTick()

        expect(UserService.setupTotp).toHaveBeenCalledWith('123456', 'SECRETKEY123')
      })

      it('should set user.totpEnabled to true on success', async () => {
        UserService.setupTotp.mockResolvedValue({ data: {} })

        wrapper.vm.totpToken = '123456'
        wrapper.vm.totpSecret = 'SECRETKEY123'

        wrapper.vm.setupTotp()

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.user.totpEnabled).toBe(true)
        expect(wrapper.vm.totpToken).toBe('')
      })

      it('should show success notification on TOTP enable', async () => {
        const { Notify } = await import('quasar')
        UserService.setupTotp.mockResolvedValue({ data: {} })

        wrapper.vm.totpToken = '123456'
        wrapper.vm.totpSecret = 'SECRETKEY123'

        wrapper.vm.setupTotp()

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'TOTP successfully enabled',
            color: 'positive'
          })
        )
      })

      it('should show error notification on TOTP setup failure', async () => {
        const { Notify } = await import('quasar')
        UserService.setupTotp.mockRejectedValue(new Error('Invalid token'))

        wrapper.vm.totpToken = '000000'
        wrapper.vm.totpSecret = 'SECRETKEY123'

        wrapper.vm.setupTotp()

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 10))

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'TOTP verification failed',
            color: 'negative'
          })
        )
      })
    })

    describe('cancelTotp', () => {
      it('should call UserService.cancelTotp with token', async () => {
        UserService.cancelTotp.mockResolvedValue({ data: {} })

        wrapper.vm.totpToken = '123456'

        wrapper.vm.cancelTotp()

        await wrapper.vm.$nextTick()

        expect(UserService.cancelTotp).toHaveBeenCalledWith('123456')
      })

      it('should set user.totpEnabled to false on success', async () => {
        UserService.cancelTotp.mockResolvedValue({ data: {} })

        wrapper.vm.user.totpEnabled = true
        wrapper.vm.totpToken = '123456'

        wrapper.vm.cancelTotp()

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.user.totpEnabled).toBe(false)
        expect(wrapper.vm.totpToken).toBe('')
      })

      it('should show success notification on TOTP disable', async () => {
        const { Notify } = await import('quasar')
        UserService.cancelTotp.mockResolvedValue({ data: {} })

        wrapper.vm.totpToken = '123456'

        wrapper.vm.cancelTotp()

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'TOTP successfully disabled',
            color: 'positive'
          })
        )
      })

      it('should show error notification on TOTP cancel failure', async () => {
        const { Notify } = await import('quasar')
        UserService.cancelTotp.mockRejectedValue(new Error('Invalid token'))

        wrapper.vm.totpToken = '000000'

        wrapper.vm.cancelTotp()

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 10))

        expect(Notify.create).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'TOTP verification failed',
            color: 'negative'
          })
        )
      })
    })
  })

  describe('cleanErrors', () => {
    it('should reset all error fields to empty strings', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      wrapper.vm.errors.username = 'Some error'
      wrapper.vm.errors.firstname = 'Some error'
      wrapper.vm.errors.lastname = 'Some error'
      wrapper.vm.errors.currentPassword = 'Some error'
      wrapper.vm.errors.newPassword = 'Some error'

      wrapper.vm.cleanErrors()

      expect(wrapper.vm.errors.username).toBe('')
      expect(wrapper.vm.errors.firstname).toBe('')
      expect(wrapper.vm.errors.lastname).toBe('')
      expect(wrapper.vm.errors.currentPassword).toBe('')
      expect(wrapper.vm.errors.newPassword).toBe('')
    })
  })

  describe('Form Data Binding', () => {
    it('should have all required data properties', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Verify data properties exist on the component
      expect('user' in wrapper.vm).toBe(true)
      expect('totpEnabled' in wrapper.vm).toBe(true)
      expect('totpQrcode' in wrapper.vm).toBe(true)
      expect('totpSecret' in wrapper.vm).toBe(true)
      expect('totpToken' in wrapper.vm).toBe(true)
      expect('errors' in wrapper.vm).toBe(true)
    })

    it('should have user data properties that match service expectations', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // After getProfile, verify user data is properly bound
      expect(wrapper.vm.user.username).toBe('testuser')
      expect(wrapper.vm.user.firstname).toBe('Test')
      expect(wrapper.vm.user.lastname).toBe('User')
      expect(wrapper.vm.user.email).toBe('test@example.com')
      expect(wrapper.vm.user.phone).toBe('1234567890')

      // Verify the service would receive correct data on update
      UserService.updateProfile.mockResolvedValue({ data: {} })
      UserService.refreshToken.mockResolvedValue()
      wrapper.vm.user.currentPassword = 'password123'

      wrapper.vm.updateProfile()

      await wrapper.vm.$nextTick()

      expect(UserService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          firstname: 'Test',
          lastname: 'User'
        })
      )
    })
  })
})
