import { Notify, Dialog } from 'quasar';

import BasicEditor from 'components/editor';
import Breadcrumb from 'components/breadcrumb';

import AuditService from '@/services/audit';

export default {
    data: () => {
        return {
            // **** Global ****
            AuditService: AuditService,

            // Set audit ID
            auditId: null,
            audit: {},
            auditOrig: {}
        }
    },

    components: {
        BasicEditor,
        Breadcrumb
    },

    mounted: function() {
        this.auditId = this.$route.params.auditId;
        this.getAuditSummary();

        this.$socket.emit('menu', {menu: 'summary', room: this.auditId});

        // save on ctrl+s
        // var lastSave = 0;
        document.addEventListener('keydown', this._listener, false)
    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false)
    },

    beforeRouteLeave (to, from , next) {
        if (this.$_.isEqual(this.audit, this.auditOrig))
            next();
        else {
            Dialog.create({
                title: 'There are unsaved changes !',
                message: `Do you really want to leave ?`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => next())
        }
    },

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                this.updateAuditSummary();
            }
        },

        // Get Audit Summary from uuid
        getAuditSummary: function() {
            AuditService.getAuditSummary(this.auditId)
            .then((data) => {
                this.audit = data.data.datas;
                this.auditOrig = this.$_.cloneDeep(this.audit);
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Save Audit Summary
        updateAuditSummary: function() {
            if (this.audit.summary) this.audit.summary = this.audit.summary.replace(/(<p><\/p>)+$/, '')
            AuditService.updateAuditSummary(this.auditId, this.audit)
            .then(() => {
                this.auditOrig = this.$_.cloneDeep(this.audit);
                Notify.create({
                    message: 'Audit updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        }
    }
}