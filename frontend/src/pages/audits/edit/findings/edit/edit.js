import { Notify, Dialog } from 'quasar';

import BasicEditor from 'components/editor';
import Breadcrumb from 'components/breadcrumb';
import CvssCalculator from 'components/cvsscalculator'
import TextareaArray from 'components/textarea-array'
import CustomFields from 'components/custom-fields'

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import VulnService from '@/services/vulnerability';
import Utils from '@/services/utils';

import { $t } from '@/boot/i18n'

export default {
    props: {
        frontEndAuditState: Number,
        parentState: String,
        parentApprovals: Array
    },
    data: () => {
        return {
            finding: {},
            findingOrig: {},
            selectedTab: "definition",
            proofsTabVisited: false,
            detailsTabVisited: false,
            vulnTypes: [],
            AUDIT_VIEW_STATE: Utils.AUDIT_VIEW_STATE
        }
    },

    components: {
        BasicEditor,
        Breadcrumb,
        CvssCalculator,
        TextareaArray,
        CustomFields
    },

    mounted: function() {
        this.auditId = this.$route.params.auditId;
        this.findingId = this.$route.params.findingId;
        this.getFinding();
        this.getVulnTypes();

        this.$socket.emit('menu', {menu: 'editFinding', finding: this.findingId, room: this.auditId});

        // save on ctrl+s
        document.addEventListener('keydown', this._listener, false);
    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false);
    },

    beforeRouteLeave (to, from , next) {
        Utils.syncEditors(this.$refs)

        var displayHighlightWarning = this.displayHighlightWarning()

        if (this.unsavedChanges()) {
            Dialog.create({
            title: $t('msg.thereAreUnsavedChanges'),
            message: $t('msg.doYouWantToLeave'),
            ok: {label: $t('btn.confirm'), color: 'negative'},
            cancel: {label: $t('btn.cancel'), color: 'white'},
            focus: 'cancel'
            })
            .onOk(() => next())
        }
        else if (displayHighlightWarning) {
            Dialog.create({
                title: $t('msg.highlightWarningTitle'),
                message: `${displayHighlightWarning}</mark>`,
                html: true,
                ok: {label: $t('btn.leave'), color: 'negative'},
                cancel: {label: $t('btn.stay'), color: 'white'},
            })
            .onOk(() => next())
        }
        else
            next()
    },

    beforeRouteUpdate (to, from , next) {
        Utils.syncEditors(this.$refs)

        var displayHighlightWarning = this.displayHighlightWarning()

        if (this.unsavedChanges()) {
            Dialog.create({
            title: $t('msg.thereAreUnsavedChanges'),
            message: $t('msg.doYouWantToLeave'),
            ok: {label: $t('btn.confirm'), color: 'negative'},
            cancel: {label: $t('btn.cancel'), color: 'white'},
            focus: 'cancel'
            })
            .onOk(() => next())
        }
        else if (displayHighlightWarning) {
            Dialog.create({
                title: $t('msg.highlightWarningTitle'),
                message: `${displayHighlightWarning}</mark>`,
                html: true,
                ok: {label: $t('btn.leave'), color: 'negative'},
                cancel: {label: $t('btn.stay'), color: 'white'},
            })
            .onOk(() => next())
        }
        else
            next()
    },

    computed: {
        vulnTypesLang: function() {
            return this.vulnTypes.filter(type => type.locale === this.$parent.audit.language);
        },

        screenshotsSize: function() {
            return ((JSON.stringify(this.uploadedImages).length) / 1024).toFixed(2)
        }
    },

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                if (this.frontEndAuditState === this.AUDIT_VIEW_STATE.EDIT)
                    this.updateFinding();
            }
        },

        // Get Vulnerabilities types
        getVulnTypes: function() {
            DataService.getVulnerabilityTypes()
            .then((data) => {
                this.vulnTypes = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        },

        // Get Finding
        getFinding: function() {
            AuditService.getFinding(this.auditId, this.findingId)
            .then((data) => {
                this.finding = data.data.datas;
                if (this.finding.customFields && // For retrocompatibility with customField reference instead of object
                    this.finding.customFields.length > 0 && 
                    typeof (this.finding.customFields[0].customField) === 'string') 
                    this.finding.customFields = Utils.filterCustomFields('finding', this.finding.category, this.$parent.customFields, this.finding.customFields, this.$parent.audit.language)
                if (this.finding.paragraphs.length > 0 && !this.finding.poc)
                    this.finding.poc = this.convertParagraphsToHTML(this.finding.paragraphs)

                this.$nextTick(() => {
                    Utils.syncEditors(this.$refs)
                    this.findingOrig = this.$_.cloneDeep(this.finding); 
                })
            })
            .catch((err) => {
                if (!err.response)
                    console.log(err)
                else if (err.response.status === 403)
                    this.$router.push({name: '403', params: {error: err.response.data.datas}})
                else if (err.response.status === 404)
                    this.$router.push({name: '404', params: {error: err.response.data.datas}})
            })
        },

        // For retro compatibility with old paragraphs
        convertParagraphsToHTML: function(paragraphs) {
            var result = ""
            paragraphs.forEach(p => {
                result += `<p>${p.text}</p>`
                if (p.images.length > 0) {
                    p.images.forEach(img => {
                        result += `<img src="${img.image}" alt="${img.caption}" />`
                    })
                }
            })
            return result
        },

        // Update Finding
        updateFinding: function() {
            Utils.syncEditors(this.$refs)
            this.$nextTick(() => {
                var customFieldsEmpty = this.$refs.customfields && this.$refs.customfields.requiredFieldsEmpty()
                var defaultFieldsEmpty = this.requiredFieldsEmpty()
                if (customFieldsEmpty || defaultFieldsEmpty) {
                    Notify.create({
                        message: $t('msg.fieldRequired'),
                        color: 'negative',
                        textColor:'white',
                        position: 'top-right'
                    })
                    return
                }
                
                AuditService.updateFinding(this.auditId, this.findingId, this.finding)
                .then(() => {
                    this.findingOrig = this.$_.cloneDeep(this.finding);
                    Notify.create({
                        message: $t('msg.findingUpdateOk'),
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

        deleteFinding: function() {
            Dialog.create({
                title: $t('msg.deleteFindingConfirm'),
                message: $t('msg.deleteFindingNotice'),
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => {
                AuditService.deleteFinding(this.auditId, this.findingId)
                .then(() => {
                    Notify.create({
                        message: $t('msg.findingDeleteOk'),
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right'
                    })
                    this.findingOrig = this.finding
                    var currentIndex = this.$parent.audit.findings.findIndex(e => e._id === this.findingId)
                    if (this.$parent.audit.findings.length === 1)
                        this.$router.push(`/audits/${this.$parent.auditId}/findings/add`)
                    else if (currentIndex === this.$parent.audit.findings.length - 1)
                        this.$router.push(`/audits/${this.$parent.auditId}/findings/${this.$parent.audit.findings[currentIndex - 1]._id}`)
                    else
                        this.$router.push(`/audits/${this.$parent.auditId}/findings/${this.$parent.audit.findings[currentIndex + 1]._id}`)
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

         // Backup Finding to vulnerability database
        backupFinding: function() {
            Utils.syncEditors(this.$refs)
            VulnService.backupFinding(this.$parent.audit.language, this.finding)
            .then((data) => {
                Notify.create({
                    message: data.data.datas,
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

        syncEditors: function() {
            Utils.syncEditors(this.$refs)
        },

        updateOrig: function() {
            if (this.selectedTab === 'proofs' && !this.proofsTabVisited){
                Utils.syncEditors(this.$refs)
                this.findingOrig.poc = this.finding.poc
                this.proofsTabVisited = true
            }
            else if (this.selectedTab === 'details' && !this.detailsTabVisited){
                Utils.syncEditors(this.$refs)
                this.findingOrig.remediation = this.finding.remediation
                this.detailsTabVisited = true
            }
        },

        unsavedChanges: function() {
            if (this.finding.title !== this.findingOrig.title)
                return true
            if ((this.finding.vulnType || this.findingOrig.vulnType) && this.finding.vulnType !== this.findingOrig.vulnType)
                return true
            if ((this.finding.description || this.findingOrig.description) && this.finding.description !== this.findingOrig.description)
                return true
            if ((this.finding.observation || this.findingOrig.observation) && this.finding.observation !== this.findingOrig.observation)
                return true
            if (!this.$_.isEqual(this.finding.references, this.findingOrig.references))
                return true
            if (!this.$_.isEqual(this.finding.customFields, this.findingOrig.customFields))
                return true

            if ((this.finding.poc || this.findingOrig.poc) && this.finding.poc !== this.findingOrig.poc)
                return true
            
            if ((this.finding.scope || this.findingOrig.scope) && this.finding.scope !== this.findingOrig.scope)
                return true
            if ((this.finding.cvssv3 || this.findingOrig.cvssv3) && this.finding.cvssv3 !== this.findingOrig.cvssv3)
                return true
            if ((this.finding.remediationComplexity || this.findingOrig.remediationComplexity) && this.finding.remediationComplexity !== this.findingOrig.remediationComplexity)
                return true
            if ((this.finding.priority || this.findingOrig.priority) && this.finding.priority !== this.findingOrig.priority)
                return true
            if ((this.finding.remediation || this.findingOrig.remediation) && this.finding.remediation !== this.findingOrig.remediation)
                return true

            if (this.finding.status !== this.findingOrig.status)
                return true

            return false
        },

        displayHighlightWarning: function() {
            if (!this.$settings.report.enabled || !this.$settings.report.public.highlightWarning)
            return null

            var matchString = `(<mark data-color="${this.$settings.report.public.highlightWarningColor}".+?>.+?)</mark>`
            var regex = new RegExp(matchString)
            var result = ""

            result = regex.exec(this.finding.description)
            if (result && result[1])
                return (result[1].length > 119) ? "<b>Description</b><br/>"+result[1].substring(0,119)+'...' : "<b>Description</b><br/>"+result[1]
            result = regex.exec(this.finding.observation)
            if (result && result[1])
                return (result[1].length > 119) ? "<b>Observation</b><br/>"+result[1].substring(0,119)+'...' : "<b>Observation</b><br/>"+result[1]
            result = regex.exec(this.finding.poc)
            if (result && result[1])
                return (result[1].length > 119) ? "<b>Proofs</b><br/>"+result[1].substring(0,119)+'...' : "<b>Proofs</b><br/>"+result[1]
            result = regex.exec(this.finding.remediation)
            if (result && result[1])
                return (result[1].length > 119) ? "<b>Remediation</b><br/>"+result[1].substring(0,119)+'...' : "<b>Remediation</b><br/>"+result[1]
            

            if (this.finding.customFields && this.finding.customFields.length > 0) {
                for (let i in this.finding.customFields) {
                    let field = this.finding.customFields[i]
                    if (field.customField && field.text && field.customField.fieldType === "text") {
                        result = regex.exec(field.text)
                        if (result && result[1])
                            return (result[1].length > 119) ? `<b>${field.customField.label}</b><br/>`+result[1].substring(0,119)+'...' : `<b>${field.customField.label}</b><br/>`+result[1]
                    }
                }
            }
            
            return null
        },

        requiredFieldsEmpty: function() {
            if (this.$refs.titleField) {
                this.$refs.titleField.validate()
                this.$refs.typeField.validate()
                this.$refs.descriptionField.validate()
                this.$refs.observationField.validate()
                this.$refs.referencesField.validate()

                return (
                    this.$refs.titleField.hasError ||
                    this.$refs.typeField.hasError ||
                    this.$refs.descriptionField.hasError ||
                    this.$refs.observationField.hasError ||
                    this.$refs.referencesField.hasError
                )
            }
            else if (this.$refs.pocField) {
                this.$refs.pocField.validate()

                return this.$refs.pocField.hasError
            }
            else if (this.$refs.affectedField) {
                this.$refs.affectedField.validate()
                this.$refs.remediationDifficultyField.validate()
                this.$refs.priorityField.validate()
                this.$refs.remediationField.validate()

                return (
                    this.$refs.affectedField.hasError ||
                    this.$refs.remediationDifficultyField.hasError ||
                    this.$refs.priorityField.hasError ||
                    this.$refs.remediationField.hasError
                )
            }
            
            return false
        }
    }
}