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
                color="primary" 
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
                <q-separator vertical inset class="q-mr-sm" />
            <q-btn
            v-if="auditParent.type === 'default'"
            color="orange"
            class="q-mr-sm"
            :label="$q.screen.gt.sm ? $t('btn.backupFinding') : ''"
            :icon="$q.screen.gt.sm ? void 0 : 'fa fa-database'"
            no-caps
            @click="backupFinding()"
            >
                <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">
                    {{$t('btn.backupFinding')}}
                </q-tooltip>
            </q-btn>
            <q-btn
            color="negative"
            class="q-mr-sm"
            :label="$q.screen.gt.sm ? $t('btn.delete') : ''"
            :icon="$q.screen.gt.sm ? void 0 : 'delete'"
            no-caps
            @click="deleteFinding()"
            v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT && auditParent.type === 'default'"
            >
                <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">
                    {{$t('btn.delete')}}
                </q-tooltip>
            </q-btn>
            <q-btn
            v-if="auditParent.type === 'retest'"
            data-testid="retest-split-view-toggle"
            color="primary"
            :flat="!retestSplitView" 
            :outline="retestSplitView"
            :class="{'bg-grey-3': retestSplitView}"
            icon="vertical_split"
            :ripple="false"
            @click="toggleSplitView()"
            class="q-mr-sm" 
            >
                <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.retestSplitView')}}</q-tooltip> 
            </q-btn>
            <q-btn
            v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
            outline
            :color="saveButtonColor"
            :text-color="saveButtonTextColor"
            :icon="$q.screen.gt.sm ? void 0 : (saveButtonState === 'saved' ? 'check' : 'save')"
            unelevated
            no-caps
            @click="updateFinding()"
            >
                <q-icon v-if="$q.screen.gt.sm && saveButtonState === 'saved'" name="check" class="q-mr-sm" />
                <span v-if="$q.screen.gt.sm">{{ saveButtonLabel }}</span>
                <q-icon
                    v-if="saveButtonState === 'dirty'"
                    data-testid="save-unsaved-badge"
                    name="circle"
                    size="12px"
                    :class="$q.screen.gt.sm ? 'q-ml-sm' : 'q-ml-xs'"
                />
                <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">
                    {{ saveButtonLabel }}
                </q-tooltip>
            </q-btn>
        </template>
    </breadcrumb>

    <div class="row" v-if="auditParent.type === 'default'">
        <q-tabs data-testid="finding-tabs-bar" v-model="selectedTab" align="left" indicator-color="primary" active-bg-color="grey-3" class="bg-white full-width top-fixed">
            <q-tab name="definition" default :label="$t('definition')" />
            <q-tab name="proofs" :label="$t('proofs')"/>
            <q-tab name="details" :label="$t('details')" />
            <template v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"> 
            <q-separator vertical />
            <q-toggle data-testid="finding-completed-toggle" :label="$t('completed')" v-model="finding.status" :true-value=0 :false-value=1 checked-icon="check" unchecked-icon="clear" color="green" />
            </template>
            <q-space />
        </q-tabs>

        <div class="row full-width content">
            <q-tab-panels v-model="selectedTab" animated class="bg-transparent" :class="(commentMode)?'col-8':'col-xl-8 offset-xl-2 col-12'" @before-transition="syncEditors" @transition="updateOrig" >
                <q-tab-panel name="definition" class="finding-tab-panel">
                    <div class="finding-form-section">
                        <div class="finding-form-section__header">
                            <q-icon name="fa fa-file-alt" />
                            <span>{{$t('details')}}</span>
                        </div>
                        <div class="row q-col-gutter-md">
                            <q-input
                            ref="titleField"
                            for="titleField"
                            class="col-md-8 col-12"
                            :class="{'highlighted-border': fieldHighlighted == 'titleField' && commentMode}"
                            label-slot
                            stack-label v-model="finding.title"
                            outlined
                            :rules="[val => !!val || $t('fieldIsRequired')]"
                            :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                            >
                            <template v-slot:label>
                                {{$t('title')}} <span class="text-red">*</span>
                            </template>
                            <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment('titleField')">
                                <q-icon name="add_comment" size="xs" />
                            </q-badge>
                            </q-input>
                            <q-select
                            ref="typeField"
                            id="typeField"
                            class="col-md-4 col-12"
                            :class="{'highlighted-border': fieldHighlighted == 'typeField' && commentMode}"
                            label-slot
                            v-model="finding.vulnType"
                            :options="vulnTypesLang"
                            option-value="name"
                            option-label="name"
                            emit-value
                            map-options
                            options-sanitize
                            outlined
                            :rules="($settings.report.public.requiredFields.findingType) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                            lazy-rules="ondemand"
                            :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                            >
                                <template v-slot:label>
                                    {{$t('type')}} <span v-if="$settings.report.public.requiredFields.findingType" class="text-red">*</span>
                                </template>
                                <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment('typeField')">
                                    <q-icon name="add_comment" size="xs" />
                                </q-badge>
                            </q-select>
                        </div>
                    </div>

                    <div class="finding-form-section">
                        <div class="finding-form-section__header">
                            <q-icon name="fa fa-align-left" />
                            <span>{{$t('description')}}</span>
                        </div>
                        <q-field
                        ref="descriptionField"
                        for="descriptionField"
                        class="basic-editor q-pt-none"
                        :class="{'highlighted-border': fieldHighlighted == 'descriptionField' && commentMode}"
                        label-slot
                        borderless
                        stack-label
                        :rules="($settings.report.public.requiredFields.findingDescription) ? [val => !!finding.description || $t('fieldIsRequired')] : ['']"
                        lazy-rules="ondemand"
                        >
                            <template v-slot="control">
                                <basic-editor
                                ref="basiceditor_description"
                                noSync
                                v-model="finding.description"
                                :editable="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
                                fieldName="descriptionField"
                                :commentMode="commentMode && canCreateComment"
                                :focusedComment="focusedComment"
                                :commentIdList="commentIdList"
                                />
                            </template>
                            <template v-slot:label>
                                <div id="descriptionField">
                                    {{$t('description')}} <span v-if="$settings.report.public.requiredFields.findingDescription" class="text-red">*</span>
                                </div>
                            </template>
                        </q-field>
                        <q-field
                        ref="observationField"
                        for="observationField"
                        class="basic-editor q-pt-none q-mt-md"
                        :class="{'highlighted-border': fieldHighlighted == 'observationField' && commentMode}"
                        borderless
                        label-slot
                        stack-label
                        :rules="($settings.report.public.requiredFields.findingObservation) ? [val => !!finding.observation || $t('fieldIsRequired')] : ['']"
                        lazy-rules="ondemand"
                        >
                            <template v-slot="control">
                                <basic-editor
                                ref="basiceditor_observation"
                                noSync
                                v-model="finding.observation"
                                :editable="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
                                fieldName="observationField"
                                :commentMode="commentMode && canCreateComment"
                                :focusedComment="focusedComment"
                                :commentIdList="commentIdList"
                                />
                            </template>
                            <template v-slot:label>
                                <div id="observationField">
                                    {{$t('observation')}} <span v-if="$settings.report.public.requiredFields.findingObservation" class="text-red">*</span>
                                </div>
                            </template>
                        </q-field>
                    </div>

                    <div class="finding-form-section">
                        <div class="finding-form-section__header">
                            <q-icon name="fa fa-link" />
                            <span>{{$t('references')}}</span>
                        </div>
                        <q-field
                        class="q-pt-none"
                        bg-color="transparent"
                        borderless
                        :class="{'highlighted-border': fieldHighlighted == 'referencesField' && commentMode}"
                        >
                            <textarea-array
                            ref="referencesField"
                            id="referencesField"
                            class="q-pt-none"
                            :label="$t('references')+' '+$t('one_per_line')"
                            v-model="finding.references"
                            :rules="($settings.report.public.requiredFields.findingReferences) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                            :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT" />
                            <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment('referencesField')">
                                <q-icon name="add_comment" size="xs" />
                            </q-badge>
                        </q-field>
                    </div>

                    <q-expansion-item
                    class="finding-form-section finding-form-section--expansion"
                    :label="$t('customFields')"
                    v-if="finding.customFields && finding.customFields.length > 0"
                    default-opened
                    header-class="finding-form-section__header finding-form-section__header--expansion">
                        <custom-fields
                        ref="customfields"
                        v-model="finding.customFields"
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
                    </q-expansion-item>
                </q-tab-panel>
                <q-tab-panel name="proofs" class="finding-tab-panel">
                    <div class="finding-form-section">
                        <div class="finding-form-section__header">
                            <q-icon name="fa fa-flask" />
                            <span>{{$t('proofs')}}</span>
                        </div>
                        <q-field
                        ref="pocField"
                        for="pocField"
                        class="basic-editor q-pt-none"
                        :class="{'highlighted-border': fieldHighlighted == 'pocField' && commentMode}"
                        borderless
                        label-slot
                        stack-label
                        :rules="($settings.report.public.requiredFields.findingProofs) ? [val => !!finding.poc || $t('fieldIsRequired')] : ['']"
                        lazy-rules="ondemand"
                        >
                            <template v-slot="control">
                                <basic-editor
                                ref="basiceditor_poc"
                                noSync
                                v-model="finding.poc"
                                :editable="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
                                fieldName="pocField"
                                :commentMode="commentMode && canCreateComment"
                                :focusedComment="focusedComment"
                                :commentIdList="commentIdList"
                                />
                            </template>
                            <template v-slot:label>
                                <div id="pocField">
                                    {{$t('proofs')}} <span v-if="$settings.report.public.requiredFields.findingProofs" class="text-red">*</span>
                                </div>
                            </template>
                        </q-field>
                    </div>
                </q-tab-panel>
                <q-tab-panel name="details" class="finding-tab-panel">
                    <div class="finding-form-section">
                        <div class="finding-form-section__header">
                            <q-icon name="fa fa-crosshairs" />
                            <span>{{$t('affectedAssets')}}</span>
                        </div>
                        <q-field
                        ref="affectedField"
                        for="affectedField"
                        class="basic-editor q-pt-none"
                        :class="{'highlighted-border': fieldHighlighted == 'affectedField' && commentMode}"
                        borderless
                        label-slot
                        stack-label
                        :rules="($settings.report.public.requiredFields.findingAffected) ? [val => !!finding.scope || $t('fieldIsRequired')] : ['']"
                        lazy-rules="ondemand"
                        >
                            <template v-slot="control">
                                <basic-editor
                                v-model="finding.scope"
                                :toolbar="['format', 'marks', 'list']"
                                :editable="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
                                fieldName="affectedField"
                                :commentMode="commentMode && canCreateComment"
                                :focusedComment="focusedComment"
                                :commentIdList="commentIdList"
                            />
                            </template>
                            <template v-slot:label>
                                {{$t('affectedAssets')}} <span v-if="$settings.report.public.requiredFields.findingAffected" class="text-red">*</span>
                            </template>
                        </q-field>
                    </div>

                    <div class="finding-form-section" v-if="$settings.report.public.scoringMethods.CVSS3 || $settings.report.public.scoringMethods.CVSS4">
                        <div class="finding-form-section__header">
                            <q-icon name="fa fa-shield-alt" />
                            <span>{{$t('cvssScore')}}</span>
                        </div>
                        <div
                        id="cvss3Field"
                        v-if="$settings.report.public.scoringMethods.CVSS3"
                        class="finding-form-subsection"
                        :class="{'highlighted-border': fieldHighlighted == 'cvss3Field' && commentMode}"
                        >
                            <cvss3-calculator
                            v-model="finding.cvssv3"
                            :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                            />
                            <q-badge v-if="commentMode && canCreateComment" data-testid="cvss3-comment-button" color="deep-purple" floating class="cursor-pointer" @click="createComment('cvss3Field')">
                                <q-icon name="add_comment" size="xs" />
                            </q-badge>
                        </div>
                        <div
                        id="cvss4Field"
                        v-if="$settings.report.public.scoringMethods.CVSS4"
                        class="finding-form-subsection"
                        :class="{'highlighted-border': fieldHighlighted == 'cvss4Field' && commentMode}"
                        >
                            <cvss4-calculator
                            v-model="finding.cvssv4"
                            :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                            />
                            <q-badge v-if="commentMode && canCreateComment" data-testid="cvss4-comment-button" color="deep-purple" floating class="cursor-pointer" @click="createComment('cvss4Field')">
                                <q-icon name="add_comment" size="xs" />
                            </q-badge>
                        </div>
                    </div>

                    <div class="finding-form-section">
                        <div class="finding-form-section__header">
                            <q-icon name="fa fa-tools" />
                            <span>{{$t('remediation')}}</span>
                        </div>
                        <div class="q-col-gutter-md row">
                            <q-select
                            ref="remediationDifficultyField"
                            id="remediationDifficultyField"
                            label-slot
                            stack-label
                            class="col-md-6 col-12"
                            :class="{'highlighted-border': fieldHighlighted == 'remediationDifficultyField' && commentMode}"
                            v-model="finding.remediationComplexity"
                            :options="[{label: $t('easy'), value: 1},{label: $t('medium'), value: 2},{label: $t('complex'), value: 3}]"
                            map-options
                            emit-value
                            options-sanitize
                            outlined
                            :rules="($settings.report.public.requiredFields.findingRemediationDifficulty) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                            lazy-rules="ondemand"
                            :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                            >
                                <template v-slot:label>
                                    {{$t('remediationDifficulty')}} <span v-if="$settings.report.public.requiredFields.findingRemediationDifficulty" class="text-red">*</span>
                                </template>
                                <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment('remediationDifficultyField')">
                                    <q-icon name="add_comment" size="xs" />
                                </q-badge>
                            </q-select>
                            <q-select
                            ref="priorityField"
                            id="priorityField"
                            label-slot
                            stack-label
                            class="col-md-6 col-12"
                            :class="{'highlighted-border': fieldHighlighted == 'priorityField' && commentMode}"
                            v-model="finding.priority"
                            :options="[{label: $t('low'), value: 1},{label: $t('medium'), value: 2},{label: $t('high'), value: 3},{label: $t('urgent'), value: 4}]"
                            map-options
                            emit-value
                            options-sanitize
                            outlined
                            :rules="($settings.report.public.requiredFields.findingPriority) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                            lazy-rules="ondemand"
                            :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                            >
                                <template v-slot:label>
                                    {{$t('priority')}} <span v-if="$settings.report.public.requiredFields.findingPriority" class="text-red">*</span>
                                </template>
                                <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment('priorityField')">
                                    <q-icon name="add_comment" size="xs" />
                                </q-badge>
                            </q-select>
                        </div>
                        <q-field
                        ref="remediationField"
                        for="remediationField"
                        class="basic-editor q-mt-md"
                        :class="{'highlighted-border': fieldHighlighted == 'remediationField' && commentMode}"
                        borderless
                        label-slot
                        stack-label
                        :rules="($settings.report.public.requiredFields.findingRemediation) ? [val => !!finding.remediation || $t('fieldIsRequired')] : ['']"
                        lazy-rules="ondemand"
                        >
                            <template v-slot="control">
                                <basic-editor
                                ref="basiceditor_remediation"
                                noSync
                                v-model="finding.remediation"
                                :editable="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
                                fieldName="remediationField"
                                :commentMode="commentMode && canCreateComment"
                                :focusedComment="focusedComment"
                                :commentIdList="commentIdList"
                                />
                            </template>
                            <template v-slot:label>
                                {{$t('remediation')}} <span v-if="$settings.report.public.requiredFields.findingRemediation" class="text-red">*</span>
                            </template>
                        </q-field>
                    </div>
                </q-tab-panel>
            </q-tab-panels>
    
            <q-card v-if="commentMode" class="col-3 bg-grey-11 sidebar-comments">
                <q-scroll-area class="scrollarea-comments">
                    <comments-list 
                    height="calc(100vh - 214px)"
                    v-model:comments="auditParent.comments"
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
    </div>

    <!-- RETEST VIEW -->

    <div class="row content-retest" v-if="auditParent.type === 'retest'">
        <div class="row q-pa-md" :class="(commentMode) ? 'col-8' : (retestSplitView) ? 'col-12' : 'col-xl-8 col-12 offset-xl-2'">
            <q-splitter
            v-model="retestSplitRatio" 
            :limits="retestSplitLimits" 
            style="width: 100%;" 
            after-class="after-class" 
            separator-class="bg-blue-grey-2"
            :separator-style="(retestSplitView) ? 'width: 4px' : 'display:none'"
            :disable="!retestSplitView"
            >
                <template v-slot:before>
                    <div class="row full-width">
                        <q-card class="full-width">
                            <!-- <q-card :class="(retestSplitView) ? '' :'col-xl-8 col-12 offset-xl-2'"> -->
                            <q-card-section class="row q-col-gutter-md">
                                <q-input
                                class="col-md-8 col-12" 
                                :label="$t('title')"
                                stack-label
                                v-model="finding.title"
                                outlined
                                readonly
                                />
                                <q-select
                                class="col-md-4 col-12"
                                :label="$t('type')"
                                v-model="finding.vulnType" 
                                :options="vulnTypesLang" 
                                option-value="name" 
                                option-label="name" 
                                emit-value 
                                map-options
                                options-sanitize
                                outlined
                                readonly
                                />
                                <q-field
                                id="retestStatusField"
                                borderless
                                bg-color="transparent"
                                class="col-12"
                                :class="{'highlighted-border': fieldHighlighted == 'retestStatusField' && commentMode}"
                                >
                                    <q-radio keep-color color="green" v-model="finding.retestStatus" val="ok" :label="$t('corrected')" />
                                    <q-radio keep-color color="red" v-model="finding.retestStatus" val="ko" :label="$t('not_corrected')" />
                                    <q-radio keep-color color="orange" v-model="finding.retestStatus" val="partial" :label="$t('partially_corrected')" />
                                    <q-radio keep-color color="brown" v-model="finding.retestStatus" val="unknown" :label="$t('not_verifiable')" />
                                    <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment('retestStatusField')">
                                        <q-icon name="add_comment" size="xs" />
                                    </q-badge>
                                </q-field>
                                
                                <q-field
                                ref="retestDescriptionField"
                                for="retestDescriptionField"
                                class="col-12 basic-editor"
                                :class="{'highlighted-border': fieldHighlighted == 'retestDescriptionField' && commentMode}"
                                label-slot
                                borderless
                                stack-label
                                :rules="($settings.report.public.requiredFields.retestDescription) ? [val => !!finding.retestDescription || $t('fieldIsRequired')] : ['']"
                                lazy-rules="ondemand"
                                >
                                    <template v-slot="control">
                                        <basic-editor
                                        ref="basiceditor_retestdescription"
                                        v-model="finding.retestDescription"
                                        :editable="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
                                        fieldName="retestDescriptionField"
                                        :commentMode="commentMode && canCreateComment"
                                        :focusedComment="focusedComment"
                                        :commentIdList="commentIdList"
                                        />
                                    </template>
                                    <template v-slot:label>
                                        <div id="retestDescriptionField">
                                            {{$t('description')}} <span v-if="$settings.report.public.requiredFields.retestDescription" class="text-red">*</span>
                                        </div>
                                    </template>
                                </q-field>
                            </q-card-section>
                        </q-card>
                    </div>
                </template>
                <template v-slot:separator>
                    <q-icon color="primary" name="fas fa-grip-lines-vertical" size="sm" />
                </template>
                <template v-slot:after>
                    <q-card v-if="retestSplitView" data-testid="retest-original-panel">
                        <q-card-section class="row q-col-gutter-md">
                            <q-input
                            class="col-md-8 col-12" 
                            :label="$t('title')"
                            stack-label
                            v-model="finding.title"
                            outlined
                            readonly
                            />
                            <q-select
                            class="col-md-4 col-12"
                            :label="$t('type')"
                            v-model="finding.vulnType" 
                            :options="vulnTypesLang" 
                            option-value="name" 
                            option-label="name" 
                            emit-value 
                            map-options
                            options-sanitize
                            outlined
                            readonly
                            />
                            <q-field
                            class="col-md-12 basic-editor q-pt-none"
                            :label="$t('description')"
                            borderless
                            stack-label
                            >
                                <template v-slot="control">
                                    <basic-editor ref="basiceditor_description" noSync v-model="finding.description" :editable="false"/>
                                </template>
                            </q-field>
                            <q-field
                            class="col-md-12 basic-editor q-pt-none"
                            borderless
                            :label="$t('observation')"
                            stack-label
                            >
                                <template v-slot="control">
                                    <basic-editor ref="basiceditor_observation" noSync v-model="finding.observation" :editable="false"/>
                                </template>
                            </q-field>
                            <textarea-array
                            class="col-12"
                            :label="$t('references')+' '+$t('one_per_line')"
                            v-model="finding.references"
                            readonly
                            />
                        </q-card-section>
                        <q-card-section>
                            <q-field
                            class="col-md-12 basic-editor"
                            borderless
                            :label="$t('proofs')"
                            stack-label
                            >
                                <template v-slot="control">
                                    <basic-editor ref="basiceditor_poc" noSync v-model="finding.poc" :editable="false"/>
                                </template>
                            </q-field>
                        </q-card-section>
                        <q-card-section>
                            <q-field 
                            class="col-md-12 basic-editor"
                            borderless
                            :label="$t('affectedAssets')"
                            stack-label
                            >
                                <template v-slot="control">
                                    <basic-editor v-model="finding.scope" :editable="false"/>
                                </template>
                            </q-field>
                        </q-card-section>
                        <q-card-section v-if="$settings.report.public.scoringMethods.CVSS3">
                            <cvss3-calculator 
                            v-model="finding.cvssv3"
                            readonly
                            />
                        </q-card-section>
                        <q-card-section v-if="$settings.report.public.scoringMethods.CVSS4">
                            <cvss4-calculator 
                            v-model="finding.cvssv4"
                            readonly
                            />
                        </q-card-section>
                        <q-card-section>{{$t('courseOfActions')}}</q-card-section>
                        <q-separator />
                        <q-card-section>
                            <div class="q-col-gutter-md row">
                                <q-select
                                :label="$t('remediationDifficulty')"
                                stack-label
                                class="col-md-6 col-12"
                                v-model="finding.remediationComplexity"
                                :options="[{label: $t('easy'), value: 1},{label: $t('medium'), value: 2},{label: $t('complex'), value: 3}]"
                                map-options
                                emit-value
                                options-sanitize
                                outlined
                                readonly
                                />
                                <q-select
                                :label="$t('priority')"
                                stack-label
                                class="col-md-6 col-12"
                                v-model="finding.priority"
                                :options="[{label: $t('low'), value: 1},{label: $t('medium'), value: 2},{label: $t('high'), value: 3},{label: $t('urgent'), value: 4}]"
                                map-options
                                emit-value
                                options-sanitize
                                outlined
                                readonly
                                />
                            </div>
                        </q-card-section>
                        <q-card-section class="q-pt-none">
                            <q-field
                            class="col-md-12 basic-editor"
                            :label="$t('remediation')"
                            borderless
                            stack-label
                            >
                                <template v-slot="control">
                                    <basic-editor ref="basiceditor_remediation" noSync v-model="finding.remediation" :editable="false"/>
                                </template>
                            </q-field>
                        </q-card-section>
                        <q-expansion-item 
                        :label="$t('customFields')"
                        v-if="finding.customFields && finding.customFields.length > 0"
                        default-opened
                        header-class="bg-blue-grey-5 text-white" 
                        expand-icon-class="text-white">
                            <custom-fields 
                            v-model="finding.customFields" 
                            custom-element="QCardSection" 
                            no-sync-editor
                            readonly
                            />
                        </q-expansion-item>
                    </q-card>
                </template>
            </q-splitter>
        </div>

        <q-card v-if="commentMode" class="col-3 bg-grey-11 sidebar-comments">
            <q-scroll-area class="scrollarea-comments-retest">
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

