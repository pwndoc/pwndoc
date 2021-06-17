<template>
    <q-icon v-if="isAuditApproved()" :size="size" flat color="positive" name="far fa-check-circle">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is approved ({{ getApprovalCount() }}/{{ getRequiredApprovalCount() }})
            <div v-for="reviewer in auditObj.approvals">
                <q-separator />
                {{ reviewer.firstname }} {{ reviewer.lastname }}
            </div>
        </q-tooltip> 
    </q-icon>
    <q-icon v-else-if="auditObj.isReadyForReview" :size="size" flat color="warning" name="fas fa-exclamation-triangle">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is being reviewed ({{ getApprovalCount() }}/{{ getRequiredApprovalCount() }})
            <div v-for="reviewer in auditObj.approvals">
                <q-separator />
                {{ reviewer.firstname }} {{ reviewer.lastname }}
            </div>
        </q-tooltip> 
    </q-icon>
    <q-icon v-else-if="!auditObj._id" :size="size" flat color="warning" name="fas fa-question"></q-icon>
    <q-icon v-else :size="size" flat></q-icon>
</template>

<script>
import AuditService from '@/services/audit';
import ConfigsService from '@/services/configs';

export default {
    name: 'audit-state-icon',
    props: ['audit', 'auditId', 'size', 'configs', 'loadConfigs'],

    data() {
        return {
            auditObj: {},
            configsObj: {}
        }
    },

    async mounted() {
        if(this.audit && this.audit._id) this.auditObj = this.audit;
        else if(this.auditId) this.auditObj = (await AuditService.getAuditGeneral(this.auditId)).data.datas;
        else if(this.$route && this.$route.params.auditId) this.auditObj = (await AuditService.getAuditGeneral(this.$route.params.auditId)).data.datas;
        else throw "Could not get audit or auditId for audit-state-icon.";

        if(this.loadConfigs) this.configsObj = (await ConfigsService.getPublicConfigs()).data.datas;
    },

    methods: {
        getConfigs() {
            if(this.configs) return this.configs;
            else return this.configsObj;
        },

        isAuditApproved() {
            const configs = this.getConfigs();

            return this.auditObj && this.auditObj.approvals && configs && this.auditObj.approvals.length >= configs.minReviewers;
        },

        getApprovalCount() {
            if(!this.auditObj) return -1;
            else return this.auditObj.approvals.length;
        },

        getRequiredApprovalCount() {
            const configs = this.getConfigs();

            if(!configs) return -1;
            else return configs.minReviewers;
        }
    }
}
</script>