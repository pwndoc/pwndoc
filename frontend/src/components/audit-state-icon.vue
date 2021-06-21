<template>
    <q-icon v-if="isAuditApproved()" :size="size" flat color="positive" name="far fa-check-circle">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is approved ({{ getApprovalCount() }}/{{ getRequiredApprovalCount() }})
            <div v-for="reviewer in audit.approvals">
                <q-separator />
                {{ reviewer.firstname }} {{ reviewer.lastname }}
            </div>
        </q-tooltip> 
    </q-icon>
    <q-icon v-else-if="audit && audit.isReadyForReview" :size="size" flat color="warning" name="fas fa-exclamation-triangle">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is being reviewed ({{ getApprovalCount() }}/{{ getRequiredApprovalCount() }})
            <div v-for="reviewer in audit.approvals">
                <q-separator />
                {{ reviewer.firstname }} {{ reviewer.lastname }}
            </div>
        </q-tooltip> 
    </q-icon>
    <q-icon v-else-if="!audit || !audit._id" :size="size" flat color="warning" name="fas fa-question"></q-icon>
    <q-icon v-else :size="size" flat></q-icon>
</template>

<script>
export default {
    name: 'audit-state-icon',
    props: ['audit', 'settings', 'size'],

    data() {
        return {}
    },

    methods: {
        isAuditApproved() {
            if(!this.settings || !this.audit || !this.audit.approvals) return false;
            else return this.audit.approvals.length >= this.settings.minReviewers;
        },

        getApprovalCount() {
            if(!this.audit) return -1;
            else return this.audit.approvals.length;
        },

        getRequiredApprovalCount() {
            if(!this.settings) return -1;
            else return this.settings.minReviewers;
        }
    }
}
</script>