var jwtDecode = require('jwt-decode');
import Vue from 'vue';

import { Cookies } from 'quasar'

export default {
    user: null,

    getToken(username, password) {
        return new Promise((resolve, reject) => {
            var params = {username: username, password: password};
            Vue.prototype.$axios.post(`users/token`, params)
            .then((response) => {
                var token = response.data.datas.token;
                this.user = jwtDecode(token);
                Cookies.set('token', token, {secure: true, sameSite: 'None'})
                resolve();
            })
            .catch((error) => {
                console.log(error)
                reject(error);
            })
        })
    },

    destroyToken() {
        Cookies.remove('token')
    },

    setToken(token) {
        Cookies.set('token', token, {secure: true, sameSite: 'None'})
        this.checkToken();
    },

    checkToken() {
        return new Promise((resolve, reject) => {
            if (!Cookies.has('token'))
                throw new Error('noToken');
            Vue.prototype.$axios.get(`users/checktoken`)
            .then(() => {
                var token = Cookies.get('token')
                var decoded = jwtDecode(token);
                if (decoded) {
                    this.user = decoded;
                    resolve();
                }
                else
                    reject('InvalidToken');
            })
            .catch((error) => {
                console.log(error)
                reject(error);
            })
        })
    },

    initUser(username, firstname, lastname, password) {
        return new Promise((resolve, reject) => {
            var params = {username: username, password: password, firstname: firstname, lastname: lastname};
            Vue.prototype.$axios.post(`users/init`, params)
            .then((response) => {
                var token = response.data.datas.token;
                Cookies.set('token', token, {secure: true, sameSite: 'None'})
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
        return (this.user !== null);
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

}
