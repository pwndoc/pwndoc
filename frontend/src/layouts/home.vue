<template>
  <q-layout ref="layout" view="hHr LpR lFf" :class="$q.dark.isActive ? '' : 'home-background'">
    <q-header>
        <q-toolbar class="bg-fixed-primary">
            <img src="/pwndoc-logo-white.png" style="max-height:50px;" />
            
            <q-item to='/audits' active-class="text-green">
            <q-item-section avatar style="min-width:0" class="q-pr-sm">
                <q-icon name="fa fa-fingerprint" />
            </q-item-section>
            <q-item-section>{{$t('nav.audits')}}</q-item-section>
            </q-item>

            <q-item to='/vulnerabilities' active-class="text-green">
            <q-item-section avatar style="min-width:0" class="q-pr-sm">
                <q-icon name="fa fa-shield-alt" />
            </q-item-section>
            <q-item-section>{{$t('nav.vulnerabilities')}}</q-item-section>
            </q-item>

            <q-item to='/data' active-class="text-green">
            <q-item-section avatar style="min-width:0" class="q-pr-sm">
                <q-icon name="fa fa-database" />
            </q-item-section>
            <q-item-section>{{$t('nav.data')}}</q-item-section>
            </q-item>

            <q-space />

              <q-item to='/settings' active-class="text-green">
              <q-item-section avatar style="min-width:0" class="q-pr-sm">
                  <q-icon name="fa fa-cog" />
              </q-item-section>
              <q-item-section>{{$t('settings')}}</q-item-section>
              </q-item>
            <q-btn-dropdown auto-close flat icon="fa fa-user-circle" no-caps :label="userStore.username">
                <q-list>
                  <q-item clickable @click="$toggleDarkMode()">
                    <q-item-section side><q-icon size="xs" :name="$q.dark.isActive ? 'fa fa-sun' : 'fa fa-moon'" /></q-item-section>
                    <q-item-section>{{ $q.dark.isActive ? 'Light' : 'Dark'}}-Mode</q-item-section>
                  </q-item>
                  <q-item clickable @click="$router.push('/profile')">
                    <q-item-section side><q-icon size="xs" name="fa fa-id-card" /></q-item-section>
                    <q-item-section>{{$t('profile')}}</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item clickable @click="logout()">
                    <q-item-section side><q-icon size="xs" name="fa fa-sign-out-alt" /></q-item-section>
                    <q-item-section>{{$t('logout')}}</q-item-section>
                  </q-item>
                </q-list>
            </q-btn-dropdown>
        </q-toolbar>      
    </q-header>
    <q-page-container>
        <router-view :key="$route.params.auditId"/> 
    </q-page-container>
  </q-layout>
</template>

<script>
import { useUserStore } from '@/stores/user';
import UserService from '@/services/user';

const userStore = useUserStore();

export default {
  name: 'LayoutHome',
  data () {
    return {
      userStore: userStore
    }
  },

  methods: {
    logout: function() {
        UserService.destroyToken();
    }
  }
}
</script>

<style scoped>
.home-background {
    background-color: #e6ecf0;
}
</style>
