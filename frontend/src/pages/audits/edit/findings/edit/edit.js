import { Notify, Dialog } from 'quasar';

import BasicEditor from 'components/editor/Editor.vue';
import Breadcrumb from 'components/breadcrumb';
import Cvss3Calculator from 'components/cvss3calculator'
import Cvss4Calculator from 'components/cvss4calculator'
import TextareaArray from 'components/textarea-array'
import CustomFields from 'components/custom-fields'
import CommentsList from 'components/comments-list'
import AuditQaSidebar from '@/components/audit-qa-sidebar.vue'
import AiChatDrawer from '@/components/ai-chat-drawer.vue'

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import AiService from '@/services/ai';
import { useUserStore } from 'src/stores/user'
import VulnService from '@/services/vulnerability';
import AiFieldHelper from '@/services/ai-field-helper';
import { useAiGenerationStore } from '@/stores/ai-generation';
import { useAuditQaStore } from '@/stores/audit-qa';
import { runAfterAiGenerationCheck } from '@/composables/confirmLeaveIfAiGenerating';
import Utils from '@/services/utils';
import { createDraftRecovery } from '@/composables/useDraftRecovery';

import { $t } from '@/boot/i18n'

const userStore = useUserStore()
const SAVE_SUCCESS_TIMEOUT_MS = 2000

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
            aiPromptFieldKeys: [],
            aiFieldPrompts: [],
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
        'auditDrawerOpen',
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
        CommentsList,
        AuditQaSidebar,
        AiChatDrawer
    },

    mounted: async function() {
        this.auditId = this.$route.params.auditId;
        this.findingId = this.$route.params.findingId;
        this.getFinding();
        this.getVulnTypes();
        this.loadAiEnabledFieldKeys();

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
        if (this.draftRecovery)
            this.draftRecovery.stop()
        this.clearSaveSuccess()
    },

    beforeRouteLeave (to, from , next) {
        if (to.name === '404' || to.name === '403') {
            next()
            return
        }

        runAfterAiGenerationCheck(() => {
            this.continueRouteLeave(to, from, next)
        })
    },

    beforeRouteUpdate (to, from , next) {
        runAfterAiGenerationCheck(() => {
            this.continueRouteUpdate(to, from, next)
        })
    },

    watch: {
        finding: {
            handler() {
                if (this.saveSuccess && this.unsavedChanges())
                    this.clearSaveSuccess()
            },
            deep: true
        }
    },

    computed: {
        vulnTypesLang: function() {
            return this.vulnTypes.filter(type => type.locale === this.auditParent.language);
        },

        screenshotsSize: function() {
            return ((JSON.stringify(this.uploadedImages).length) / 1024).toFixed(2)
        },

        canCreateComment: function() {
            return userStore.isAllowed('audits:comments:create') && this.canManageAuditComments('create')
        },

        canEditComments: function() {
            return this.canManageAuditComments('update') || this.canManageAuditComments('delete')
        },

        aiEnabled: function() {
            return this.$settings?.ai?.public?.enabled !== false && userStore.isAllowed('audits:ai-generate')
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
        },

        qaDrawerOpen: function() {
            return useAuditQaStore().drawerOpen
        },

        aiDrawerOpen: function() {
            return useAiGenerationStore().drawerOpen
        },

        sidePanelOpen: function() {
            return this.commentMode || this.qaDrawerOpen || this.aiDrawerOpen
        },

        aiQaEnabled: function() {
            return this.$settings?.ai?.public?.enabled !== false &&
                userStore.isAllowed('audits:ai-qa')
        },

        findingTabsBarStyle: function() {
            const hasDesktopDrawer = this.auditDrawerOpen && this.$q.screen.gt.sm
            return {
                left: hasDesktopDrawer ? '400px' : '0px'
            }
        },
    },

    methods: {
        continueRouteLeave: function(to, from, next) {
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

        continueRouteUpdate: function(to, from, next) {
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

        loadAiEnabledFieldKeys: function() {
            if (!this.aiEnabled) {
                this.aiPromptFieldKeys = []
                this.aiFieldPrompts = []
                return
            }

            AiService.getEnabledFields('finding')
            .then((data) => {
                const fields = data.data.datas?.fields || []
                this.aiFieldPrompts = fields
                this.aiPromptFieldKeys = fields.map((field) => String(field.fieldKey || ''))
            })
            .catch(() => {
                this.aiPromptFieldKeys = []
                this.aiFieldPrompts = []
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
                    this.setupDraftRecovery()
                    this.draftRecovery.maybePromptRecovery()
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

        updateFindingIfEditable: function() {
            if (this.frontEndAuditState === this.AUDIT_VIEW_STATE.EDIT)
                this.updateFinding()
        },

        setupDraftRecovery: function() {
            if (this.draftRecovery)
                return

            this.draftRecovery = createDraftRecovery(this, {
                scope: () => 'audit-finding',
                refKey: () => `${this.auditId}:${this.findingId}`,
                userId: () => userStore.id,
                getCurrent: () => this.finding,
                setCurrent: (data) => {
                    this.finding = data
                },
                getOriginal: () => this.findingOrig,
                isDirty: () => this.unsavedChanges(),
                isReadOnly: () => this.frontEndAuditState !== this.AUDIT_VIEW_STATE.EDIT,
                syncBeforeCapture: () => Utils.syncEditors(this.$refs),
                afterRestore: async () => {
                    await this.$nextTick()
                }
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
                    if (this.draftRecovery)
                        this.draftRecovery.clearDraft()
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
                        this.$router.push(`/audits/${this.auditParent._id}/findings/add`)
                    else if (currentIndex === this.auditParent.findings.length - 1)
                        this.$router.push(`/audits/${this.auditParent._id}/findings/${this.auditParent.findings[currentIndex - 1]._id}`)
                    else
                        this.$router.push(`/audits/${this.auditParent._id}/findings/${this.auditParent.findings[currentIndex + 1]._id}`)
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

        getCustomFieldAiKey: function(customFieldId) {
            return `custom-field:${customFieldId}`
        },

        canGenerateAi: function(fieldKey) {
            return this.aiEnabled && this.aiPromptFieldKeys.includes(fieldKey)
        },

        buildAiLockKey: function(fieldKey) {
            return `finding:${this.auditId}:${this.findingId}:${fieldKey}`
        },

        isAiFieldLoading: function(fieldKey) {
            return useAiGenerationStore().isFieldGenerating(this.buildAiLockKey(fieldKey))
        },

        isAiFieldLocked: function(fieldKey) {
            return useAiGenerationStore().isFieldLocked(this.buildAiLockKey(fieldKey))
        },

        isFieldEditable: function(fieldKey) {
            return this.frontEndAuditState === this.AUDIT_VIEW_STATE.EDIT &&
                !this.isAiFieldLocked(fieldKey)
        },

        generateDescriptionDraftAI: function() {
            return this.generateFieldDraftAI('description')
        },

        generateCustomFieldDraftAI: function(customField) {
            return this.generateFieldDraftAI(null, customField)
        },

        getAiSelectionTarget: function(field, customField = null) {
            if (customField)
                return this.$refs.customfields?.getAiSelectionTarget?.(customField) || null

            if (field === 'references')
                return this.$refs.referencesField || null

            return this.$refs[`basiceditor_${field}`] || null
        },

        generateFieldDraftAI: async function(field, customField = null) {
            const fieldKey = customField ? this.getCustomFieldAiKey(customField?.customField?._id) : field
            if (!fieldKey || !this.canGenerateAi(fieldKey))
                return

            if (this.frontEndAuditState !== this.AUDIT_VIEW_STATE.EDIT || this.isAiFieldLoading(fieldKey))
                return

            this.prepareSidePanel('ai')

            const lockKey = this.buildAiLockKey(fieldKey)
            const aiStore = useAiGenerationStore()
            if (aiStore.drawerOpen && aiStore.isActive && aiStore.lockKey !== lockKey) {
                Notify.create({
                    message: $t('aiChat.activeSession'),
                    color: 'warning',
                    textColor: 'dark',
                    position: 'top-right'
                })
                return
            }

            Utils.syncEditors(this.$refs)

            const selectionTarget = this.getAiSelectionTarget(field, customField)
            const selection = selectionTarget?.getTextSelection?.()
            const outputType = AiFieldHelper.getOutputType(field, customField)
            const fieldLabel = AiFieldHelper.getFieldLabel(field, customField, fieldKey)
            const baseContext = AiFieldHelper.buildFindingAiContext(this.finding, customField)
            const requestParams = {
                entityType: 'finding',
                field: fieldKey,
                locale: this.auditParent.language,
                outputType,
                context: baseContext
            }

            try {
                if (selection?.text) {
                    const draft = await AiFieldHelper.runSelectionAiChat({
                        title: `AI - ${fieldLabel}`,
                        selectedText: selection.text,
                        outputType,
                        lockKey,
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
                    this.aiFieldPrompts,
                    fieldKey,
                    baseContext
                )

                const draft = await AiFieldHelper.runFieldAiChat({
                    title: `AI - ${fieldLabel}`,
                    defaultPrompt,
                    outputType,
                    lockKey,
                    requestParams
                })

                if (!draft)
                    return

                AiFieldHelper.applyFieldDraft({
                    draft,
                    outputType,
                    setValue: (value) => {
                        if (customField)
                            customField.text = value
                        else
                            this.finding[field] = value
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
            }
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

        prepareSidePanel: function(except) {
            if (except !== 'comments' && this.commentMode) {
                this.commentMode = false
                this.focusedComment = ''
                this.fieldHighlighted = null
            }
            if (except !== 'qa')
                useAuditQaStore().close()
            if (except !== 'ai') {
                const aiStore = useAiGenerationStore()
                if (aiStore.isActive)
                    aiStore.cancelSession({ force: true })
            }
        },

        toggleCommentView: function() {
            Utils.syncEditors(this.$refs)
            if (!this.commentMode)
                this.prepareSidePanel('comments')

            this.commentMode = !this.commentMode
            if (!this.commentMode) {
                this.focusedComment = ""
                this.fieldHighlighted = null
            }
            if (this.commentMode && this.retestSplitView)
                this.toggleSplitView()
        },

        toggleQaView: function() {
            const qaStore = useAuditQaStore()
            if (qaStore.drawerOpen) {
                qaStore.close()
                return
            }

            this.prepareSidePanel('qa')
            qaStore.open(this.auditParent._id)
        },

        highlightQaField: function(fieldName) {
            this.fieldHighlighted = fieldName
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
            let detailsFields = ["affectedField", "cvssField", "cvss3Field", "cvss4Field", "remediationDifficultyField", "priorityField", "remediationField"]

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
                this.scrollSidebarCommentIntoView(newComment._id, "end")
                this.updateFindingIfEditable()
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
                this.updateFindingIfEditable()
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
                    this.updateFindingIfEditable()
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
