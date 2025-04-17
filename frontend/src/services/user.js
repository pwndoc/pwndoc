import { useUserStore } from 'src/stores/user'
import jwtDecode from 'jwt-decode';
import { api } from 'boot/axios'

const userStore = useUserStore()

export default {
    getToken(username, password, totpToken) {
        return new Promise((resolve, reject) => {
            var params = {username: username, password: password, totpToken: totpToken};
            api.post(`users/token`, params)
            .then((response) => {
                var token = response.data.datas.token;
                userStore.setUser(jwtDecode(token));
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
                userStore.setUser(jwtDecode(token));
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
            userStore.clearUser()
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

    isAllowed(role) {
        return (this.user.roles && (this.user.roles.includes(role) || this.user.roles.includes(`${role}-all`) || this.user.roles === '*'))
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
