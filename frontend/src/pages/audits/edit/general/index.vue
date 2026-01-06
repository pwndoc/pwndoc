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
            <q-btn v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT" color="positive" :label="$t('btn.save')+' (ctrl+s)'" no-caps @click="updateAuditGeneral" />
        </template>
    </breadcrumb>

    <div class="row content q-pa-md">
        <q-card class=" col-xl-8 offset-xl-2 col-12">
            <q-card-section>
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
            </q-card-section>

            <q-card-section></q-card-section>

            <q-card-section>
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
            </q-card-section>

            <q-card-section></q-card-section>

            <q-card-section>
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
            </q-card-section>

            <q-card-section class="q-pt-none">
                <textarea-array
                ref="scopeField"
                :label="$t('auditScope')" 
                v-model="audit.scope" 
                :rules="($settings.report.public.requiredFields.scope) ? [val => !!val || $t('fieldIsRequired')] : ['']"
                :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"/>
            </q-card-section>
            <q-expansion-item 
            :label="$t('customFields')"
            v-if="audit.customFields && audit.customFields.length > 0"
            default-opened
            header-class="bg-blue-grey-5 text-white" 
            expand-icon-class="text-white">
                <custom-fields 
                ref="customfields" 
                v-model="audit.customFields" 
                custom-element="QCardSection" 
                no-sync-editor
                :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                :locale="audit.language"
                />
            </q-expansion-item>
        </q-card>
    </div>
</template>

<script src='./general.js'></script>

<style scoped>
.content {
    margin-top: 50px;
}
</style>