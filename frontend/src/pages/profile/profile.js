import { Dialog, Notify } from 'quasar'
import Vue from 'vue'

import UserService from '@/services/user'
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
            errors: {username: "", firstname:"", lastname: "", currentPassword: "", newPassword: ""}
        }
    },

    mounted: function() {
        this.getProfile();
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
            if (Utils.strongPassword(this.user.newPassword) !== true)
                this.errors.newPassword = $t('msg.passwordComplexity')
            if (this.user.newPassword !== this.user.confirmPassword)
                this.errors.newPassword = $t('msg.confirmPasswordDifferents');
            
            
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
        }
    }
}