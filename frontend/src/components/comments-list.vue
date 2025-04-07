<template>
    <div>
    <q-item>
        <q-item-section>
            <span class="text-h6">{{$t('comments')}}</span>
        </q-item-section>
        <q-item-section>
            <span>{{numberOfFilteredComments}}</span>
        </q-item-section>
        <q-item-section side>
            <q-btn outline icon="o_filter_alt">
                <q-menu anchor="bottom end" self="top end">
                    <q-list>
                        <q-item clickable @click="(commentsFilter === 'active')?commentsFilter = 'all':commentsFilter = 'active'">
                            <q-item-section :class="{'invisible': commentsFilter !== 'active'}" side class="q-pr-sm">
                                <q-icon size="xs" name="done" />
                            </q-item-section>
                            <q-item-section>
                                <span>{{$t('activeOnly')}}</span>
                            </q-item-section>
                        </q-item>
                        <q-item clickable @click="(commentsFilter === 'resolved')?commentsFilter = 'all':commentsFilter = 'resolved'">
                            <q-item-section :class="{'invisible': commentsFilter !== 'resolved'}" side class="q-pr-sm">
                                <q-icon size="xs" name="done" />
                            </q-item-section>
                            <q-item-section>
                                <span>{{$t('resolvedOnly')}}</span>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-menu>
            </q-btn>
        </q-item-section>
    </q-item>
    <q-scroll-area class="comment-panel-height">
        <q-list class="bg-grey-11">
            <div v-for="comment in comments" :key="comment._id" :id="`sidebar-${comment._id}`">
                <q-item v-if="displayComment(comment)">
                    <q-item-section @click="focusComment(comment)">
                        <q-card :class="{'highlighted-border': focusedComment === comment._id, 'bg-blue-grey-1': comment.resolved, 'text-grey-8': comment.resolved}">
                            <!-- Resolved Header -->
                            <q-item v-if="comment.resolved">
                                <q-item-section>
                                    <div>
                                        <q-icon class="q-mr-sm" name="done" color="green" />
                                        <span class="text-bold">{{$t('resolved')}}</span>
                                    </div>
                                </q-item-section>
                                <q-item-section side>
                                    <div v-if="!editComment && !replyingComment && !editReply">
                                        <q-btn v-if="canUpdateComment" size="sm" dense flat color="primary" icon="undo" @click="comment.resolved = false; updateComment(comment)">
                                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
                                                {{(comment.resolved)?$t('tooltip.reopenComment'):$t('tooltip.resolveComment')}}
                                            </q-tooltip> 
                                        </q-btn>
                                        <q-btn v-if="canDeleteComment" size="sm" dense flat color="negative" icon="delete" @click.stop="deleteComment(comment)">
                                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{$t('tooltip.deleteComment')}}</q-tooltip> 
                                        </q-btn>
                                    </div>
                                </q-item-section>
                            </q-item>
                            <q-separator v-if="comment.resolved" />
                            <!-- Header -->
                            <q-item class="q-pb-none">
                                <q-item-section>
                                    <span class="text-bold">
                                    {{(comment.author && comment.author.firstname)?comment.author.firstname:''}}
                                    {{(comment.author && comment.author.lastname)?comment.author.lastname:''}}
                                    </span>
                                </q-item-section>
                                <q-item-section side v-if="!comment.resolved">
                                    <div v-if="!editComment && !replyingComment && !editReply" class="q-gutter-xs">
                                        <q-btn v-if="!comment.resolved && canUpdateComment" size="sm" dense flat color="primary" icon="edit" @click="editCommentClicked(comment)">
                                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{$t('tooltip.editComment')}}</q-tooltip> 
                                        </q-btn>
                                        <q-btn v-if="canUpdateComment" size="sm" dense flat color="green" icon="done" @click="comment.resolved = true; updateComment(comment)">
                                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
                                                {{(comment.resolved)?$t('tooltip.reopenComment'):$t('tooltip.resolveComment')}}
                                            </q-tooltip> 
                                        </q-btn>
                                        <q-btn v-if="canDeleteComment" size="sm" dense flat color="negative" icon="delete" @click.stop="deleteComment(comment)">
                                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{$t('tooltip.deleteComment')}}</q-tooltip> 
                                        </q-btn>
                                    </div>
                                </q-item-section>
                            </q-item>
                            <!-- Comment -->
                            <q-item class="q-pt-none">
                                <q-item-section>
                                    <div v-if="editComment === comment._id" class="q-gutter-sm">
                                        <q-input
                                        v-model="comment.textTemp"
                                        autogrow
                                        outlined
                                        dense
                                        autofocus
                                        :placeholder="$t('startConversation')"
                                        />
                                        <q-btn class="float-right" outline color="primary" icon="close" @click="cancelEditComment(comment)"></q-btn>
                                        <q-btn class="float-right" unelevated color="blue-10" icon="done" @click="updateComment(comment)"></q-btn>
                                    </div>
                                    <span v-else style="white-space: pre-line">{{comment.text}}</span>
                                    <span v-if="focusedComment === comment._id && editComment !== comment._id" class="text-caption">{{new Date(comment.createdAt).toLocaleDateString(systemLanguage, commentDateOptions)}}</span>
                                </q-item-section>
                            </q-item>
                            <!-- Replies -->
                            <q-item v-for="reply of comment.replies" :key="reply._id" class="q-ml-md" @mouseover="hoverReply = reply._id" @mouseleave="hoverReply = null">
                                <q-item-section>
                                    <span class="text-bold">
                                        {{(reply.author && reply.author.firstname)?reply.author.firstname:''}}
                                        {{(reply.author && reply.author.lastname)?reply.author.lastname:''}}
                                    </span>
                                    <div v-if="editReply === reply._id" class="q-gutter-sm">
                                        <q-input 
                                        v-model="reply.textTemp"
                                        autogrow
                                        outlined
                                        dense
                                        />
                                        <q-btn class="float-right" outline color="primary" icon="close" @click="editReply = null"></q-btn>
                                        <q-btn class="float-right" unelevated color="blue-10" icon="done" @click="reply.text = reply.textTemp; updateComment(comment)"></q-btn>
                                    </div>
                                    <span v-else style="white-space: pre-line">{{reply.text}}</span>
                                    <span v-if="focusedComment === comment._id && editReply !== reply._id" class="text-caption">{{new Date(reply.createdAt).toLocaleDateString(systemLanguage, commentDateOptions)}}</span>
                                </q-item-section>
                                <q-item-section side top v-show="hoverReply === reply._id && !editReply && !comment.resolved && comment._id === focusedComment">
                                    <div v-if="!editComment && !replyingComment" class="q-gutter-xs">
                                        <q-btn v-if="canUpdateComment" size="sm" dense flat color="primary" icon="edit" @click="editReply = reply._id; reply.textTemp = reply.text">
                                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{$t('tooltip.editReply')}}</q-tooltip> 
                                        </q-btn>
                                        <q-btn v-if="canDeleteComment" size="sm" dense flat color="negative" icon="delete" @click="removeReplyFromComment(reply, comment)">
                                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{$t('tooltip.deleteReply')}}</q-tooltip> 
                                        </q-btn>
                                    </div>
                                </q-item-section>
                            </q-item>
                            <!-- Reply input -->
                            <q-item v-if="editComment !== comment._id && !comment.resolved && canUpdateComment">
                                <q-item-section>
                                    <div class="q-gutter-sm">
                                        <q-input
                                        v-model="comment.replyTemp"
                                        autogrow
                                        outlined
                                        dense
                                        :placeholder="(editComment || replyingComment || editReply)?$t('anotherCommentInProgress'):$t('reply')"
                                        :disable="!!editComment || !!editReply || (replyingComment && !comment.replyTemp)"
                                        />
                                        <template v-if="comment.replyTemp">
                                            <q-btn class="float-right" outline color="primary" icon="close" @click="comment.replyTemp = null" />
                                            <q-btn class="float-right" unelevated color="blue-10" icon="send" @click="updateComment(comment)"/>
                                        </template>
                                    </div>
                                </q-item-section>
                            </q-item>
                        </q-card>
                    </q-item-section>
                </q-item>
            </div>
        </q-list>
    <!-- </q-card> -->
    </q-scroll-area>
    </div>
