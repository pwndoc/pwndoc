<template>
<div>
    <q-drawer side="left" :model-value="true" :mini="miniState" @mouseover="miniState = false" @mouseout="miniState = true">
        <q-list class="home-drawer">
            <q-item to='/data/collaborators'>
                <q-item-section avatar>
                    <q-icon name="fa fa-users" />
                </q-item-section>
                <q-item-section>{{this.$t('collaborators')}}</q-item-section>
            </q-item>
            <q-item to='/data/companies'>
                <q-item-section avatar>
                    <q-icon name="fa fa-building" />
                </q-item-section>
                <q-item-section>{{this.$t('companies')}}</q-item-section>
            </q-item>
            <q-item to='/data/clients'>
                <q-item-section avatar>
                    <q-icon name="fa fa-user-tie" />
                </q-item-section>
                <q-item-section>{{this.$t('clients')}}</q-item-section>
            </q-item>
            <q-item to='/data/templates'>
                <q-item-section avatar>
                    <q-icon name="fa fa-file-word" />
                </q-item-section>
                <q-item-section>{{this.$t('templates')}}</q-item-section>
            </q-item>

            <q-separator spaced />

            <q-item to='/data/custom'>
                <q-item-section avatar>
                    <q-icon name="fa fa-table" />
                </q-item-section>
                <q-item-section>{{this.$t('customData')}}</q-item-section>
            </q-item>
            <q-item to='/data/dump'>
                <q-item-section avatar>
                    <q-icon name="fa fa-archive" />
                </q-item-section>
                <q-item-section>{{this.$t('import')}} / {{this.$t('export')}}</q-item-section>
            </q-item>
        </q-list>
    </q-drawer>
    <router-view />     
</div>
</template>

<script>
import Breadcrumb from 'components/breadcrumb'
import UserService from '@/services/user'

import { ref } from 'vue'

export default {
    setup () {
        return {
            miniState: ref(true)
        }
    },
    data: () => {
        return {
            UserService: UserService
        }
    },

    components: {
        Breadcrumb
    }
}
</script>

