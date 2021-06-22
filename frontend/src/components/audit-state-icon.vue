<template>
    <q-icon v-if="!state" :size="size" style="visibility: hidden" flat color="warning" name="fas fa-question"></q-icon>
    <q-icon v-else-if="state === 'APPROVED'" :size="size" flat color="positive" name="far fa-check-circle">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is approved ({{ getApprovalCount() }}/{{ minReviewers }})
            <div v-for="reviewer in approvals">
                <q-separator />
                {{ reviewer.firstname }} {{ reviewer.lastname }} 
            </div>
        </q-tooltip> 
    </q-icon>
    <q-icon v-else-if="state === 'REVIEW'" :size="size" flat color="warning" name="fas fa-exclamation-triangle">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is being reviewed ({{ getApprovalCount() }}/{{ minReviewers }})
            <div v-for="reviewer in approvals">
                <q-separator />
                {{ reviewer.firstname }} {{ reviewer.lastname }}
            </div>
        </q-tooltip> 
    </q-icon>
    <q-icon v-else :size="size" flat></q-icon>
</template>

<script>

export default {
    name: 'audit-state-icon',
    props: ['approvals', 'state', 'size', 'minReviewers'],

    data() {
        return {}
    },

    methods: {
        getApprovalCount() {
            if(!this.approvals) return -1;
            else return this.approvals.length;
        }
    }
}
</script>