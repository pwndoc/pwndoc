import { Notify, Dialog } from 'quasar';

import BasicEditor from 'components/editor/Editor.vue';
import Breadcrumb from 'components/breadcrumb';
import CustomFields from 'components/custom-fields';
import CommentsList from 'components/comments-list';

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import { useUserStore } from 'src/stores/user'
import Utils from '@/services/utils';
import { createDraftRecovery } from '@/composables/useDraftRecovery';

import { $t } from '@/boot/i18n'

const userStore = useUserStore()
const SAVE_SUCCESS_TIMEOUT_MS = 2000

export default {
    data: () => {
        return {
            // Set audit ID
            auditId: null,
            section: {
                field: "",
                name: "",
                customFields: []
            },
            sectionOrig: {},
            // List of CustomFields
            customFields: [],
            AUDIT_VIEW_STATE: Utils.AUDIT_VIEW_STATE,
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
            },
            draftRecovery: null,
            saveSuccess: false,
            saveSuccessTimer: null
        }
    },

    inject: [
        'frontEndAuditState',
        'auditParent',
        'commentMode',
        'focusedComment',
        'editComment',
        'editReply',
        'replyingComment',
        'fieldHighlighted',
        'commentIdList'
    ],

    components: {
        BasicEditor,
        Breadcrumb,
        CustomFields,
        CommentsList
    },

    mounted: async function() {
        this.auditId = this.$route.params.auditId;
        this.sectionId = this.$route.params.sectionId;
        this.getSection();

        this.$socket.emit('menu', {menu: 'editSection', section: this.sectionId, room: this.auditId});

        // save on ctrl+s
        document.addEventListener('keydown', this._listener, false)
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
                if (comment) {
                    this.focusComment(comment) // focus field
                    // focus comment in sidebar
                    let commentElementSidebar = document.getElementById(`sidebar-${comment._id}`)
                    if (commentElementSidebar)
                        commentElementSidebar.scrollIntoView({block: "center"})
                }
            }
        }
    },

    unmounted: function() {
        document.removeEventListener('keydown', this._listener, false)
        document.removeEventListener('comment-added', this.editorCommentAdded)
        document.removeEventListener('comment-clicked', this.editorCommentClicked)
        if (this.draftRecovery)
            this.draftRecovery.stop()
        this.clearSaveSuccess()
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
            .onOk(async () => {
                if (this.draftRecovery)
                    await this.draftRecovery.flushPendingWrite()
                next()
            })
        }
        else if (!this.commentMode && displayHighlightWarning) {
            Dialog.create({
                title: $t('msg.highlightWarningTitle'),
                message: `${displayHighlightWarning}</mark>`,
                html: true,
                ok: {label: $t('btn.leave'), color: 'negative'},
                cancel: {label: $t('btn.stay'), color: 'white'},
            })
            .onOk(async () => {
                if (this.draftRecovery)
                    await this.draftRecovery.flushPendingWrite()
                next()
            })
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
            .onOk(async () => {
                if (this.draftRecovery)
                    await this.draftRecovery.flushPendingWrite()
                next()
            })
        }
        else if (!this.commentMode && displayHighlightWarning) {
            Dialog.create({
                title: $t('msg.highlightWarningTitle'),
                message: `${displayHighlightWarning}</mark>`,
                html: true,
                ok: {label: $t('btn.leave'), color: 'negative'},
                cancel: {label: $t('btn.stay'), color: 'white'},
            })
            .onOk(async () => {
                if (this.draftRecovery)
                    await this.draftRecovery.flushPendingWrite()
                next()
            })
        }
        else
            next()
    },

    watch: {
        section: {
            handler() {
                if (this.saveSuccess && this.unsavedChanges())
                    this.clearSaveSuccess()
            },
            deep: true
        }
    },

    computed: {
        canCreateComment: function() {
            return userStore.isAllowed('audits:comments:create') && this.canManageAuditComments('create')
        },

        canEditComments: function() {
            return this.canManageAuditComments('update') || this.canManageAuditComments('delete')
        },

        saveButtonState: function() {
            if (this.unsavedChanges())
                return 'dirty'
            return this.saveSuccess ? 'saved' : 'idle'
        },

        saveButtonColor: function() {
            if (this.saveButtonState === 'dirty')
                return 'orange'
            if (this.saveButtonState === 'saved')
                return 'green-1'
            return 'primary'
        },

        saveButtonTextColor: function() {
            if (this.saveButtonState === 'saved')
                return 'positive'
            if (this.saveButtonState === 'dirty')
                return 'orange'
            return 'primary'
        },

        saveButtonLabel: function() {
            if (this.saveButtonState === 'saved')
                return $t('btn.saved')
            return `${$t('btn.save')} (ctrl+s)`
        }
    },

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                if (this.frontEndAuditState === this.AUDIT_VIEW_STATE.EDIT)
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
                this.section = data.data.datas;
                this.$nextTick(() => {
                    Utils.syncEditors(this.$refs)
                    this.sectionOrig = this.$_.cloneDeep(this.section);                
                    this.setupDraftRecovery()
                    this.draftRecovery.maybePromptRecovery()
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
                        message: $t('msg.fieldRequired'),
                        color: 'negative',
                        textColor:'white',
                        position: 'top-right'
                    })
                    return
                }
                AuditService.updateSection(this.auditId, this.sectionId, this.section)
                .then(() => {
                    this.sectionOrig = this.$_.cloneDeep(this.section);
                    this.markSaveSuccess()
                    if (this.draftRecovery)
                        this.draftRecovery.clearDraft()
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

        markSaveSuccess: function() {
            this.clearSaveSuccess()
            this.saveSuccess = true
            this.saveSuccessTimer = setTimeout(() => {
                this.saveSuccess = false
                this.saveSuccessTimer = null
            }, SAVE_SUCCESS_TIMEOUT_MS)
        },

        clearSaveSuccess: function() {
            if (this.saveSuccessTimer) {
                clearTimeout(this.saveSuccessTimer)
                this.saveSuccessTimer = null
            }
            this.saveSuccess = false
        },

        isCurrentUserAuditMember: function() {
            const creatorId = this.auditParent.creator?._id || this.auditParent.creator
            const collaborators = this.auditParent.collaborators || []
            return creatorId === userStore.id || collaborators.some(collaborator => (collaborator._id || collaborator) === userStore.id)
        },

        hasExactPermission: function(scope) {
            return userStore.permissions === '*' || Boolean(userStore.permissions?.includes(scope))
        },

        canManageAuditComments: function(action) {
            return this.isCurrentUserAuditMember() || this.hasExactPermission(`audits:comments:${action}-all`)
        },

        updateSectionIfEditable: function() {
            if (this.frontEndAuditState === this.AUDIT_VIEW_STATE.EDIT)
                this.updateSection()
        },

        setupDraftRecovery: function() {
            if (this.draftRecovery)
                return

            this.draftRecovery = createDraftRecovery(this, {
                scope: () => 'audit-section',
                refKey: () => `${this.auditId}:${this.sectionId}`,
                userId: () => userStore.id,
                getCurrent: () => this.section,
                setCurrent: (data) => {
                    this.section = data
                },
                getOriginal: () => this.sectionOrig,
                isDirty: () => this.unsavedChanges(),
                isReadOnly: () => this.frontEndAuditState !== this.AUDIT_VIEW_STATE.EDIT,
                syncBeforeCapture: () => Utils.syncEditors(this.$refs),
                afterRestore: async () => {
                    await this.$nextTick()
                }
            })
        },

        // *** Comments Handling ***

        toggleCommentView: function() {
            Utils.syncEditors(this.$refs)
            this.commentMode = !this.commentMode
            if (!this.commentMode) {
                this.focusedComment = ""
                this.fieldHighlighted = null
            }
        },

        focusComment: function(comment) {
            let commentId = comment._id || comment.commentId
            // If another comment is in progress or if comment already focused, then do nothing
            if (
                (!!this.editComment && this.editComment !== commentId) || 
                (this.replyingComment && !comment.replyTemp) || 
                (this.focusedComment === commentId)
            ) {
                return
            }

            this.fieldHighlighted = comment.fieldName
            this.focusedComment = comment._id

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

            let checkCount = 0
            let elementField = null
            let elementCommentEditor = null
            const intervalId = setInterval(() => {
                checkCount++
                elementField = document.getElementById(comment.fieldName)
                elementCommentEditor = document.getElementById(comment._id)
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
            }, 100)
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
                    this.scrollSidebarCommentIntoView(comment._id)
                    this.fieldHighlighted = comment.fieldName
                    this.focusedComment = comment._id
                }
            }
        },

        scrollSidebarCommentIntoView: function(commentId, block = "center") {
            if (!commentId)
                return

            const scroll = () => {
                const commentElementSidebar = document.getElementById(`sidebar-${commentId}`)
                if (commentElementSidebar) {
                    commentElementSidebar.scrollIntoView({block})
                    return true
                }
                return false
            }

            this.$nextTick(() => {
                if (scroll())
                    return

                let checkCount = 0
                const intervalId = setInterval(() => {
                    checkCount++
                    if (scroll() || checkCount >= 10)
                        clearInterval(intervalId)
                }, 100)
            })
        },

        createComment: function(fieldName, commentId) {
            if (!this.canCreateComment)
                return

            let comment = {
                sectionId: this.sectionId,
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
                this.scrollSidebarCommentIntoView(newComment._id, "end")
                this.updateSectionIfEditable()
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
            if (!userStore.isAllowed('audits:comments:delete') || !this.canManageAuditComments('delete'))
                return

            this.editComment = null
            let commentId = comment._id || comment.commentId
            AuditService.deleteComment(this.auditId, commentId)
            .then(() => {
                if (this.focusedComment === commentId)
                    this.fieldHighlighted = ""
                document.dispatchEvent(new CustomEvent('comment-deleted', { detail: { id: commentId } }))
                this.updateSectionIfEditable()
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
            if (!userStore.isAllowed('audits:comments:update') || !this.canManageAuditComments('update'))
                return

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
                    this.updateSectionIfEditable()
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
            if (!this.$_.isEqual(this.section.customFields, this.sectionOrig.customFields))
                return true

            return false
        },

        // return the first match of highlighted text found
        displayHighlightWarning: function() {
            if (!this.$settings.report.enabled || !this.$settings.report.public.highlightWarning)
                return null

            var matchString = `(<mark data-color="${this.$settings.report.public.highlightWarningColor}".+?>.+?)</mark>`
            var regex = new RegExp(matchString)
            
            if (this.section.customFields && this.section.customFields.length > 0) {
                for (let i in this.section.customFields) {
                    let field = this.section.customFields[i]
                    if (field.customField && field.text && field.customField.fieldType === "text") {
                        var result = regex.exec(field.text)
                        if (result && result[1])
                            return (result[1].length > 119) ? `<b>${field.customField.label}</b><br/>`+result[1].substring(0,119)+'...' : `<b>${field.customField.label}</b><br/>`+result[1]
                    }
                }
            }
            
            return null
        }
    }
}
