import { Notify, Dialog } from 'quasar';

import BasicEditor from 'components/editor';
import Breadcrumb from 'components/breadcrumb';
import CustomFields from 'components/custom-fields';

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import UserService from '@/services/user';
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
            fieldHighlighted: "",
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

        this.$parent.focusedComment = null
        if (this.$route.params.comment)
            this.focusComment(this.$route.params.comment)
    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false)
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
                    Notify.create({
                        message: $t('msg.sectionUpdateOk'),
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

        // *** Comments Handling ***

        toggleCommentView: function() {
            Utils.syncEditors(this.$refs)
            this.$parent.commentMode = !this.$parent.commentMode
            if (this.$parent.commentMode) {
                this.$parent.commentSplitRatio = 80
                this.$parent.commentSplitLimits = [80, 80]
            }
            else {
                this.$parent.commentSplitRatio = 100
                this.$parent.commentSplitLimits = [100, 100]
            }
        },

        focusComment: function(comment) {
            if (
                (!!this.$parent.editComment && this.$parent.editComment !== comment._id) || 
                (this.$parent.replyingComment && !comment.replyTemp) || 
                (this.$parent.focusedComment === comment._id)
            )
                return

            if (comment.findingId && this.findingId !== comment.findingId) {
                this.$router.replace({name: 'editFinding', params: {
                    auditId: this.auditId, 
                    findingId: comment.findingId, 
                    comment: comment
                }})
                return
            }

            if (comment.sectionId && this.sectionId !== comment.sectionId) {
                this.$router.replace({name: 'editSection', params: {
                    auditId: this.auditId, 
                    sectionId: comment.sectionId, 
                    comment: comment
                }})
                return
            }

            let checkCount = 0
            const intervalId = setInterval(() => {
                checkCount++
                if (document.getElementById(comment.fieldName)) {
                    clearInterval(intervalId)
                    this.$nextTick(() => {
                        document.getElementById(comment.fieldName).scrollIntoView({block: "center"})
                    })
                }
                else if (checkCount >= 10) {
                    clearInterval(intervalId)
                }
            }, 100)

            this.fieldHighlighted = comment.fieldName
            this.$parent.focusedComment = comment._id

        },

        createComment: function(fieldName) {
            let comment = {
                _id: 42,
                sectionId: this.sectionId,
                fieldName: fieldName,
                authorId: UserService.user.id,
                author: {
                    firstname: UserService.user.firstname,
                    lastname: UserService.user.lastname
                },
                text: "" 
            }
            if (this.$parent.editComment === 42){
                this.$parent.focusedComment = null
                this.$parent.audit.comments.pop()
            }
            this.fieldHighlighted = fieldName
            this.$parent.audit.comments.push(comment)
            this.$parent.editComment = 42
            this.focusComment(comment)
        },

        cancelEditComment: function(comment) {
            this.$parent.editComment = null
            if (comment._id === 42) {
                this.$parent.audit.comments.pop()
                this.fieldHighlighted = ""
            }
        },

        deleteComment: function(comment) {
            AuditService.deleteComment(this.auditId, comment._id)
            .then(() => {
                if (this.$parent.focusedComment === comment._id)
                    this.fieldHighlighted = ""
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
                    author: UserService.user.id,
                    text: comment.replyTemp
                })
            }
            if (comment._id === 42) { 
                AuditService.createComment(this.auditId, comment)
                .then((res) => {
                    let newComment = res.data.datas
                    this.$parent.editComment = null
                    this.$parent.focusedComment = newComment._id
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
            else {
                
                AuditService.updateComment(this.auditId, comment)
                .then(() => {
                    this.$parent.editComment = null
                    this.$parent.editReply = null
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
        },

        removeReplyFromComment: function(reply, comment) {
            comment.replies = comment.replies.filter(e => e._id !== reply._id)
            this.updateComment(comment)
        },

        displayComment: function(comment) {
            let response = true
            if ((this.$parent.commentsFilter === 'active' && comment.resolved)|| (this.$parent.commentsFilter === 'resolved' && !comment.resolved))
                response = false
            return response
        },

        numberOfFilteredComments: function() {
            let count = this.$parent.audit.comments.length
            if (this.$parent.commentsFilter === 'active')
                count = this.$parent.audit.comments.filter(e => !e.resolved).length
            else if (this.$parent.commentsFilter === 'resolved')
                count = this.$parent.audit.comments.filter(e => e.resolved).length
            
            if (count === 1)
                return `${count} ${$t('item')}`
            else
                return `${count} ${$t('items')}`
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