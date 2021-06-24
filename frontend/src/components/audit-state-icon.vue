<template v-if="$settings.reviews">
    <q-icon v-if="!state" :size="size" flat></q-icon>
    <q-icon v-else-if="state === 'APPROVED'" :size="size" flat color="positive" name="far fa-check-circle">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is approved ({{ getApprovalCount() }}/{{ getMinReviewers() }})
            <div v-for="reviewer in approvals">
                <q-separator />
                {{ reviewer.firstname }} {{ reviewer.lastname }} 
            </div>
        </q-tooltip> 
    </q-icon>
    <q-icon v-else-if="state === 'REVIEW'" :size="size" flat color="warning" name="fas fa-exclamation-triangle">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is being reviewed ({{ getApprovalCount() }}/{{ getMinReviewers() }})
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
    props: ['approvals', 'state', 'size'],

    data() {
        return {}
    },

    methods: {
        getApprovalCount() {
            if(this.approvals) return this.approvals.length;
            else return -1;
        },

        getMinReviewers() {
            return this.$settings.reviews.settings.minReviewers;
        }
    }
}
</script>