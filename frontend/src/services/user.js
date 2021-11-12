var jwtDecode = require('jwt-decode');
import Vue from 'vue';
import User from '@/services/user';

import Router from '@/router'

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
            Vue.prototype.$axios.post(`users/token`, params)
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
            Vue.prototype.$axios.get('users/refreshtoken')
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
        Vue.prototype.$axios.delete('users/refreshtoken')
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
            Vue.prototype.$axios.post(`users/init`, params)
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
        return (Vue.prototype.$axios.get(`users/init`, {timeout: 10000}));
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
        return Vue.prototype.$axios.get(`users/me`);
    },

    updateProfile: function(user) {
        return Vue.prototype.$axios.put(`users/me`, user);
    },

    getTotpQrCode: function() {
        return Vue.prototype.$axios.get(`users/totp`);
    },

    setupTotp: function(totpToken, totpSecret) {
        return Vue.prototype.$axios.post(`users/totp`,{totpToken: totpToken, totpSecret: totpSecret});
    },

    cancelTotp: function(totpToken) {
        return Vue.prototype.$axios.delete(`users/totp`,{data: {totpToken: totpToken}});
    },

}
