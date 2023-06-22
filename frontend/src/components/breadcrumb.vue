<template>
    <q-bar class="card-breadcrumb bg-white">
        <template v-if="path">
            <q-btn :to="path" :label="pathName" no-caps dense flat color="secondary" icon="arrow_back" />
            <q-separator class="q-mr-sm" vertical inset />
        </template>
        <span class="text-bold">{{title}}</span>
        <div v-if="$settings.reviews.enabled && state !== 'EDIT'">
            <audit-state-icon class="q-mx-sm" :approvals="approvals" :state="state"/>
        </div>
        <q-space />
        <slot name="buttons"></slot>
    </q-bar>
</template>

<script>
import AuditStateIcon from 'components/audit-state-icon';

export default {
    name: 'breadcrumb',
    props: ['buttons', 'title', 'approvals', 'state', 'path', 'pathName'],

    components: {
        AuditStateIcon
    },

    data: function() {
        return {
            
        }
    },

    created: function() {
    },

    methods: {
        
    }
}

</script>

<style lang="stylus">
.card-breadcrumb {
    height: 50px
    padding-right: 20px
    font-size: 14px
}

.card-breadcrumb .q-btn {
    font-size: 14px
}

.breadcrumb-title {
    margin-top: 11px
}

.breadcrumb-buttons {
    margin-top: 7px
}

.card-breadcrumb>.q-breadcrumbs {
    margin-top: 17px
}

.approvedMark {
    margin-left: 10px;
    font-size: 1.25em!important;
}
</style>