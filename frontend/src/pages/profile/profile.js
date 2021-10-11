import { Dialog, Notify } from 'quasar'
import Vue from 'vue'

import UserService from '@/services/user'

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
                    message: 'TOTP setup successful.',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err)=>{
                Notify.create({
                    message: 'TOTP verify failed',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        cancelTotp: function() {
            if(!confirm('TOTP is protecting your account !\nAre you sure you want to cancel TOTP ?')){
                return;
            }
            UserService.cancelTotp(this.totpToken)
            .then(()=>{
                this.user.totpEnabled = false;
                this.totpEnabled = false;
                this.totpSetupPane = false;
                this.totpCancelPane = false;
                Notify.create({
                    message: 'TOTP was canceled.',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch(()=>{
                Notify.create({
                    message: 'TOTP verify failed',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        updateProfile: function() {
            this.cleanErrors();
            if (!this.user.username)
                this.errors.username = "Username required";
            if (!this.user.firstname)
                this.errors.firstname = "Firstname required";
            if (!this.user.lastname)
                this.errors.lastname = "Lastname required";
            if (!this.user.currentPassword)
                this.errors.currentPassword = "Current Password required";
            if (this.user.newPassword !== this.user.confirmPassword)
                this.errors.newPassword = "New Password and Confirm Password are differents";
            
            if (this.errors.username || this.errors.firstname || this.errors.lastname || this.errors.currentPassword || this.errors.newPassword)
                return;

            UserService.updateProfile(this.user)
            .then((data) => {
                UserService.refreshToken()
                Notify.create({
                    message: 'Profile updated successfully',
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