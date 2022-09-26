<template>
<div :class="$q.dark.isActive ? '' : 'login-background'" style="height:100vh;display:flex">
    <div v-if="loaded === true" style="margin:auto">
        <q-card align="center" style="width:350px">
            <q-card-section>
                <q-img :src="$q.dark.isActive ? 'pwndoc-logo-white.png' : 'pwndoc-logo.png'" />
            </q-card-section>

            <q-card-section v-if="errors.alert">
                <q-banner rounded  class="bg-red-4 text-white">
                    <q-icon name="fa fa-exclamation-circle" class="q-pr-sm" />
                    {{errors.alert}}
                </q-banner>
            </q-card-section>

            <div v-if="init">
                <q-card-section>
                    <q-input
                    :label="$t('username')"
                    :error="!!errors.username"
                    :error-message="errors.username"
                    hide-bottom-space
                    v-model="username"
                    outlined
                    bg-color="white"
                    autofocus
                    for="username"
                    @keyup.enter="initUser()"
                    />
                </q-card-section>
                <q-card-section>
                    <q-input
                    :label="$t('firstname')"
                    :error="!!errors.firstname"
                    :error-message="errors.firstname"
                    hide-bottom-space
                    v-model="firstname"
                    outlined
                    bg-color="white"
                    @keyup.enter="initUser()"
                    />
                </q-card-section>
                <q-card-section>
                    <q-input
                    :label="$t('lastname')"
                    :error="!!errors.lastname"
                    :error-message="errors.lastname"
                    hide-bottom-space
                    v-model="lastname"
                    outlined
                    bg-color="white"
                    @keyup.enter="initUser()"
                    />
                </q-card-section>
                <q-card-section>
                    <q-input
                    ref="pwdInitRef"
                    :label="$t('password')"
                    :error="!!errors.password"
                    :error-message="errors.password"
                    hide-bottom-space
                    v-model="password"
                    outlined
                    bg-color="white"
                    type="password"
                    for="password"
                    @keyup.enter="initUser()"
                    :rules="strongPassword"
                    />
                </q-card-section>

                <q-card-section align="center">
                    <q-btn color="blue" class="full-width" unelevated no-caps @click="initUser()">{{$t('registerFirstUser')}}</q-btn>
                </q-card-section>
            </div>
            
            <div v-else>
                <q-card-section v-show="step === 0">
                    <q-input
                    :label="$t('username')"
                    :error="!!errors.username"
                    :error-message="errors.username"
                    hide-bottom-space
                    v-model="username"
                    autofocus
                    outlined
                    bg-color="white"
                    for="username"
                    @keyup.enter="getToken()"
                    :disable="loginLoading"
                    >
                        <template v-slot:prepend><q-icon name="fa fa-user" /></template>
                    </q-input>
                </q-card-section>
                <q-card-section v-show="step === 0">
                    <q-input
                    :label="$t('password')"
                    :error="!!errors.password"
                    :error-message="errors.password"
                    hide-bottom-space
                    v-model="password"
                    outlined
                    bg-color="white"
                    for="password"
                    type="password"
                    @keyup.enter="getToken()"
                    :disable="loginLoading"
                    >
                        <template v-slot:prepend><q-icon name="fa fa-key" /></template>
                    </q-input>
                </q-card-section>
                <q-card-section v-show="step === 1">
                    <q-item class="q-pl-none">
                        <q-item-section avatar style="min-width:0" class="q-pr-sm">
                            <q-btn dense flat size="sm" icon="mdi-arrow-left" style="top:-8px" @click="step=0;totpToken=''">
                            <q-tooltip>{{$t('goBack')}}</q-tooltip>
                            </q-btn>
                        </q-item-section>
                        <q-item-section>
                            <p class="text-left text-h6 text-center text-vertical">{{$t('twoStepVerification')}}</p>
                        </q-item-section>
                    </q-item>
                    <q-item class="q-pl-none">
                    <q-item-section avatar class="no-padding">
                        <q-icon name="mdi-cellphone-key" size="70px" />
                    </q-item-section>
                    <q-item-section>
                        <p>{{$t('twoStepVerificationMessage')}}</p>
                    </q-item-section>
                    </q-item>
                    <q-input
                    ref="totptoken"
                    v-model="totpToken"
                    placeholder="Enter 6-digit code"
                    outlined
                    bg-color="white"
                    for="totpToken"
                    maxlength=6
                    @keyup.enter="getToken()"
                    :disable="loginLoading"
                    >
                        <template v-slot:prepend><q-icon name="fa fa-unlock-alt" /></template>
                    </q-input>
                </q-card-section>

                <q-card-section align="center">
                    <q-btn :loading="loginLoading" color="blue" class="full-width" unelevated no-caps @click="getToken()">{{$t('login')}}</q-btn>
                </q-card-section>
            </div>
        </q-card>
    </div>
