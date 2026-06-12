<template>
<div>
    <q-drawer v-model="drawerModel" side="left" :behavior="isDesktop ? 'desktop' : 'mobile'" bordered>
        <q-btn flat round dense icon="close" aria-label="Close navigation menu" class="data-drawer-close" @click="closeDrawer" />
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
            <q-item to='/data/spellcheck'>
                <q-item-section avatar>
                    <q-icon name="fa fa-book" />
                </q-item-section>
                <q-item-section>{{$t('dictionary')}}</q-item-section>
            </q-item>
            <q-item to='/data/languagetool-rules'>
                <q-item-section avatar>
                    <q-icon name="fa fa-code" />
                </q-item-section>
                <q-item-section>{{$t('languageToolRules')}}</q-item-section>
            </q-item>
            <q-item v-if="$settings.ai && $settings.ai.public && $settings.ai.public.enabled" to='/data/ai-integration'>
                <q-item-section avatar>
                    <q-icon name="fa fa-robot" />
                </q-item-section>
                <q-item-section>AI Integration</q-item-section>
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
    <q-page-sticky v-if="!drawerModel" position="top-left" :offset="[16, 16]" class="data-drawer-toggle">
        <q-btn round color="primary" icon="menu" aria-label="Open navigation menu" @click="openDrawer" />
    </q-page-sticky>
    <router-view />     
</div>
</template>

<script>
export default {
    data() {
        return {
            desktopDrawerOpen: true,
            mobileDrawerOpen: false
        }
    },

    computed: {
        isDesktop() {
            return this.$q.screen.gt.sm
        },

        drawerModel: {
            get() {
                return this.isDesktop ? this.desktopDrawerOpen : this.mobileDrawerOpen
            },

            set(value) {
                if (this.isDesktop)
                    this.desktopDrawerOpen = value
                else
                    this.mobileDrawerOpen = value
            }
        }
    },

    watch: {
        '$q.screen.gt.sm': function(isWide, wasWide) {
            if (isWide && !wasWide) {
                this.desktopDrawerOpen = true
                this.mobileDrawerOpen = false
                return
            }

            if (!isWide && wasWide)
                this.mobileDrawerOpen = false
        }
    },

    methods: {
        openDrawer() {
            this.drawerModel = true
        },

        closeDrawer() {
            this.drawerModel = false
        }
    }
}
</script>

<style scoped>
.data-drawer-toggle {
    z-index: 1100;
}

.data-drawer-close {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1;
}
</style>