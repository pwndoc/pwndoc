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
                v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
                outline
                :color="saveButtonColor"
                :text-color="saveButtonTextColor"
                unelevated
                no-caps
                @click="updateAuditGeneral"
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

    <div class="row content q-pa-md">
        <div class="col-xl-8 offset-xl-2 col-12 general-form-body">
            <div class="general-form-section">
                <div class="general-form-section__header">
                    <q-icon name="fa fa-file-alt" />
                    <span>{{$t('details')}}</span>
                </div>
                <div class="row q-col-gutter-md">
                    <q-input
                    ref="nameField"
                    class="col-md-6 col-12"
                    label-slot
                    v-model="audit.name"
                    outlined
                    :rules="[val => !!val || $t('fieldIsRequired')]"
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT">
                        <template v-slot:label>
                            {{$t('name')}} <span class="text-red">*</span>
                        </template>
                    </q-input>
                    <div class="col"></div>
                    <q-select
                    class="col-md-6 col-12 q-pt-none"
                    :label="$t('language')"
                    v-model="audit.language"
                    :options="languages"
                    option-value="locale"
                    option-label="language"
                    emit-value
                    map-options
                    options-sanitize
                    outlined
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                    />
                    <q-select
                    class="col-md-6 col-12 q-pt-none"
                    :label="$t('template')"
                    v-model="audit.template"
                    :options="templates"
                    option-value="_id"
                    option-label="name"
                    emit-value
                    map-options
                    options-sanitize
                    outlined
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                    />
                </div>
            </div>

            <div class="general-form-section">
                <div class="general-form-section__header">
                    <q-icon name="fa fa-users" />
                    <span>{{$t('people')}}</span>
                </div>
                <div class="row q-col-gutter-md">
                    <q-select
                    ref="companyField"
                    class="col-md-6 col-12"
                    label-slot
                    v-model="audit.company"
                    :options="selectCompanies"
                    option-value="_id"
                    option-label="name"
                    input-debounce="0"
                    @new-value="createSelectCompany"
                    @update:model-value="filterClients()"
                    @filter="filterSelectCompany"
                    clearable
                    options-sanitize
                    use-input
                    outlined
                    :rules="($settings.report.public.requiredFields.company) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                    lazy-rules="ondemand"
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                    >
                        <template v-slot:label>
                            {{$t('company')}} <span v-if="$settings.report.public.requiredFields.company" class="text-red">*</span>
                        </template>
                    </q-select>
                    <q-select
                    ref="clientField"
                    class="col-md-6 col-12"
                    label-slot
                    stack-label
                    v-model="audit.client"
                    :options="selectClients"
                    option-value="email"
                    option-label="email"
                    @update:model-value="setCompanyFromClient"
                    clearable
                    options-sanitize
                    outlined
                    :rules="($settings.report.public.requiredFields.client) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                    lazy-rules="ondemand"
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                    >
                        <template v-slot:label>
                            {{$t('client')}} <span v-if="$settings.report.public.requiredFields.client" class="text-red">*</span>
                        </template>
                    </q-select>
                    <q-select
                    class="col-md-12 col-12 q-pt-none"
                    :label="$t('collaborators')"
                    stack-label
                    v-model="audit.collaborators"
                    :options="collaborators"
                    option-value="username"
                    :option-label="(item) => (item)? item.firstname+' '+item.lastname: 'undefined'"
                    multiple
                    use-chips
                    options-sanitize
                    outlined
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                    >
                        <template v-slot:after>
                            <q-chip
                            class="q-mt-lg"
                            color="blue-grey-5"
                            text-color="white"
                            dense
                            >
                                {{audit.creator.firstname}} {{audit.creator.lastname}}
                            </q-chip>
                        </template>
                        <template v-slot:selected-item="scope">
                            <q-chip
                            dense
                            :removable="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
                            @remove="scope.removeAtIndex(scope.index)"
                            :tabindex="scope.tabindex"
                            color="blue-grey-5"
                            text-color="white"
                            >
                                {{scope.opt.firstname}} {{scope.opt.lastname}}
                            </q-chip>
                        </template>
                    </q-select>
                    <q-select
                    v-if="$settings.reviews.enabled"
                    class="col-md-12 col-12"
                    :label="$t('reviewers')"
                    stack-label
                    v-model="audit.reviewers"
                    :options="reviewers"
                    option-value="username"
                    :option-label="(item) => (item)? item.firstname+' '+item.lastname: 'undefined'"
                    multiple
                    use-chips
                    options-sanitize
                    outlined
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                    >
                        <template v-slot:selected-item="scope">
                            <q-chip
                            dense
                            :removable="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
                            @remove="scope.removeAtIndex(scope.index)"
                            :tabindex="scope.tabindex"
                            color="blue-grey-5"
                            text-color="white"
                            >
                                {{scope.opt.firstname}} {{scope.opt.lastname}}
                            </q-chip>
                        </template>
                    </q-select>
                </div>
            </div>

            <div class="general-form-section">
                <div class="general-form-section__header">
                    <q-icon name="event" />
                    <span>{{$t('timeline')}}</span>
                </div>
                <div class="row q-col-gutter-md">
                    <q-input
                    ref="dateStartField"
                    class="col-md-4 col-12"
                    label-slot
                    v-model="audit.date_start"
                    :rules="($settings.report.public.requiredFields.dateStart) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                    lazy-rules="ondemand"
                    outlined
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT">
                        <template v-slot:append>
                            <q-icon name="event" class="cursor-pointer">
                            <q-popup-proxy ref="qDateStartProxy" transition-show="scale" transition-hide="scale">
                                <q-date :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT" first-day-of-week="1" mask="YYYY-MM-DD" v-model="audit.date_start"  />
                            </q-popup-proxy>
                            </q-icon>
                        </template>
                        <template v-slot:label>
                            {{$t('startDate')}} <span v-if="$settings.report.public.requiredFields.dateStart" class="text-red">*</span>
                        </template>
                    </q-input>
                    <q-input
                    ref="dateEndField"
                    class="col-md-4 col-12"
                    label-slot
                    v-model="audit.date_end"
                    :rules="($settings.report.public.requiredFields.dateEnd) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                    lazy-rules="ondemand"
                    outlined
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT">
                        <template v-slot:append>
                            <q-icon name="event" class="cursor-pointer">
                            <q-popup-proxy ref="qDateEndProxy" transition-show="scale" transition-hide="scale">
                                <q-date :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT" first-day-of-week="1" mask="YYYY-MM-DD" v-model="audit.date_end" @update:model-value="() => $refs.qDateEndProxy.hide()" />
                            </q-popup-proxy>
                            </q-icon>
                        </template>
                        <template v-slot:label>
                            {{$t('endDate')}} <span v-if="$settings.report.public.requiredFields.dateEnd" class="text-red">*</span>
                        </template>
                    </q-input>
                    <q-input
                    ref="dateReportField"
                    class="col-md-4 col-12"
                    label-slot
                    v-model="audit.date"
                    :rules="($settings.report.public.requiredFields.dateReport) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                    lazy-rules="ondemand"
                    outlined
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT">
                        <template v-slot:append>
                            <q-icon name="event" class="cursor-pointer">
                            <q-popup-proxy ref="qDateProxy" transition-show="scale" transition-hide="scale">
                                <q-date :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT" first-day-of-week="1" mask="YYYY-MM-DD" v-model="audit.date" @update:model-value="() => $refs.qDateProxy.hide()" />
                            </q-popup-proxy>
                            </q-icon>
                        </template>
                        <template v-slot:label>
                            {{$t('reportingDate')}} <span v-if="$settings.report.public.requiredFields.dateReport" class="text-red">*</span>
                        </template>
                    </q-input>
                </div>
            </div>

            <div class="general-form-section">
                <div class="general-form-section__header">
                    <q-icon name="fa fa-crosshairs" />
                    <span>{{$t('auditScope')}}</span>
                </div>
                <textarea-array
                ref="scopeField"
                :label="$t('auditScope')"
                v-model="audit.scope"
                :rules="($settings.report.public.requiredFields.scope) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"/>
            </div>

            <div class="general-form-section general-form-section--expansion" v-if="audit.customFields && audit.customFields.length > 0">
                <q-expansion-item
                :label="$t('customFields')"
                default-opened
                header-class="general-form-section__header general-form-section__header--expansion"
                expand-icon-class="text-grey-7">
                    <custom-fields
                    ref="customfields"
                    v-model="audit.customFields"
                    custom-element="QCardSection"
                    no-sync-editor
                    :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                    :locale="audit.language"
                    />
                </q-expansion-item>
            </div>
        </div>
    </div>
</template>

<script src='./general.js'></script>

<style scoped>
.content {
    margin-top: 50px;
    background: #F5F6FA;
}

.body--dark .content {
    background: #121212;
}

.general-form-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.general-form-section {
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    padding: 20px;
}

.body--dark .general-form-section {
    background: #1e1e1e;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.general-form-section__header {
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

.general-form-section--expansion {
    padding: 0;
    overflow: hidden;
}

.general-form-section__header--expansion {
    margin-bottom: 0;
    padding: 20px;
    text-transform: uppercase;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.02em;
    color: #6B7280;
}
</style>