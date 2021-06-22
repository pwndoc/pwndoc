import { Notify, Dialog } from 'quasar';

import BasicEditor from 'components/editor';
import Breadcrumb from 'components/breadcrumb';
import CustomFields from 'components/custom-fields';

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import Utils from '@/services/utils';

export default {
    props: {
        frontEndAuditState: Number,
        parentState: String,
        parentApprovals: Array
    },
    data: () => {
        return {
            // Set audit ID
            auditId: null,
            audit: {},
            section: {
                field: "",
                name: "",
                customFields: []
            },
            sectionOrig: {},
            // List of CustomFields
            customFields: [],
            AUDIT_VIEW_STATE: Utils.AUDIT_VIEW_STATE
        }
    },

    components: {
        BasicEditor,
        Breadcrumb,
        CustomFields
    },

    mounted: function() {
        this.auditId = this.$route.params.auditId;
        this.sectionId = this.$route.params.sectionId;
        this.getSection();

        this.$socket.emit('menu', {menu: 'editSection', section: this.sectionId, room: this.auditId});

        // save on ctrl+s
        document.addEventListener('keydown', this._listener, false)
    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false)
    },

    beforeRouteLeave (to, from , next) {
        Utils.syncEditors(this.$refs)
        if (this.unsavedChanges()) {
            Dialog.create({
            title: 'There are unsaved changes !',
            message: `Do you really want to leave ?`,
            ok: {label: 'Confirm', color: 'negative'},
            cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => next())
        }
        else
            next()
    },

    beforeRouteUpdate (to, from , next) {
        Utils.syncEditors(this.$refs)
        if (this.unsavedChanges()) {
            Dialog.create({
            title: 'There are unsaved changes !',
            message: `Do you really want to leave ?`,
            ok: {label: 'Confirm', color: 'negative'},
            cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => next())
        }
        else
            next()
    },

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                this.updateSection();
            }
        },

        // Get Section
        getSection: function() {
            DataService.getCustomFields()
            .then((data) => {
                this.customFields = data.data.datas
                return AuditService.getSection(this.auditId, this.sectionId)
            })
            .then((data) => {
                this.audit = data.data.datas;
                this.section = this.audit.sections[0];
                this.$nextTick(() => {
                    Utils.syncEditors(this.$refs)
                    this.sectionOrig = this.$_.cloneDeep(this.section);                
                })
            })
            .catch((err) => {
                console.log(err)
            })
        },


        // Update Section
        updateSection: function() {
            Utils.syncEditors(this.$refs)
            this.$nextTick(() => {
                if (this.$refs.customfields && this.$refs.customfields.requiredFieldsEmpty()) {
                    Notify.create({
                        message: 'Please fill all required Fields',
                        color: 'negative',
                        textColor:'white',
                        position: 'top-right'
                    })
                    return
                }
                AuditService.updateSection(this.auditId, this.sectionId, this.section)
                .then(() => {
                    this.sectionOrig = this.$_.cloneDeep(this.section);
                    Notify.create({
                        message: 'Section updated successfully',
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
            })
        },

        unsavedChanges: function() {  
            if (!this.$_.isEqual(this.section.customFields, this.sectionOrig.customFields))
                return true

            return false
        }
    }
}