<template>
  <q-layout ref="layout" view="hHr LpR lFf" class="home-background">
    <q-header>
        <q-toolbar color="primary">
            <div class="text-h5 q-mr-sm">PwnDoc</div>
            
            <q-separator vertical dark spaced />

            <q-item to='/audits' active-class="text-green">
            <q-item-section avatar style="min-width:0" class="q-pr-sm">
                <q-icon name="fa fa-fingerprint" />
            </q-item-section>
            <q-item-section>Audits</q-item-section>
            </q-item>

            <q-item to='/vulnerabilities' active-class="text-green">
            <q-item-section avatar style="min-width:0" class="q-pr-sm">
                <q-icon name="fa fa-shield-alt" />
            </q-item-section>
            <q-item-section>Vulnerabilities</q-item-section>
            </q-item>

            <q-item to='/datas' active-class="text-green">
            <q-item-section avatar style="min-width:0" class="q-pr-sm">
                <q-icon name="fa fa-database" />
            </q-item-section>
            <q-item-section>Datas</q-item-section>
            </q-item>

            <q-space />

            <q-btn-dropdown auto-close flat icon="fa fa-user-circle" no-caps :label="userService.user.username">
                <q-list>
                  <q-item clickable @click="$router.push('/profile')">
                    <q-item-section side><q-icon size="xs" name="fa fa-id-card" /></q-item-section>
                    <q-item-section>Profile</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item clickable @click="logout()">
                    <q-item-section side><q-icon size="xs" name="fa fa-sign-out-alt" /></q-item-section>
                    <q-item-section>Logout</q-item-section>
                  </q-item>
                </q-list>
            </q-btn-dropdown>
        </q-toolbar>      
    </q-header>
    <q-page-container>
        <router-view /> 
    </q-page-container>
  </q-layout>
</template>

<script>
import UserService from '@/services/user';

export default {
  name: 'LayoutHome',
  data () {
    return {
      userService: UserService
    }
  },

    methods: {
        logout: function() {
            UserService.destroyToken();
            this.$router.push('/login');
        }
    }
}
</script>

<style lang="stylus" scoped>
.home-background {
    background-color: #e6ecf0;
}
</style>
