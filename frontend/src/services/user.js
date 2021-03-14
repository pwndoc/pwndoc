var jwtDecode = require('jwt-decode');
import Vue from 'vue';

import Router from '../router'

export default {
    user: null,

    getToken(username, password) {
        return new Promise((resolve, reject) => {
            var params = {username: username, password: password};
            Vue.prototype.$axios.post(`users/token`, params)
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

    destroyToken() {
        Vue.prototype.$axios.get('users/destroytoken')
        .then(() => {
            Router.push('/login');
        })
        .catch(err => console.log(err))
    },

    checkToken() {
        return new Promise((resolve, reject) => {
            Vue.prototype.$axios.get(`users/checktoken`)
            .then(data => {
                var token = data.data.datas
                var decoded = jwtDecode(token);
                if (decoded) {
                    this.user = decoded;
                    resolve();
                }
                else
                    reject('InvalidToken');
                resolve()
            })
            .catch((error) => {
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
