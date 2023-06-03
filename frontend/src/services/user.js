var jwtDecode = require('jwt-decode');
import User from '@/services/user';

import { api } from 'boot/axios'

import { Router}  from '@/router'

export default {
    user: {
        username: "",
        role: "",
        firstname: "",
        lastname: "",
        totpEnabled: false,
        roles: ""
    },

    getToken(username, password, totpToken) {
        return new Promise((resolve, reject) => {
            var params = {username: username, password: password, totpToken: totpToken};
            api.post(`users/token`, params)
            .then((response) => {
                var token = response.data.datas.token;
                this.user = jwtDecode(token);
                resolve();
            })
            .catch((error) => {
                reject(error);
            })
        })
    },

    refreshToken() {
        return new Promise((resolve, reject) => {
            api.get('users/refreshtoken')
            .then((response) => {
                var token = response.data.datas.token;
                this.user = jwtDecode(token);
                resolve()
            })
            .catch(err => {
                if (err.response && err.response.data)
                    reject(err.response.data.datas)
                else 
                    reject('Invalid Token')
            })
        })
    },

    destroyToken() {
        api.delete('users/refreshtoken')
        .then(() => {
            User.clear()
            Router.push('/login');
        })
        .catch(err => {
            console.log(err)
        })
    },

    initUser(username, firstname, lastname, password) {
        return new Promise((resolve, reject) => {
            var params = {username: username, password: password, firstname: firstname, lastname: lastname};
            api.post(`users/init`, params)
            .then((response) => {
                var token = response.data.datas.token;
                this.user = jwtDecode(token);
                resolve();
            })
            .catch((error) => {
                console.log(error)
                reject(error);
            })
        })
    },

    isInit() {
        return (api.get(`users/init`, {timeout: 10000}));
    },

    isAuth() {
        if (this.user && this.user.username)
            return true
        return false
    },

    // Reset user variable to default empty
    clear() {
        this.user = {
            username: "",
            role: "",
            firstname: "",
            lastname: "",
            roles: ""
        }
    },

    isAllowed(role) {
        return (this.user.roles && (this.user.roles.includes(role) || this.user.roles === '*'))
    },

    getProfile: function() {
        return api.get(`users/me`);
    },

    updateProfile: function(user) {
        return api.put(`users/me`, user);
    },

    getTotpQrCode: function() {
        return api.get(`users/totp`);
    },

    setupTotp: function(totpToken, totpSecret) {
        return api.post(`users/totp`,{totpToken: totpToken, totpSecret: totpSecret});
    },

    cancelTotp: function(totpToken) {
        return api.delete(`users/totp`,{data: {totpToken: totpToken}});
    },

}
