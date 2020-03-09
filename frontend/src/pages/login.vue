<template>
<div style="height:100vh;display:flex">
    <div v-if="loaded === true" style="margin:auto">
        <q-banner rounded v-if="errors.alert" class="bg-red-4 text-white">
            <q-icon name="fa fa-exclamation-circle" />
            {{errors.alert}}
        </q-banner>
        <q-card v-show="init === true" align="center" style="width:350px">
            <q-card-section>
                PwnDoc Initialization, Register first User
            </q-card-section>

            <q-separator />

            <q-card-section>
                <q-input
                label="Username"
                :error="!!errors.username"
                :error-message="errors.username"
                hide-bottom-space
                v-model="username"
                autofocus
                @keyup.enter="initUser()"
                />
            </q-card-section>
            <q-card-section>
                <q-input
                label="Firstname"
                :error="!!errors.firstname"
                :error-message="errors.firstname"
                hide-bottom-space
                v-model="firstname"
                @keyup.enter="initUser()"
                />
            </q-card-section>
            <q-card-section>
                <q-input
                label="Lastname"
                :error="!!errors.lastname"
                :error-message="errors.lastname"
                hide-bottom-space
                v-model="lastname"
                @keyup.enter="initUser()"
                />
            </q-card-section>
            <q-card-section>
                <q-input
                label="Password"
                :error="!!errors.password"
                :error-message="errors.password"
                hide-bottom-space
                v-model="password"
                type="password"
                @keyup.enter="initUser()"
                />
            </q-card-section>

            <q-separator />
            
            <q-card-actions align="center">
                <q-btn color="secondary" @click="initUser()">Create First User</q-btn>
            </q-card-actions>
        </q-card>
        <q-card v-show="init === false" align="center" style="width:350px">
            <q-card-section>
                PwnDoc Login
            </q-card-section>

            <q-separator />

            <q-card-section>
                <q-input
                label="Username"
                :error="!!errors.username"
                :error-message="errors.username"
                v-model="username"
                autofocus
                @keyup.enter="getToken()"
                >
                    <template v-slot:prepend><q-icon name="fa fa-user" /></template>
                </q-input>
            </q-card-section>
            <q-card-section>
                <q-input
                label="Password"
                :error="!!errors.password"
                :error-message="errors.password"
                v-model="password"
                type="password"
                @keyup.enter="getToken()"
                >
                    <template v-slot:prepend><q-icon name="fa fa-key" /></template>
                </q-input>
            </q-card-section>

            <q-separator />
            
            <q-card-actions align="center">
                <q-btn color="secondary" @click="getToken()">Login</q-btn>
            </q-card-actions>
        </q-card>
    </div>
</div>
</template>

<script>
import {Loading} from 'quasar';
import UserService from '@/services/user';

export default {
    data () {
        return {
            init: false,
            loaded: false,
            username: "",
            firstname: "",
            lastname: "",
            password: "",
            errors: {alert: "", username: "", password: "", firstname: "", lastname: ""}
        }
    },

    created: function() {
        if (this.$route.query.tokenError)
            if (this.$route.query.tokenError === "2") this.errors.alert = "Expired token";
            else this.errors.alert = "Invalid token";
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
            Loading.show({message: '<p>Trying to contact backend</p>', customClass: 'loading', backgroundColor: 'blue-grey-8'});
            UserService.isInit()
            .then((data) => {
                Loading.hide();
                this.loaded = true;
                this.init = data.data.datas;
            })
            .catch(err => {
                Loading.show({
                    message: "<i class='material-icons'>wifi_off</i><br /><p>Something went wrong contacting backend</p>", 
                    spinner: null, 
                    backgroundColor: 'red-10', 
                    customClass: 'loading-error'})
                console.log(err)
            })
        },

         initUser() {
            this.cleanErrors();
            if (!this.username)
                this.errors.username = "Username required";
            if (!this.password)
                this.errors.password = "Password required";
            if (!this.firstname)
                this.errors.firstname = "Firstname required";
            if (!this.lastname)
                this.errors.lastname = "Lastname required";

            if (this.errors.username || this.errors.password || this.errors.firstname || this.errors.lastname)
                return;

            UserService.initUser(this.username, this.firstname, this.lastname, this.password)
            .then(() => {
                this.$router.push('/');
            })
            .catch(err => {
                console.log(err)
                this.errors.alert = "Invalid credentials";
            })
        },

        getToken() {
            this.cleanErrors();
            if (!this.username)
                this.errors.username = "Username required";
            if (!this.password)
                this.errors.password = "Password required";

            if (this.errors.username || this.errors.password)
                return;

            UserService.getToken(this.username, this.password)
            .then(() => {
                this.$router.push('/');
            })
            .catch(err => {
                this.errors.alert = "Invalid credentials";
            })
        }
    }
}
</script>

<style lang="stylus">
.login-background {
    background-color: #e6ecf0;
}

.loading p {
    font-size: 20px;
}

.loading-error .material-icons {
    font-size: 100px;
}

.loading-error p {
    font-size: 20px;
}

.loading-error:before {
    opacity: 0.7;
}
</style>