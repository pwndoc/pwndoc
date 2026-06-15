<template>
    <q-bar class="card-breadcrumb bg-white" :style="breadcrumbStyle">
        <q-btn
        v-if="showDrawerToggle"
        flat
        round
        dense
        icon="menu"
        aria-label="Open audit navigation menu"
        class="q-mr-sm"
        @click="openAuditDrawer()"
        />
        <template v-if="path">
            <q-btn :to="path" :label="pathName" no-caps dense flat color="secondary" icon="arrow_back" />
            <q-separator class="q-mr-sm" vertical inset />
        </template>
        <span class="text-bold">{{title}}</span>
        <div v-if="$settings.reviews.enabled && state !== 'EDIT'">
            <audit-state-icon class="q-mx-sm" :approvals="approvals" :state="state"/>
        </div>
        <div>
            <draft-recovery-status />
        </div>
        <q-space />
        <slot name="buttons"></slot>
    </q-bar>
</template>

<script>
import AuditStateIcon from 'components/audit-state-icon';
import DraftRecoveryStatus from 'components/draft-recovery-status.vue';
import { useAiGenerationStore } from '@/stores/ai-generation';
import { mapState } from 'pinia';

export default {
    name: 'breadcrumb',
    props: ['buttons', 'title', 'approvals', 'state', 'path', 'pathName'],
    inject: {
        auditDrawerOpen: {
            default: null
        },
        openAuditDrawer: {
            default: null
        }
    },

    components: {
        AuditStateIcon,
        DraftRecoveryStatus
    },

    computed: {
        ...mapState(useAiGenerationStore, ['layoutRightInset']),

        breadcrumbStyle() {
            const hasDesktopDrawer = this.auditDrawerOpen && this.$q.screen.gt.sm
            return {
                left: hasDesktopDrawer ? '400px' : '0px',
                right: this.layoutRightInset ? `${this.layoutRightInset}px` : '0px'
            }
        },

        showDrawerToggle() {
            return !!this.openAuditDrawer && !this.auditDrawerOpen
        }
    },
}

</script>

<style lang="scss">
.card-breadcrumb {
    height: 50px;
    padding-right: 20px;
    font-size: 14px;
    position: fixed;
    top: 50px;
    right: 0;
    left: 0;
    z-index: 1000;
}

.card-breadcrumb .q-btn {
    font-size: 14px;
}

.approvedMark {
    margin-left: 10px;
    font-size: 1.25em!important;
}
</style>