</div>
</template>

<script>
import {Loading} from 'quasar';
import UserService from '@/services/user';
import Utils from '@/services/utils'

import { $t } from '@/boot/i18n'

export default {
    data () {
        return {
            init: false,
            loaded: false,
            username: "",
            firstname: "",
            lastname: "",
            password: "",
            totpToken: "",
            step: 0,
            errors: {alert: "", username: "", password: "", firstname: "", lastname: ""},
            loginLoading: false,
            strongPassword: [Utils.strongPassword]
        }
    },

    created: function() {
        if (this.$route.query.tokenError)
            if (this.$route.query.tokenError === "2") this.errors.alert = $t('err.expiredToken');
            else this.errors.alert = $t('err.invalidToken');
        this.checkInit();
    },

    methods: {

        cleanErrors() {
            this.errors.alert = "";
            this.errors.username = "";
            this.errors.firstname = "";
            this.errors.lastname = "";
            this.errors.password = "";
        },

        checkInit() {
            Loading.show({message: $t('msg.tryingToContactBackend'), customClass: 'loading', backgroundColor: 'blue-grey-8'});
            UserService.isInit()
            .then((data) => {
                Loading.hide();
                this.loaded = true;
                this.init = data.data.datas;
            })
            .catch(err => {
                Loading.show({
                    message: `<i class='material-icons'>wifi_off</i><br /><p>${$t('msg.wrongContactingBackend')}</p>`, 
                    spinner: null, 
                    backgroundColor: 'red-10', 
                    customClass: 'loading-error'})
                console.log(err)
            })
        },

         initUser() {
            this.cleanErrors();
            if (!this.username)
                this.errors.username = $t('msg.usernameRequired');
            if (Utils.strongPassword(this.password) !== true)
                this.errors.newPassword = $t('msg.passwordComplexity')
            if (!this.password)
                this.errors.password = $t('msg.passwordRequired');
            if (!this.firstname)
                this.errors.firstname = $t('msg.firstnameRequired');
            if (!this.lastname)
                this.errors.lastname = $t('msg.lastnameRequired');

            if (this.errors.username || this.errors.password || this.errors.firstname || this.errors.lastname || !this.$refs.pwdInitRef.validate())
                return;

            UserService.initUser(this.username, this.firstname, this.lastname, this.password)
            .then(async () => {
                await this.$settings.refresh();
                this.$router.push('/');
            })
            .catch(err => {
                console.log(err)
                this.errors.alert = err.response.data.datas;
            })
        },

        getToken() {
            this.cleanErrors();
            if (!this.username)
                this.errors.username = $t('msg.usernameRequired');
            if (!this.password)
                this.errors.password = $t('msg.passwordRequired');

            if (this.errors.username || this.errors.password)
                return;

            this.loginLoading = true;
            UserService.getToken(this.username, this.password, this.totpToken)
            .then(async () => {
                await this.$settings.refresh();
                this.$router.push('/');
            })
            .catch(err => {
                if (err.response.status === 422) {
                    this.step = 1
                    this.$nextTick(() => {
                        this.$refs.totptoken.focus()
                    })
                }
                else {
                    let errmsg = $t('err.invalidCredentials');
                    if (err.response.data.datas)
                        errmsg = err.response.data.datas;
                    this.errors.alert = errmsg;
                }
            })
            .finally(() => {
                this.loginLoading = false;
            });
        }
    }
}
</script>

<style lang="stylus">
.login-background {
    background: linear-gradient(45deg, $blue, transparent)
}

.loading p {
    font-size: 20px;
}
</style>