import { Notify, Dialog } from 'quasar';

import BasicEditor from 'components/editor/Editor.vue';
import Breadcrumb from 'components/breadcrumb';
import CustomFields from 'components/custom-fields';
import CommentsList from 'components/comments-list';

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import AiFieldHelper from '@/services/ai-field-helper';
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
            aiEnabled: false,
            aiPromptFieldKeys: [],
            aiPromptMappings: [],
            aiGeneratingFields: {},
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
        this.getAiPromptsConfig();

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
            return userStore.isAllowed('audits:comments:create') 
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

        getAiPromptsConfig: function() {
            DataService.getAiPrompts()
            .then((data) => {
                const payload = data.data.datas || {}
                this.aiEnabled = payload.aiEnabled !== false
                this.aiPromptMappings = (payload.promptMappings || [])
                .filter((mapping) => String(mapping.entityType || '') === 'section')
                this.aiPromptFieldKeys = this.aiPromptMappings
                .filter((mapping) => mapping.enabled !== false)
                .map((mapping) => String(mapping.fieldKey || ''))
            })
            .catch(() => {
                this.aiEnabled = false
                this.aiPromptFieldKeys = []
                this.aiPromptMappings = []
            })
        },

        getCustomFieldAiKey: function(customFieldId) {
            return `custom-field:${customFieldId}`
        },

        canGenerateAi: function(fieldKey) {
            return this.aiEnabled && this.aiPromptFieldKeys.includes(fieldKey)
        },

        isAiFieldLoading: function(fieldKey) {
            return !!this.aiGeneratingFields[fieldKey]
        },

        generateCustomFieldDraftAI: async function(customField) {
            const fieldKey = this.getCustomFieldAiKey(customField?.customField?._id)
            if (!fieldKey || !this.canGenerateAi(fieldKey))
                return

            if (this.frontEndAuditState !== this.AUDIT_VIEW_STATE.EDIT || this.isAiFieldLoading(fieldKey))
                return

            Utils.syncEditors(this.$refs)

            const selectionTarget = this.$refs.customfields?.getAiSelectionTarget?.(customField)
            const selection = selectionTarget?.getTextSelection?.()
            const outputType = AiFieldHelper.getOutputType(null, customField)
            const fieldLabel = AiFieldHelper.getFieldLabel(null, customField, fieldKey)
            const baseContext = AiFieldHelper.buildSectionAiContext(this.section, customField)
            const requestParams = {
                entityType: 'section',
                field: fieldKey,
                locale: this.auditParent.language,
                outputType,
                context: baseContext
            }

            this.aiGeneratingFields[fieldKey] = true

            try {
                if (selection?.text) {
                    const draft = await AiFieldHelper.runSelectionAiChat({
                        title: `AI - ${fieldLabel}`,
                        selectedText: selection.text,
                        outputType,
                        requestParams: {
                            ...requestParams,
                            context: {
                                ...baseContext,
                                selectedText: selection.text,
                                selectedHtml: selection.html || selection.text
                            }
                        }
                    })

                    if (!draft)
                        return

                    AiFieldHelper.applySelectionDraft({
                        selectionTarget,
                        selection,
                        draft,
                        outputType
                    })

                    Notify.create({
                        message: AiFieldHelper.appliedMessage(),
                        color: 'positive',
                        textColor: 'white',
                        position: 'top-right'
                    })
                    return
                }

                const defaultPrompt = AiFieldHelper.getDefaultPrompt(
                    this.aiPromptMappings,
                    'section',
                    fieldKey,
                    baseContext
                )

                const draft = await AiFieldHelper.runFieldAiChat({
                    title: `AI - ${fieldLabel}`,
                    defaultPrompt,
                    outputType,
                    requestParams
                })

                if (!draft)
                    return

                AiFieldHelper.applyFieldDraft({
                    draft,
                    outputType,
                    setValue: (value) => {
                        customField.text = value
                    }
                })

                Notify.create({
                    message: AiFieldHelper.appliedFieldMessage(),
                    color: 'positive',
                    textColor: 'white',
                    position: 'top-right'
                })
            } catch (err) {
                Notify.create({
                    message: err.response?.data?.datas || err.message || 'Unable to generate AI draft',
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            } finally {
                this.aiGeneratingFields[fieldKey] = false
            }
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
                this.updateSection()
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
                this.updateSection()
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
                    this.updateSection()
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
            if ((this.section.text || this.sectionOrig.text) && this.section.text !== this.sectionOrig.text)
                return true

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
