<template>
    <q-chip v-if="state === 'APPROVED'" :size="size" square color="green-2" text-color="green-9" class="text-bold">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is approved ({{ getApprovalCount() }}/{{ getMinReviewers() }})
            <div v-for="reviewer in approvals" :key="reviewer._id">
                <q-separator />
                {{ reviewer.firstname }} {{ reviewer.lastname }} 
            </div>
        </q-tooltip>
        <q-avatar color="green" text-color="white">{{ getApprovalCount() }}/{{ getMinReviewers() }}</q-avatar>
        <span>Approved</span>
    </q-chip>
    <q-chip v-else-if="state === 'REVIEW'" :size="size" square color="amber-2" text-color="amber-9" class="text-bold">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is being reviewed ({{ getApprovalCount() }}/{{ getMinReviewers() }})
            <div v-for="reviewer in approvals" :key="reviewer._id">
                {{ reviewer.firstname }} {{ reviewer.lastname }}
            </div>
        </q-tooltip> 
        <q-avatar color="orange" text-color="white">{{ getApprovalCount() }}/{{ getMinReviewers() }}</q-avatar>
        <span>Reviewing</span>
    </q-chip>
</template>

<script>

export default {
    name: 'audit-state-icon',
    props: {
        approvals: Array,
        state: String,
        size: {
            type: String,
            default: "11px"
        }
    },

    data() {
        return {}
    },

    methods: {
        getApprovalCount() {
            if(this.approvals) return this.approvals.length;
            else return -1;
        },

        getMinReviewers() {
            return this.$settings.reviews.public.minReviewers;
        }
    }
}
</script>