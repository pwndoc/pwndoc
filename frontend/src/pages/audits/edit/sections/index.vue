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
        <q-btn
        v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
        outline
        :color="saveButtonColor"
        :text-color="saveButtonTextColor"
        unelevated
        no-caps
        @click="updateSection"
        >
            <q-icon v-if="saveButtonState === 'saved'" name="check" class="q-mr-sm" />
            <span>{{ saveButtonLabel }}</span>
            <q-icon
                v-if="saveButtonState === 'dirty'"
                data-testid="save-unsaved-badge"
                name="circle"
                size="12px"
                class="q-ml-sm"
            />
        </q-btn>
    </template>
</breadcrumb>

<div class="row content q-ma-md">
    <div class="q-mt-md section-form-section" :class="(commentMode)?'col-8':'col-xl-8 offset-xl-2 col-12'">
        <!-- For retrocompatibility, test if section.text exists -->
        <basic-editor v-if="section.text" ref="basiceditor_section" noSync v-model="section.text" :editable="frontEndAuditState === AUDIT_VIEW_STATE.EDIT" />
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
    </div>
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
            :editable="canEditComments"
            :can-update="canManageAuditComments('update')"
            :can-delete="canManageAuditComments('delete')"
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
    background: #F5F6FA;
}

.body--dark .content {
    background: #121212;
}

.section-form-section {
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    padding: 20px;
}

.body--dark .section-form-section {
    background: #1e1e1e;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.24);
}
</style>