</template>

<script>
import { LocalStorage } from 'quasar';
import { $t } from '@/boot/i18n'

import UserService from '@/services/user';

export default {
    name: 'comments-list',
    props: {
        height: {
            type: String,
            default: "calc(100vh)"
        },
        comments: {
            type: Array,
            default: () => []
        },
        editComment: {
            type: String,
            default: ""
        },
        focusedComment: {
            type: String,
            default: ""
        },
        editReply: {
            type: String,
            default: ""
        },
        selectedTab: {
            type: String,
            default: ""
        },
        updateComment: {
            type: Function,
            default: () => {}
        },
        deleteComment: {
            type: Function,
            default: () => {}
        },
        focusComment: {
            type: Function,
            default: () => {}
        }
    },

    data() {
        return {
            auditId: "",
            findingId: "",
            sectionId: "",
            commentsFilter: "all", // [all, active, resolved]
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

    created: function() {
        this.auditId = this.$route.params.auditId
        if (this.$route.params.findingId) this.findingId = this.$route.params.findingId
        if (this.$route.params.sectionId) this.sectionId = this.$route.params.sectionId
    },

    mounted: function() {
        document.documentElement.style.setProperty("--comment-height", this.height);
    },

    computed: {
        replyingComment: function() {
            return this.comments.some(comment => !!comment.replyTemp)
        },

        systemLanguage: function() {
			return LocalStorage.getItem('system_language') || 'en-US'
		},

        canUpdateComment: function() {
            return UserService.isAllowed('audits:comments:update')
        },

        canDeleteComment: function() {
            return UserService.isAllowed('audits:comments:delete')
        },

        numberOfFilteredComments: function() {
            let count = this.comments.length
            if (this.commentsFilter === 'active')
                count = this.comments.filter(e => !e.resolved).length
            else if (this.commentsFilter === 'resolved')
                count = this.comments.filter(e => e.resolved).length
            
            if (count === 1)
                return `${count} ${$t('item')}`
            else
                return `${count} ${$t('items')}`
        }
    },

    methods: {
        removeReplyFromComment: function(reply, comment) {
            comment.replies = comment.replies.filter(e => e._id !== reply._id)
            this.updateComment(comment)
        },

        displayComment: function(comment) {
            let response = true
            if ((this.commentsFilter === 'active' && comment.resolved)|| (this.commentsFilter === 'resolved' && !comment.resolved))
                response = false
            return response
        },

        editCommentClicked: function(comment) {
            this.$emit('update:editComment', comment._id)
            comment.textTemp = comment.text
            this.focusComment(comment)
        },

        cancelEditComment: function(comment) {
            this.$emit('update:editComment', null)
            delete comment.textTemp
        }
    }
}
</script>

<style scoped>
.comment-panel-height {
    height: var(--comment-height)!important;
}
</style>