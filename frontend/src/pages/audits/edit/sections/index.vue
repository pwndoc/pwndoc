<template>
    <breadcrumb
        buttons
        :title="`${auditParent.name} (${auditParent.auditType || 'Audit Type not set'})`"
        :state="auditParent.state"
        :approvals="auditParent.approvals"
        :path="(auditParent.parentId) ? `/audits/${auditParent.parentId}` : ''"
        :path-name="(auditParent.type === 'retest') ? $t('originalAudit') : (auditParent.type === 'default') ? $t('multi') : ''"
    >
    <template v-slot:buttons>
        <q-btn
        :flat="!commentMode" 
        :outline="commentMode"
        :class="{'bg-grey-3': commentMode}"
        icon="o_mode_comment"
        :ripple="false"
        @click="toggleCommentView()" 
        class="q-mr-sm">
            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">
                {{(commentMode) ? $t('tooltip.hideComments') : $t('tooltip.showComments')}}
            </q-tooltip> 
        </q-btn>
        <q-separator v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT" vertical inset class="q-mr-sm" />
        <q-btn v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT" color="positive" :label="$t('btn.save')+' (ctrl+s)'" no-caps @click="updateSection" />
    </template>
</breadcrumb>

<div class="row content">
    <!-- <div class="row q-pa-md"> -->
        <q-card class="q-ma-md" :class="(commentMode)?'col-8':'col-xl-8 offset-xl-2 col-12'">
            <!-- For retrocompatibility, test if section.text exists -->
            <q-card-section v-if="section.text"> 
                <basic-editor ref="basiceditor_section" noSync v-model="section.text" :editable="frontEndAuditState === AUDIT_VIEW_STATE.EDIT" />
            </q-card-section>
            <custom-fields v-else 
            ref="customfields" 
            v-model="section.customFields" 
            custom-element="QCardSection" 
            no-sync-editor
            :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
            :locale="auditParent.language"
            :commentMode="commentMode"
            :focusedComment="focusedComment"
            :commentIdList="commentIdList"
            :fieldHighlighted="fieldHighlighted"
            :createComment="createComment"
            :canCreateComment="canCreateComment"
            />
        </q-card>
    <!-- </div> -->
    <q-card v-if="commentMode" class="col-3 bg-grey-11 sidebar-comments" style="margin-top:2px">
        <q-scroll-area class="scrollarea-comments">
            <comments-list 
            height="calc(100vh - 166px)"
            :comments="auditParent.comments"
            v-model:editComment="editComment"
            :focusedComment="focusedComment"
            v-model:editReply="editReply"
            :focusComment="focusComment"
            :updateComment="updateComment"
            :deleteComment="deleteComment"
            >
            </comments-list>
        </q-scroll-area>
    </q-card>
</div>
</template>

<script src='./sections.js'></script>

<style scoped>
.scrollarea-comments {
    height: calc(100vh - 104px)!important;
}

.content {
    margin-top: 50px;
}
</style>