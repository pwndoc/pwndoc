import { Dialog, Notify } from 'quasar'
import Vue from 'vue'

import UserService from '@/services/user'

import { $t } from 'boot/i18n'

import LanguageSelector from '@/components/language-selector';

export default {
    data: () => {
        return {
            user: {},
            totpSetupPane: false,
            totpCancelPane: false,
            totpEnabled: false,
            totpQrcode: "",
            totpSecret: "",
            totpToken: "",
            errors: {username: "", firstname:"", lastname: "", currentPassword: "", newPassword: "", email:"", phone:""}
        }
    },

    components: {
        LanguageSelector
    },
    
    mounted: function() {
        this.getProfile();
    },

    methods: {
        getProfile: function() {
            UserService.getProfile()
            .then((data) => {
                this.user = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        getTotpQrcode: function() {
            if(this.totpEnabled===true){
                UserService.getTotpQrCode()
                .then((data)=>{
                    let res = data.data.datas;
                    this.totpQrcode = res.totpQrCode;
                    this.totpSecret = res.totpSecret;
                    this.totpSetupPane = true;
                })
                .catch((err)=>{
                    console.log(err);
                })
            } else {
                this.totpQrcode = "";
                this.totpSecret = "";
                this.totpSetupPane = false;
            }
        },

        setupTotp: function() {
            UserService.setupTotp(this.totpToken, this.totpSecret)
            .then((data)=>{
                this.user.totpEnabled = true;
                Notify.create({
                    message: $t('msg.totpSetupOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err)=>{
                Notify.create({
                    message: $t('msg.totpVerifyFailed'),
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        cancelTotp: function() {
            if(!confirm($t('msg.totpCancelConfirm'))){
                return;
            }
            UserService.cancelTotp(this.totpToken)
            .then(()=>{
                this.user.totpEnabled = false;
                this.totpEnabled = false;
                this.totpSetupPane = false;
                this.totpCancelPane = false;
                Notify.create({
                    message: $t('totpCancelOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch(()=>{
                Notify.create({
                    message: $t('msg.totpVerifyFailed'),
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
            this.errors.email = '';
            this.errors.phone = '';
            this.errors.currentPassword = '';
            this.errors.newPassword = '';
        }
    }
}