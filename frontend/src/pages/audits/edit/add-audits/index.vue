<template>
    <breadcrumb
        buttons
        :title="`${auditParent.name} (${auditParent.auditType || 'Audit Type not set'})`"
        :state="auditParent.state"
        :approvals="auditParent.approvals"
        :path="(auditParent.parentId) ? `/audits/${auditParent.parentId}` : ''"
        :path-name="(auditParent.type === 'retest') ? $t('originalAudit') : (auditParent.type === 'default') ? $t('multi') : ''"
    >
    </breadcrumb>

    <div class="row content q-pa-md">
        <div class="col-xl-10 col-12 offset-xl-1">
            <q-table
                class="sticky-header-table"
                :columns="dtHeaders"
                :visible-columns="visibleColumns"
                :rows="audits"
                :filter="search"
                :filter-method="customFilter"
                v-model:pagination="pagination"
                row-key="_id"
                separator="none"
                :loading="loading"
                @row-dblclick="dblClick"
            >
                <template v-slot:top>
                    <q-toggle :label="$t('myAudits')" v-model="myAudits" />
                    <q-space />
                    <q-btn 
                    color="secondary"
                    unelevated
                    :label="$t('newAudit')"
                    no-caps
                    @click="cleanCurrentAudit(); $refs.createModal.show()"
                    />    
                </template>
            
                <template v-slot:top-row="props">
                    <q-tr>
                        <q-td
                        v-for="col in props.cols"
                        :key="col.name"
                        style="width:20%"
                        >
                            <div v-if="['name', 'users', 'date'].indexOf(col.name) > -1">
                                <q-input 
                                dense
                                :label="$t('search')"
                                v-model="search[col.name]"
                                clearable
                                :autofocus="col.name === 'name'"
                                outlined
                                />
                            </div>
                            <div v-else-if="col.name === 'company'">
                                <q-select
                                    dense 
                                    :label="$t('search')"
                                    :options="companies"
                                    v-model="search.company"
                                    option-value="name"
                                    option-label="name"
                                    map-options
                                    emit-value
                                    clearable
                                    options-sanitize
                                    outlined
                                    />
                            </div>
                            <div v-else-if="col.name === 'language'">
                                <q-select 
                                dense
                                :label="$t('search')"
                                :options="languages"
                                v-model="search.language"
                                option-value="locale"
                                option-label="language"
                                map-options
                                emit-value
                                clearable
                                options-sanitize
                                outlined
                                />
                            </div>
                        </q-td>
                    </q-tr>
                </template>

                <template v-slot:body-cell-language="props">
                    <q-td>
                        {{convertLocale(props.row.language)}}
                    </q-td>
                </template>
                <template v-slot:body-cell-users="props">
                    <q-td>
                        {{convertParticipants(props.row)}}
                    </q-td>
                </template>
                <template v-slot:body-cell-reviews="props">
                    <q-td>
                        <audit-state-icon v-if="$settings.reviews.enabled" :approvals="props.row.approvals" :state="props.row.state" />
                    </q-td>
                </template>
                <template v-slot:body-cell-action="props">
                    <q-td style="width:1px">
                        <q-btn flat color="primary" icon="fa fa-plus-circle" @click="updateAuditParent(props.row)">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.addAudit')}}</q-tooltip>                            
                        </q-btn>
                    </q-td>
                </template>

                <template v-slot:bottom="scope">
                    <span v-if="audits.length === 1">1 {{$t('auditNum1')}}</span>                
                    <span v-else>{{audits.length}} {{$t('auditNums')}}</span> 
                    <q-space />
                    <span>{{$t('resultsPerPage')}}</span>
                    <q-select
                    class="q-px-md"
                    v-model="pagination.rowsPerPage"
                    :options="rowsPerPageOptions"
                    emit-value
                    map-options
                    dense
                    options-dense
                    options-cover
                    borderless
                    />
                    <q-pagination input v-model="pagination.page" :max="scope.pagesNumber" />            
                </template>
            </q-table>
        </div>
    </div>

    <q-dialog ref="createModal" persistent @hide="cleanCurrentAudit()">
        <q-card style="width:800px">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('createAudit')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.createModal.hide()" />
            </q-bar>
            <q-card-section>
                <q-input
                :label="$t('name')+' *'"
                :error="!!errors.name"
                :error-message="errors.name"
                autofocus
                @keyup.enter="createAudit()"
                v-model="currentAudit.name"
                outlined
                />
                <q-select
                :label="$t('selectAssessment')+' *'"
                :error="!!errors.auditType"
                :error-message="errors.auditType"
                v-model="currentAudit.auditType"
                :options="auditTypes"
                option-value="name"
                option-label="name"
                emit-value
                map-options
                options-sanitize
                outlined
                /> 
                <q-select 
                :label="$t('selectLanguage')+' *'"
                :error="!!errors.language"
                :error-message="errors.language"
                v-model="currentAudit.language" 
                :options="languages" 
                option-value="locale" 
                option-label="language" 
                emit-value 
                map-options
                options-sanitize
                outlined
                />
            </q-card-section>

            <q-separator />

            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.createModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="createAudit()">{{$t('btn.create')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script src='./add-audits.js'></script>

<style scoped>
.content {
    margin-top: 50px;
}

.icon-next-to-button {
    padding: 0 12px;
    font-size: 1.5em!important;
}
</style>