import { Notify, Dialog } from 'quasar';

import BasicEditor from 'components/editor';
import Breadcrumb from 'components/breadcrumb';
import CvssCalculator from 'components/cvsscalculator'

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import VulnService from '@/services/vulnerability';
import Utils from '@/services/utils';

export default {
    data: () => {
        return {
            finding: {},
            findingOrig: {},
            selectedTab: "definition",
            proofsTabVisited: false,
            detailsTabVisited: false,
            vulnTypes: [],
            referencesString: "",
            customFields: []
        }
    },

    components: {
        BasicEditor,
        Breadcrumb,
        CvssCalculator
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
                // if (e.timeStamp - lastSave > 5000) {
                    this.updateFinding();
                    // lastSave = e.timeStamp;
                // }
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
            DataService.getCustomFields()
            .then((data) => {
                this.customFields = data.data.datas
                return AuditService.getFinding(this.auditId, this.findingId)
            })
            .then((data) => {
                this.finding = data.data.datas;
                if (this.finding.paragraphs.length > 0 && !this.finding.poc)
                    this.finding.poc = this.convertParagraphsToHTML(this.finding.paragraphs)
                
                this.referencesString = ""
                if (this.finding.references && this.finding.references.length > 0)
                    this.referencesString = this.finding.references.join('\n')

                var cFields = []
                this.customFields.forEach(field => {
                    var fieldText = ''
                    var findingFields = this.finding.customFields || []
                    for (var i=0;i<findingFields.length; i++) {
                        if (findingFields[i].customField && findingFields[i].customField === field._id) {
                            fieldText = findingFields[i].text
                            break
                        }  
                    }
                    cFields.push({
                        customField: field._id,
                        label: field.label,
                        fieldType: field.fieldType,
                        displayVuln: field.displayVuln,
                        displayFinding: field.displayFinding,
                        displayCategory: field.displayCategory,
                        text: fieldText
                    })
                })
                this.finding.customFields = cFields
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
            this.finding.references = this.referencesString.split('\n').filter(e => e !== '')
            AuditService.updateFinding(this.auditId, this.findingId, this.finding)
            .then(() => {
                this.findingOrig = this.$_.cloneDeep(this.finding);
                Notify.create({
                    message: 'Finding updated successfully',
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

        deleteFinding: function() {
            Dialog.create({
                title: 'Delete current Finding ?',
                message: `This action can't be cancelled`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => {
                AuditService.deleteFinding(this.auditId, this.findingId)
                .then(() => {
                    Notify.create({
                        message: 'Finding deleted successfully',
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
            this.finding.references = this.referencesString.split('\n')
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
                this.findingOrig.remediation = this.finding.poc
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
            var findingReferences = this.referencesString.split('\n').filter(e => e !== '')
            if (!this.$_.isEqual(findingReferences, this.finding.references))
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
        }
    }
}