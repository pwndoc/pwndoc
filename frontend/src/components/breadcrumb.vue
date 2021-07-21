<template>
    <q-card flat color="white" text-color="black" class="row card-breadcrumb">
        <q-btn 
        v-if="typeof(buttons) !== 'undefined'" 
        flat 
        color="secondary"
        @click="$router.push('/audits')"
        >
            <i class="fa fa-home fa-lg"></i>
        </q-btn>
        <span v-if="typeof(title) === 'undefined'" class="breadcrumb-title">{{bread[last].name}}</span>
        <div v-else-if="$settings.reviews.enabled && state !== 'EDIT'" class="breadcrumb-title">
            <span class="text-bold">{{title}}</span> 
            <audit-state-icon class="q-mx-sm" :approvals="approvals" :state="state"/>
        </div>
        <div v-else class="q-mt-md">
            <span class="text-bold">{{title}}</span> 
        </div>
        <q-space />
        <q-breadcrumbs v-if="typeof(buttons) === 'undefined'" separator="/" active-color="secondary" color="light" align="right">
            <q-breadcrumbs-el v-for="breadcrumb in bread" :label="breadcrumb.name" :to="breadcrumb.path" :key="breadcrumb.path" />
        </q-breadcrumbs>
        <div v-else class="breadcrumb-buttons">
            <slot name="buttons"></slot>
        </div>
    </q-card>
</template>

<script>
import AuditStateIcon from 'components/audit-state-icon';

export default {
    name: 'breadcrumb',
    props: ['buttons', 'title', 'approvals', 'state'],

    components: {
        AuditStateIcon
    },

    data: function() {
        return {
            bread: [],
            last: 0
        }
    },

    created: function() {
        this.initBreadcrumb();
    },

    methods: {
        initBreadcrumb: function() {
            var breadArray = this.$route.matched;
            breadArray.forEach((element) => {
                var entry = {};
                if (element.meta.breadcrumb) {
                    entry.name = element.meta.breadcrumb;
                    entry.path = (element.path === "") ? "/" : element.path;
                    this.bread.push(entry);
                }
            });
            this.last = this.bread.length - 1;
        }
    }
}

</script>

<style lang="stylus" scoped>
.card-breadcrumb {
    height: 50px
    padding-right: 20px
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