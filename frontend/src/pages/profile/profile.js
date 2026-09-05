import { Notify, Dialog, copyToClipboard } from 'quasar'
import UserService from '@/services/user'
import ApiKeyService from '@/services/api-key'
import Utils from '@/services/utils'

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
            showCreateApiKeyModal: false,
            showKeyDisplayModal: false,
            createdApiKey: '',
            newApiKey: { name: '', expirationDays: 90 },
            apiKeyErrors: { name: '' },
            expirationOptions: [
                { label: '30 days', value: 30 },
                { label: '60 days', value: 60 },
                { label: '90 days', value: 90 },
                { label: '1 year', value: 365 },
                { label: 'Never', value: 0 }
            ],
            apiKeyColumns: [
                { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
                { name: 'prefix', label: 'Key', field: 'prefix', align: 'left' },
                { name: 'createdAt', label: 'Created', field: row => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '', align: 'left', sortable: true },
                { name: 'lastUsed', label: 'Last Used', field: row => row.lastUsed ? new Date(row.lastUsed).toLocaleDateString() : 'Never', align: 'left', sortable: true },
                { name: 'expiresAt', label: 'Expires', field: row => row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : 'Never', align: 'left', sortable: true },
                { name: 'enabled', label: 'Status', field: 'enabled', align: 'center' },
                { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
            ]
        }
    },

    mounted: function() {
        this.getProfile();
        this.getApiKeys();
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
        getApiKeys: function() {
            this.loadingApiKeys = true;
            ApiKeyService.getApiKeys()
            .then((res) => {
                this.apiKeys = res.data.datas || [];
                this.loadingApiKeys = false;
            })
            .catch((err) => {
                this.loadingApiKeys = false;
                console.error(err);
            });
        },

        createApiKey: function() {
            this.apiKeyErrors.name = '';
            if (!this.newApiKey.name || !this.newApiKey.name.trim()) {
                this.apiKeyErrors.name = $t('apiKeys.nameRequired');
                return;
            }

            let expiresAt = null;
            if (this.newApiKey.expirationDays > 0) {
                expiresAt = new Date(Date.now() + this.newApiKey.expirationDays * 86400000).toISOString();
            }

            ApiKeyService.createApiKey({
                name: this.newApiKey.name.trim(),
                expiresAt: expiresAt
            })
            .then((res) => {
                this.createdApiKey = res.data.datas.apiKey;
                this.showCreateApiKeyModal = false;
                this.showKeyDisplayModal = true;
                this.newApiKey = { name: '', expirationDays: 90 };
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
                    message: err.response && err.response.data && err.response.data.datas ? err.response.data.datas : 'Failed to create API key',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                });
            });
        },

        copyApiKey: function() {
            copyToClipboard(this.createdApiKey)
            .then(() => {
                Notify.create({
                    message: $t('apiKeys.copied'),
                    color: 'positive',
                    textColor: 'white',
                    position: 'top-right'
                });
            })
            .catch(() => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(this.createdApiKey);
                }
            });
        },

        toggleApiKey: function(row) {
            ApiKeyService.toggleApiKey(row._id)
            .then(() => {
                Notify.create({
                    message: $t('apiKeys.statusUpdatedOk'),
                    color: 'positive',
                    textColor: 'white',
                    position: 'top-right'
                });
            })
            .catch(() => {
                row.enabled = !row.enabled;
                Notify.create({
                    message: 'Failed to update API key status',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                });
            });
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
                        message: 'Failed to revoke API key',
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    });
                });
            });
        }
    }
}