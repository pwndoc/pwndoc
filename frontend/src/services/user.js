var jwtDecode = require('jwt-decode');
import Vue from 'vue';

export default {
    user: null,

    getToken(username, password) {
        return new Promise((resolve, reject) => {
            var params = {username: username, password: password};
            Vue.prototype.$axios.post(`users/token`, params)
            .then((response) => {
                var token = response.data.datas.token;
                localStorage.setItem('token', token);
                this.user = jwtDecode(token);
                // Vue.prototype.$axios.headers.common['Authorization'] = `JWT ${token}`;
                resolve();
            })
            .catch((error) => {
                console.log(error)
                reject(error);
            })
        })
    },

    destroyToken() {
        localStorage.removeItem('token');
    },

    setToken(token) {
        localStorage.setItem('token', token);
        this.checkToken();
    },

    checkToken() {
        return new Promise((resolve, reject) => {
            var token = localStorage.getItem('token');
            if (!token)
                throw new Error('noToken');
            //Set Authorization headers each time for hot reload
            Vue.prototype.$axios.defaults.headers.common['Authorization'] = token;
            Vue.prototype.$axios.get(`users/checktoken`)
            .then(() => {
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
                localStorage.setItem('token', token);
                this.user = jwtDecode(token);
                // Vue.prototype.$axios.headers.common['Authorization'] = `JWT ${token}`;
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

    isAdmin() {
        return (this.user && this.user.role && this.user.role === "admin");
    },

    getProfile: function() {
        return Vue.prototype.$axios.get(`users/me`);
    },

    updateProfile: function(user) {
        return Vue.prototype.$axios.put(`users/me`, user);
    },

}
