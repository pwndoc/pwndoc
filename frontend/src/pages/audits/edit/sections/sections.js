import { Notify, Dialog } from 'quasar';

import Breadcrumb from 'components/breadcrumb';
import BasicEditor from 'components/editor';

import AuditService from '@/services/audit';
import Utils from '@/services/utils';

export default {
    data: () => {
        return {
            // Set audit ID
            auditId: null,
            section: {},
            sectionOrig: {},
        }
    },

    components: {
        BasicEditor,
        Breadcrumb
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
            AuditService.getSection(this.auditId, this.sectionId)
            .then((data) => {
                this.section = data.data.datas;
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
        },

        deleteSection: function() {
            Dialog.create({
                title: 'Delete current Section ?',
                message: `This action can't be cancelled`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => {
                AuditService.deleteSection(this.auditId, this.sectionId)
                .then(() => {
                    Notify.create({
                        message: 'Section deleted successfully',
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right'
                    })
                    this.sectionOrig = this.section
                    var currentIndex = this.$parent.audit.sections.findIndex(e => e._id === this.sectionId)
                    if (this.$parent.audit.sections.length === 1)
                        this.$router.push(`/audits/${this.$parent.auditId}/general`)
                    else if (currentIndex === this.$parent.audit.sections.length - 1)
                        this.$router.push(`/audits/${this.$parent.auditId}/sections/${this.$parent.audit.sections[currentIndex - 1]._id}`)
                    else
                        this.$router.push(`/audits/${this.$parent.auditId}/sections/${this.$parent.audit.sections[currentIndex + 1]._id}`)
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
            if ((this.section.text || this.sectionOrig.text) && this.section.text !== this.sectionOrig.text)
                return true

            return false
        }
    }
}