<template>
  <q-layout ref="layout" view="hHh LpR fff">
    <q-header class="main-header" :class="$q.dark.isActive ? 'bg-dark' : 'bg-white text-dark'">
        <q-toolbar>
            <img :src="$q.dark.isActive ? '/pwndoc-logo-white.png' : '/pwndoc-logo.png'" style="max-height:36px;" />

            <q-space />

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

    <q-drawer show-if-above bordered :width="72" class="main-nav-rail" :class="$q.dark.isActive ? 'bg-dark' : 'bg-white'">
        <q-list class="q-pt-md" data-testid="main-nav">
            <q-item to='/audits' v-ripple :aria-label="$t('nav.audits')">
                <q-tooltip anchor="center right" self="center left">{{$t('nav.audits')}}</q-tooltip>
                <q-item-section avatar class="justify-center">
                    <q-icon name="fa fa-fingerprint" />
                </q-item-section>
            </q-item>

            <q-item to='/vulnerabilities' v-ripple :aria-label="$t('nav.vulnerabilities')">
                <q-tooltip anchor="center right" self="center left">{{$t('nav.vulnerabilities')}}</q-tooltip>
                <q-item-section avatar class="justify-center">
                    <q-icon name="fa fa-shield-alt" />
                </q-item-section>
            </q-item>

            <q-item to='/data' v-ripple :aria-label="$t('nav.data')">
                <q-tooltip anchor="center right" self="center left">{{$t('nav.data')}}</q-tooltip>
                <q-item-section avatar class="justify-center">
                    <q-icon name="fa fa-database" />
                </q-item-section>
            </q-item>

            <q-separator class="q-my-sm" />

            <q-item to='/settings' v-ripple :aria-label="$t('settings')">
                <q-tooltip anchor="center right" self="center left">{{$t('settings')}}</q-tooltip>
                <q-item-section avatar class="justify-center">
                    <q-icon name="fa fa-cog" />
                </q-item-section>
            </q-item>
        </q-list>
    </q-drawer>

    <q-page-container :class="$q.dark.isActive ? '' : 'bg-page-light'">
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
.bg-page-light {
    background-color: #F5F6FA;
}
</style>
