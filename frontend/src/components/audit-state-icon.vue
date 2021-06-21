<template>
    <q-icon v-if="!audit || !audit._id" :size="size" flat color="warning" name="fas fa-question"></q-icon>
    <q-icon v-else-if="audit.state === 'APPROVED'" :size="size" flat color="positive" name="far fa-check-circle">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is approved ({{ getApprovalCount() }})
            <div v-for="reviewer in audit.approvals">
                <q-separator />
                {{ reviewer.firstname }} {{ reviewer.lastname }}
            </div>
        </q-tooltip> 
    </q-icon>
    <q-icon v-else-if="audit.state === 'REVIEW'" :size="size" flat color="warning" name="fas fa-exclamation-triangle">
        <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
            Audit is being reviewed ({{ getApprovalCount() }})
            <div v-for="reviewer in audit.approvals">
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
    props: ['audit', 'size'],

    data() {
        return {}
    },

    methods: {
        getApprovalCount() {
            if(!this.audit) return -1;
            else return this.audit.approvals.length;
        }
    }
}
</script>