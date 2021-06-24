<template>
    <q-card flat color="white" text-color="black" class="row card-breadcrumb">
        <q-btn 
        v-if="typeof(buttons) !== 'undefined'" 
        flat 
        color='secondary'
        @click="$router.push('/audits')"
        >
            <i class="fa fa-home fa-lg"></i>
        </q-btn>
        <p v-if="typeof(title) === 'undefined'" class="breadcrumb-title">{{bread[last].name}}</p>
        <p v-else class="breadcrumb-title">{{title}} 
            <audit-state-icon class="q-mx-sm" size="xs" :approvals="approvals" :state="state"/>
        </p>
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
        initBreadcrumb: async function() {
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
    font-weight: bold
    vertical-align: middle
    margin-right: auto;
    margin-top: 17px
    margin-left: 20px
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