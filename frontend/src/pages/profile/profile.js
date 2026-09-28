import { Notify, Dialog, copyToClipboard } from 'quasar'
import UserService from '@/services/user'
import ApiKeyService from '@/services/api-key'
import Utils from '@/services/utils'
import { useUserStore } from '@/stores/user'

import { $t } from 'boot/i18n'

export default {
    data: () => {
        return {
            user: {},
            totpEnabled: false,
            totpQrcode: "",
            totpSecret: "",
            totpToken: "",
            errors: {username: "", firstname:"", lastname: "", currentPassword: "", newPassword: ""},

            // API Keys
            apiKeys: [],
            loadingApiKeys: false,
            creatingApiKey: false,
            updatingApiKeys: [],
            showCreateApiKeyModal: false,
            showKeyDisplayModal: false,
            createdApiKey: '',
            newApiKey: { name: '', expirationDays: 90, roles: [] },
            apiKeyErrors: { name: '', roles: '' },
            expirationOptions: [
                { label: $t('apiKeys.days30'), value: 30 },
                { label: $t('apiKeys.days60'), value: 60 },
                { label: $t('apiKeys.days90'), value: 90 },
                { label: $t('apiKeys.year'), value: 365 },
                { label: $t('apiKeys.never'), value: 0 }
            ],
            apiKeyColumns: [
                { name: 'name', label: $t('apiKeys.name'), field: 'name', align: 'left', sortable: true },
                { name: 'prefix', label: $t('apiKeys.key'), field: 'prefix', align: 'left' },
                { name: 'roles', label: $t('roles'), field: 'roles', align: 'left' },
                { name: 'createdAt', label: $t('apiKeys.created'), field: row => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '', align: 'left', sortable: true },
                { name: 'lastUsed', label: $t('apiKeys.lastUsed'), field: row => row.lastUsed ? new Date(row.lastUsed).toLocaleDateString() : $t('apiKeys.never'), align: 'left', sortable: true },
                { name: 'expiresAt', label: $t('apiKeys.expires'), field: row => row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : $t('apiKeys.never'), align: 'left', sortable: true },
                { name: 'enabled', label: $t('apiKeys.status'), field: 'enabled', align: 'center' },
                { name: 'actions', label: $t('apiKeys.actions'), field: 'actions', align: 'center' }
            ]
        }
    },

    computed: {
        userStore: () => useUserStore(),
        availableApiKeyRoles: function() {
            const roles = Array.isArray(this.user.roles) && this.user.roles.length
                ? this.user.roles
                : (this.userStore.roles || [])
            return [...new Set(roles)].map(role => ({ label: role, value: role }))
        }
    },

    mounted: function() {
        this.getProfile();
        if (this.userStore.isAllowed('apikeys:read')) this.getApiKeys();
    },

    methods: {
        getProfile: function() {
            UserService.getProfile()
            .then((data) => {
                this.user = data.data.datas;
                this.totpEnabled = this.user.totpEnabled;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        getTotpQrcode: function() {
            if(this.totpEnabled && !this.user.totpEnabled){
                UserService.getTotpQrCode()
                .then((data)=>{
                    let res = data.data.datas;
                    this.totpQrcode = res.totpQrCode;
                    this.totpSecret = res.totpSecret;
                    this.$refs.totpEnableInput.focus();
                })
                .catch((err)=>{
                    console.log(err);
                })
            }
            else if (!this.totpEnabled && this.user.totpEnabled) {
                this.$nextTick(() => {this.$refs.totpDisableInput.focus()})
            }
            else {
                this.totpQrcode = "";
                this.totpSecret = "";
                this.totpToken = "";
            }
        },

        setupTotp: function() {
            UserService.setupTotp(this.totpToken, this.totpSecret)
            .then((data)=>{
                this.user.totpEnabled = true;
                this.totpToken = "";
                Notify.create({
                    message: 'TOTP successfully enabled',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err)=>{
                Notify.create({
                    message: 'TOTP verification failed',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        cancelTotp: function() {
            UserService.cancelTotp(this.totpToken)
            .then(()=>{
                this.user.totpEnabled = false;
                this.totpToken = "";
                Notify.create({
                    message: 'TOTP successfully disabled',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch(()=>{
                Notify.create({
                    message: 'TOTP verification failed',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        updateProfile: function() {
            this.cleanErrors();
            if (!this.user.username)
                this.errors.username = $t('msg.usernameRequired');
            if (!this.user.firstname)
                this.errors.firstname = $t('msg.firstnameRequired');
            if (!this.user.lastname)
                this.errors.lastname = $t('msg.lastnameRequired');
            if (!this.user.currentPassword)
                this.errors.currentPassword = $t('msg.currentPasswordRequired');
            if (this.user.newPassword !== this.user.confirmPassword)
                this.errors.newPassword = $t('msg.confirmPasswordDifferents');
            if (this.user.newPassword && Utils.strongPassword(this.user.newPassword) !== true)
                this.errors.newPassword = $t('msg.passwordComplexity')
            
            if (this.errors.username || this.errors.firstname || this.errors.lastname || this.errors.currentPassword || this.errors.newPassword)
                return;

            UserService.updateProfile(this.user)
            .then((data) => {
                UserService.refreshToken()
                Notify.create({
                    message: $t('msg.profileUpdateOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        cleanErrors: function() {
            this.errors.username = '';
            this.errors.firstname = '';
            this.errors.lastname = '';
            this.errors.currentPassword = '';
            this.errors.newPassword = '';
        },

        // API Keys Management Methods
        openCreateApiKey: function() {
            this.apiKeyErrors = { name: '', roles: '' };
            const roles = this.availableApiKeyRoles.map(option => option.value);
            this.newApiKey = { name: '', expirationDays: 90, roles: [...roles] };
            this.showCreateApiKeyModal = true;
        },

        getApiKeys: function() {
            this.loadingApiKeys = true;
            return ApiKeyService.getApiKeys()
            .then((res) => {
                this.apiKeys = res.data.datas || [];
                this.loadingApiKeys = false;
            })
            .catch((err) => {
                this.loadingApiKeys = false;
                Notify.create({ message: $t('apiKeys.loadFailed'), color: 'negative', position: 'top-right' });
            });
        },

        createApiKey: function() {
            if (this.creatingApiKey) return;
            this.apiKeyErrors = { name: '', roles: '' };
            if (!this.newApiKey.name || !this.newApiKey.name.trim()) {
                this.apiKeyErrors.name = $t('apiKeys.nameRequired');
                return;
            }
            const allowedRoles = this.availableApiKeyRoles.map(option => option.value);
            const roles = [...new Set((this.newApiKey.roles || []).filter(role => allowedRoles.includes(role)))];
            if (!roles.length) {
                this.apiKeyErrors.roles = $t('apiKeys.rolesRequired');
                return;
            }

            let expiresAt = null;
            if (this.newApiKey.expirationDays > 0) {
                expiresAt = new Date(Date.now() + this.newApiKey.expirationDays * 86400000).toISOString();
            }

            this.creatingApiKey = true;
            return ApiKeyService.createApiKey({
                name: this.newApiKey.name.trim(),
                expiresAt: expiresAt,
                roles
            })
            .then((res) => {
                this.createdApiKey = res.data.datas.apiKey;
                this.showCreateApiKeyModal = false;
                this.showKeyDisplayModal = true;
                this.newApiKey = { name: '', expirationDays: 90, roles: [] };
                this.getApiKeys();
                Notify.create({
                    message: $t('apiKeys.createdOk'),
                    color: 'positive',
                    textColor: 'white',
                    position: 'top-right'
                });
            })
            .catch((err) => {
                Notify.create({
                    message: err.response && err.response.data && err.response.data.datas ? err.response.data.datas : $t('apiKeys.createFailed'),
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                });
            }).finally(() => { this.creatingApiKey = false; });
        },

        copyApiKey: function() {
            return copyToClipboard(this.createdApiKey)
            .then(() => {
                Notify.create({
                    message: $t('apiKeys.copied'),
                    color: 'positive',
                    textColor: 'white',
                    position: 'top-right'
                });
            })
            .catch(() => {
                Notify.create({ message: $t('apiKeys.copyFailed'), color: 'negative', position: 'top-right' });
            });
        },

        toggleApiKey: function(row) {
            if (this.updatingApiKeys.includes(row._id)) return;
            this.updatingApiKeys.push(row._id);
            return ApiKeyService.toggleApiKey(row._id)
            .then((res) => {
                row.enabled = res.data.datas.enabled;
                Notify.create({
                    message: $t('apiKeys.statusUpdatedOk'),
                    color: 'positive',
                    textColor: 'white',
                    position: 'top-right'
                });
            })
            .catch(() => {
                Notify.create({
                    message: $t('apiKeys.updateFailed'),
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                });
            }).finally(() => { this.updatingApiKeys = this.updatingApiKeys.filter(id => id !== row._id); });
        },

        confirmRevokeApiKey: function(row) {
            Dialog.create({
                title: $t('apiKeys.confirmRevokeTitle'),
                message: $t('apiKeys.confirmRevokeMsg'),
                ok: { color: 'negative', label: $t('btn.delete') },
                cancel: { flat: true, color: 'grey-7', label: $t('btn.cancel') }
            })
            .onOk(() => {
                ApiKeyService.deleteApiKey(row._id)
                .then(() => {
                    this.getApiKeys();
                    Notify.create({
                        message: $t('apiKeys.revokedOk'),
                        color: 'positive',
                        textColor: 'white',
                        position: 'top-right'
                    });
                })
                .catch(() => {
                    Notify.create({
                        message: $t('apiKeys.revokeFailed'),
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    });
                });
            });
        }
    }
}