<script src='./edit.js'></script>

<style scoped>
.sortable-drag img {
    position: relative;
    max-width: 600px!important;
    max-height: 600px!important;
}
.paragraph-ghost .sortable-ghost img {
    max-width: 600px!important;
    max-height: 600px!important;
}

.after-class {
    height: calc(100vh - 132px)!important;
}

.top-fixed {
    position: fixed;
    top: 100px;
    left: 472px;
    right: 0;
    width: auto !important;
    z-index: 1000;
}

.scrollarea-comments {
    height: calc(100vh - 152px)!important;
}

.scrollarea-comments-retest {
    height: calc(100vh - 104px)!important;
}

.content {
    margin-top: 100px;
}

.content-retest {
    margin-top: 50px;
}

.finding-tab-panel {
    background: #F5F6FA;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px 24px;
}

.body--dark .finding-tab-panel {
    background: #121212;
}

.finding-form-section {
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    padding: 20px;
    flex-shrink: 0;
}

.body--dark .finding-form-section {
    background: #1e1e1e;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.finding-form-section__header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: #6B7280;
    margin-bottom: 16px;
}

.finding-form-section--expansion {
    padding: 0;
    border-radius: 10px;
}

.finding-form-section__header--expansion {
    margin-bottom: 0;
    padding: 20px;
    text-transform: uppercase;
    color: #6B7280;
}

.finding-form-subsection + .finding-form-subsection {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.body--dark .finding-form-subsection + .finding-form-subsection {
    border-top-color: rgba(255, 255, 255, 0.1);
}
</style>
