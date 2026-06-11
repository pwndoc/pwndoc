import { Dialog } from 'quasar'
import AuditQaDialog from '@/components/audit-qa-dialog.vue'

export function openAuditQaDialog(auditId) {
    return Dialog.create({
        component: AuditQaDialog,
        componentProps: {
            auditId: auditId
        }
    })
}
