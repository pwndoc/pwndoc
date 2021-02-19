<template>
<div>
    <q-drawer side="left" :value="true">
        <q-list class="home-drawer">
            <q-item-label header>Handle Audit Data</q-item-label>
        
            <q-separator spaced />
        
            <q-item to='/datas/collaborators'>
                <q-item-section avatar>
                    <q-icon name="fa fa-users" />
                </q-item-section>
                <q-item-section>Collaborators</q-item-section>
            </q-item>
            <q-item to='/datas/companies'>
                <q-item-section avatar>
                    <q-icon name="fa fa-building" />
                </q-item-section>
                <q-item-section>Companies</q-item-section>
            </q-item>
            <q-item to='/datas/clients'>
                <q-item-section avatar>
                    <q-icon name="fa fa-user-tie" />
                </q-item-section>
                <q-item-section>Clients</q-item-section>
            </q-item>
            <q-item to='/datas/templates'>
                <q-item-section avatar>
                    <q-icon name="fa fa-file-word" />
                </q-item-section>
                <q-item-section>Templates</q-item-section>
            </q-item>

            <q-separator spaced />

            <q-item to='/datas/custom'>
                <q-item-section avatar>
                    <q-icon name="fa fa-table" />
                </q-item-section>
                <q-item-section>Custom data</q-item-section>
            </q-item>
            <q-item to='/datas/dump'>
                <q-item-section avatar>
                    <q-icon name="fa fa-archive" />
                </q-item-section>
                <q-item-section>Import / Export</q-item-section>
            </q-item>
        </q-list>
    </q-drawer>
    <router-view />     
</div>
</template>

<script>
import Breadcrumb from 'components/breadcrumb'
import UserService from '@/services/user'

export default {
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

