<template>
<div>
    <q-drawer side="left" :value="true">
        <q-list class="home-drawer">
            <q-item-label header>{{$t('handleCustomData')}}</q-item-label>
        
            <q-separator />
        
            <q-item to='/data/collaborators'>
                <q-item-section avatar>
                    <q-icon name="fa fa-users" />
                </q-item-section>
                <q-item-section>{{$t('collaborators')}}</q-item-section>
            </q-item>
            <q-item to='/data/companies'>
                <q-item-section avatar>
                    <q-icon name="fa fa-building" />
                </q-item-section>
                <q-item-section>{{$t('companies')}}</q-item-section>
            </q-item>
            <q-item to='/data/clients'>
                <q-item-section avatar>
                    <q-icon name="fa fa-user-tie" />
                </q-item-section>
                <q-item-section>{{$t('clients')}}</q-item-section>
            </q-item>
            <q-item to='/data/templates'>
                <q-item-section avatar>
                    <q-icon name="fa fa-file-word" />
                </q-item-section>
                <q-item-section>{{$t('templates')}}</q-item-section>
            </q-item>

            <q-separator spaced />

            <q-item to='/data/custom'>
                <q-item-section avatar>
                    <q-icon name="fa fa-table" />
                </q-item-section>
                <q-item-section>{{$t('customData')}}</q-item-section>
            </q-item>
            <q-item to='/data/dump'>
                <q-item-section avatar>
                    <q-icon name="fa fa-archive" />
                </q-item-section>
                <q-item-section>{{$t('import')}} / {{$t('export')}}</q-item-section>
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

