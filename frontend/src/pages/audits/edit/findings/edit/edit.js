import { Notify, Dialog } from 'quasar';

import BasicEditor from 'components/editor/Editor.vue';
import Breadcrumb from 'components/breadcrumb';
import Cvss3Calculator from 'components/cvss3calculator'
import Cvss4Calculator from 'components/cvss4calculator'
import TextareaArray from 'components/textarea-array'
import CustomFields from 'components/custom-fields'
import CommentsList from 'components/comments-list'

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import { useUserStore } from 'src/stores/user'
import VulnService from '@/services/vulnerability';
import Utils from '@/services/utils';

import { $t } from '@/boot/i18n'

const userStore = useUserStore()

export default {
    data: () => {
        return {
            finding: {},
            findingOrig: {},
            selectedTab: "definition",
            proofsTabVisited: false,
            detailsTabVisited: false,
            vulnTypes: [],
            AUDIT_VIEW_STATE: Utils.AUDIT_VIEW_STATE,
            overrideLeaveCheck: false,
            transitionEnd: true,
            // Comments
            commentTemp: null,
            replyTemp: null,
            hoverReply: null,
            commentDateOptions: {
                year: 'numeric',
                month: 'long',
                day: '2-digit',
                hour: 'numeric',
                minute: '2-digit',
            }
        }
    },

    inject: [
        'frontEndAuditState',
        'auditParent',
        'retestSplitView',
        'retestSplitRatio',
        'retestSplitLimits',
        'commentMode',
        'focusedComment',
        'editComment',
        'editReply',
        'replyingComment',
        'fieldHighlighted',
        'commentIdList',
        'customFields'
    ],

    components: {
        BasicEditor,
        Breadcrumb,
        Cvss3Calculator,
        Cvss4Calculator,
        TextareaArray,
        CustomFields,
        CommentsList
    },

    mounted: async function() {
        this.auditId = this.$route.params.auditId;
        this.findingId = this.$route.params.findingId;
        this.getFinding();
        this.getVulnTypes();

        this.$socket.emit('menu', {menu: 'editFinding', finding: this.findingId, room: this.auditId});

        // save on ctrl+s
        document.addEventListener('keydown', this._listener, false);
        // listen for comments added in the editor
        document.addEventListener('comment-added', this.editorCommentAdded)
        document.addEventListener('comment-clicked', this.editorCommentClicked)

        // Handle focus when comment mode is enabled
        if (this.commentMode) {
            let comment = null
            if (this.focusedComment && this.fieldHighlighted) {
                comment = {_id: this.focusedComment, fieldName: this.fieldHighlighted}
            }
            this.focusedComment = ""
            this.fieldHighlighted = ""

            // Focus when page is mounted and focusComment is in the query
            if (this.$route.query.focusComment) {
                await this.$nextTick()
                if (comment){
                    this.focusComment(comment)
                    // Focus comment on the sidebar
                    let commentElementSidebar = document.getElementById(`sidebar-${comment._id}`)
                    if (commentElementSidebar)
                        commentElementSidebar.scrollIntoView({block: "center"})
                }
            }
        }
    },

    unmounted: function() {
        document.removeEventListener('keydown', this._listener, false);
        document.removeEventListener('comment-added', this.editorCommentAdded)
        document.removeEventListener('comment-clicked', this.editorCommentClicked)
    },

    beforeRouteLeave (to, from , next) {
        if (to.name === '404' || to.name === '403') {
            next()
            return
        }

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
        else if (!this.commentMode && displayHighlightWarning) {
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
        else if (!this.commentMode && displayHighlightWarning) {
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
            return this.vulnTypes.filter(type => type.locale === this.auditParent.language);
        },

        screenshotsSize: function() {
            return ((JSON.stringify(this.uploadedImages).length) / 1024).toFixed(2)
        },

        canCreateComment: function() {
            return userStore.isAllowed('audits:comments:create') 
        },
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
                    this.finding.customFields = Utils.filterCustomFields('finding', this.finding.category, this.customFields, this.finding.customFields, this.auditParent.language)
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
                    this.$router.push({name: '403', query: {error: err.response.data.datas}})
                else if (err.response.status === 404)
                    this.$router.push({name: '404', query: {error: err.response.data.datas}})
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
                    this.overrideLeaveCheck = true
                    var currentIndex = this.auditParent.findings.findIndex(e => e._id === this.findingId)
                    if (this.auditParent.findings.length === 1)
                        this.$router.push(`/audits/${this.auditParentId}/findings/add`)
                    else if (currentIndex === this.auditParent.findings.length - 1)
                        this.$router.push(`/audits/${this.auditParentId}/findings/${this.auditParent.findings[currentIndex - 1]._id}`)
                    else
                        this.$router.push(`/audits/${this.auditParentId}/findings/${this.auditParent.findings[currentIndex + 1]._id}`)
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
            VulnService.backupFinding(this.auditParent.language, this.finding)
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
            this.transitionEnd = false
            Utils.syncEditors(this.$refs)
        },

        updateOrig: function() {
            this.transitionEnd = true
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

        toggleSplitView: function() {
            this.retestSplitView = !this.retestSplitView
            if (this.retestSplitView) {
                this.retestSplitRatio = 50
                this.retestSplitLimits = [40, 60]
            }
            else {
                this.retestSplitRatio = 100
                this.retestSplitLimits = [100, 100]
            }
            if (this.retestSplitView && this.commentMode)
                this.toggleCommentView()
        },

        // *** Comments Handling ***

        toggleCommentView: function() {
            Utils.syncEditors(this.$refs)
            this.commentMode = !this.commentMode
            if (!this.commentMode) {
                this.focusedComment = ""
                this.fieldHighlighted = null
            }
            if (this.commentMode && this.retestSplitView)
                this.toggleSplitView()
        },

        focusComment: function(comment) {
            const commentId = comment._id || comment.commentId
            // If another comment is in progress or if comment already focused, then do nothing
            if (
                (!!this.editComment && this.editComment !== commentId) || 
                (this.replyingComment && !comment.replyTemp) || 
                (this.focusedComment === commentId)
            )
                return


            this.fieldHighlighted = comment.fieldName
            this.focusedComment = commentId

            // If comment is in another finding, then redirect to it
            if (comment.findingId && this.findingId !== comment.findingId) {
                this.$router.replace({
                    name: 'editFinding',
                    params: {
                        auditId: this.auditId, 
                        findingId: comment.findingId, 
                    }, 
                    query: {focusComment: true}
                })
                return
            }

            // If comment is in another section, then redirect to it
            if (comment.sectionId && this.sectionId !== comment.sectionId) {
                this.$router.replace({
                    name: 'editSection',
                    params: {
                        auditId: this.auditId, 
                        sectionId: comment.sectionId, 
                    },
                    query: {focusComment: true}
                })
                return
            }

            let definitionFields = ["titleField", "typeField", "descriptionField", "observationField", "referencesField"]
            let detailsFields = ["affectedField", "cvssField", "remediationDifficultyField", "priorityField", "remediationField"]

            // Go to definition tab and scrollTo field
            if (this.selectedTab !== 'definition' && (definitionFields.includes(comment.fieldName) || comment.fieldName.startsWith('field-'))) {
                this.selectedTab = "definition"
            }
            else if (this.selectedTab !== 'poc' && comment.fieldName === 'pocField') {
                this.selectedTab = "proofs"
            }
            else if (this.selectedTab !== 'details' && detailsFields.includes(comment.fieldName)) {
                this.selectedTab = "details"
            }
            let checkCount = 0
            let elementField = null
            let elementCommentEditor = null
            const intervalId = setInterval(() => {
                checkCount++
                elementField = document.getElementById(comment.fieldName)
                elementCommentEditor = document.getElementById(commentId)
                if (elementField || elementCommentEditor) {
                    clearInterval(intervalId)
                    if (elementCommentEditor) {
                        elementCommentEditor.scrollIntoView({block: "center"})
                    }
                    else {
                        elementField.scrollIntoView({block: "center"})
                    }
                }
                else if (checkCount >= 10) {
                    clearInterval(intervalId)
                }
            }, 200)
        },

        editorCommentAdded: function(event) {
            if (!event.detail || !event.detail.fieldName || !event.detail.id)
                return

            if (event.detail.warning) {
                Dialog.create({
                    title: $t('Warning'),
                    message: $t(event.detail.warning),
                    ok: {label: $t('btn.confirm'), color: 'warning'},
                    cancel: {label: $t('btn.cancel'), color: 'white'}
                })
                .onOk(() => {
                    if (event.detail.fieldName && event.detail.id)
                    this.createComment(event.detail.fieldName, event.detail.id)
                })
            }
            else {
                this.createComment(event.detail.fieldName, event.detail.id)
            }
        },

        editorCommentClicked: function(event) {
            if (this.commentMode && event.detail.id) {
                let comment = this.auditParent.comments.find(e => e._id === event.detail.id)
                if (comment) {
                    document.getElementById(`sidebar-${comment._id}`).scrollIntoView({block: "center"})
                    this.fieldHighlighted = comment.fieldName
                    this.focusedComment = comment._id
                }
            }
        },

        createComment: function(fieldName, commentId) {
            let comment = {
                findingId: this.findingId,
                fieldName: fieldName,
                authorId: userStore.id,
                author: {
                    firstname: userStore.firstname,
                    lastname: userStore.lastname
                },
                text: "" 
            }
            if (commentId) comment.commentId = commentId

            AuditService.createComment(this.auditId, comment)
            .then((res) => {
                let newComment = res.data.datas
                this.focusedComment = newComment._id
                this.editComment = newComment._id
                this.fieldHighlighted = fieldName
                this.focusComment(comment)
                this.updateFinding()
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

        deleteComment: function(comment) {
            this.editComment = null
            let commentId = comment._id || comment.commentId
            AuditService.deleteComment(this.auditId, commentId)
            .then(() => {
                if (this.focusedComment === commentId)
                    this.fieldHighlighted = ""
                document.dispatchEvent(new CustomEvent('comment-deleted', { detail: { id: commentId } }))
                this.updateFinding()
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

        updateComment: function(comment) {
            if (comment.textTemp)
                comment.text = comment.textTemp
            if (comment.replyTemp){
                comment.replies.push({
                    author: userStore.id,
                    text: comment.replyTemp
                })
            }
            AuditService.updateComment(this.auditId, comment)
                .then(() => {
                    this.editComment = null
                    this.editReply = null
                    this.updateFinding()
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

        unsavedChanges: function() {
            if (this.overrideLeaveCheck)
                return false

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
            if (!this.$settings.report.public.scoringMethods.CVSS3 && (this.finding.cvss || this.findingOrig.cvss) && this.finding.cvss !== this.findingOrig.cvss)
                return true
            if (!this.$settings.report.public.scoringMethods.CVSS4 && (this.finding.cvss4 || this.findingOrig.cvss4) && this.finding.cvss4 !== this.findingOrig.cvss4)
                return true
            if ((this.finding.remediationComplexity || this.findingOrig.remediationComplexity) && this.finding.remediationComplexity !== this.findingOrig.remediationComplexity)
                return true
            if ((this.finding.priority || this.findingOrig.priority) && this.finding.priority !== this.findingOrig.priority)
                return true
            if ((this.finding.remediation || this.findingOrig.remediation) && this.finding.remediation !== this.findingOrig.remediation)
                return true

            if (this.finding.status !== this.findingOrig.status)
                return true
            
            if ((this.finding.retestStatus || this.findingOrig.retestStatus) && this.finding.retestStatus !== this.findingOrig.retestStatus)
                return true
            if ((this.finding.retestDescription || this.findingOrig.retestDescription) && this.finding.retestDescription !== this.findingOrig.retestDescription)
                return true

            return false
        },

        displayHighlightWarning: function() {
            if (this.overrideLeaveCheck)
                return null

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
            var hasErrors = false

            if (this.$refs.titleField) {
                this.$refs.titleField.validate()
                hasErrors = hasErrors || this.$refs.titleField.hasError
            }
            if (this.$refs.typeField) {
                this.$refs.typeField.validate()
                hasErrors = hasErrors || this.$refs.typeField.hasError
            }
            if (this.$refs.descriptionField) {
                this.$refs.descriptionField.validate()
                hasErrors = hasErrors || this.$refs.descriptionField.hasError
            }
            if (this.$refs.observationField) {
                this.$refs.observationField.validate()
                hasErrors = hasErrors || this.$refs.observationField.hasError
            }
            if (this.$refs.referencesField) {
                this.$refs.referencesField.validate()
                hasErrors = hasErrors || this.$refs.referencesField.hasError
            }
            if (this.$refs.pocField) {
                this.$refs.pocField.validate()
                hasErrors = hasErrors || this.$refs.pocField.hasError
            }
            if (this.$refs.affectedField) {
                this.$refs.affectedField.validate()
                hasErrors = hasErrors || this.$refs.affectedField.hasError
            }
            if (this.$refs.remediationDifficultyField) {
                this.$refs.remediationDifficultyField.validate()
                hasErrors = hasErrors || this.$refs.remediationDifficultyField.hasError
            }
            if (this.$refs.priorityField) {
                this.$refs.priorityField.validate()
                hasErrors = hasErrors || this.$refs.priorityField.hasError
            }
            if (this.$refs.remediationField) {
                this.$refs.remediationField.validate()
                hasErrors = hasErrors || this.$refs.remediationField.hasError
            }

            return hasErrors
        }
    }
}