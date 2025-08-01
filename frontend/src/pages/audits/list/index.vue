<template>
    <div class="row">
        <div v-if="languages.length === 0" class="col-md-4 offset-md-4 q-mt-md">
            <p>{{$t('noLanguage')}}<a href="/data/custom">{{$t('nav.data')}} -> {{$t('customData')}} -> {{$t('language')}}</a></p>
        </div>
        <div v-if="auditTypes.length === 0" class="col-md-4 offset-md-4 q-mt-md">
            <p>{{$t('noAudit')}}<a href="/data/custom">{{$t('nav.data')}} -> {{$t('customData')}} -> {{$t('auditTypes')}}</a></p>
        </div>
        <div v-if="languages.length === 0 || auditTypes.length === 0" class="col-md-4 offset-md-4 q-mt-md">
            <p>{{$t('restoreFromBackup')}} <a href="/settings">{{$t('settings')}} -> {{$t('backups')}}</a></p>
        </div>
        <div v-if="languages.length > 0 && auditTypes.length > 0" class="col-md-10 col-12 offset-md-1 q-mt-md">
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
                    <q-input
                    class="col-md-3"
                    :label="$t('searchFinds')"
                    v-model="search.finding"
                    @keyup.enter="getAudits"
                    outlined
                    >
                        <template v-slot:append>
                            <q-btn flat icon="search" @click="getAudits" />
                            <q-icon v-if="search.finding" name="cancel" @click.stop="search.finding = null; getAudits()" class="cursor-pointer" />
                        </template>
                    </q-input>
                    <q-toggle :label="$t('myAudits')" v-model="myAudits" />
                    <q-toggle v-if="userStore.isAllowed('audits:users-connected')" :label="$t('usersConnected')" v-model="displayConnected" />
                    <q-toggle v-if="$settings.reviews.enabled && (userStore.isAllowed('audits:review') || userStore.isAllowed('audits:review-all'))" :label="$t('awaitingMyReview')" v-model="displayReadyForReview" />
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
                        style="width:17%"
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
                            <div v-else-if="col.name === 'auditType'">
                                <q-select
                                    dense 
                                    :label="$t('search')"
                                    :options="auditTypes"
                                    v-model="search.auditType"
                                    option-value="name"
                                    option-label="name"
                                    map-options
                                    emit-value
                                    clearable
                                    options-sanitize
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
                
                <template v-slot:body-cell-connected="props">
                    <q-td>
                        <q-chip v-if="userStore.isAllowed('audits:users-connected') && props.row.connected && props.row.connected.length > 0" square size="11px">
                            <q-avatar color="green" text-color="white">{{props.row.connected.length}}</q-avatar>
                            {{$t('users')}}
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">
                                {{$t('tooltip.usersConnected')}}
                                <div v-for="(user,idx) of props.row.connected" :key="idx">
                                    {{user}}
                                </div>
                            </q-tooltip>
                        </q-chip>
                    </q-td>
                </template>
                
                <template v-slot:body-cell-reviews="props">
                    <q-td>
                        <audit-state-icon v-if="$settings.reviews.enabled" :approvals="props.row.approvals" :state="props.row.state" />
                    </q-td>
                </template>
                
                <template v-slot:body-cell-action="props">
                    <q-td style="width:1px">
                        <q-btn size="sm" flat color="primary" :to="'/audits/'+props.row._id" icon="fa fa-edit">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.editAudit')}}</q-tooltip> 
                        </q-btn>
                        <q-btn size="sm" flat color="info" @click="generateReport(props.row._id)" icon="fa fa-download">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.downloadReport')}}</q-tooltip> 
                        </q-btn>
                        <q-btn size="sm" flat color="negative" @click="confirmDeleteAudit(props.row)" icon="fa fa-trash">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.deleteAudit')}}</q-tooltip> 
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
                <div>
                    <q-radio v-model="currentAudit.type" val="default" :label="$t('default')" />
                    <q-radio v-model="currentAudit.type" val="multi" :label="$t('multi')" />
                </div>
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
                :label="(modalAuditTypes && modalAuditTypes.length > 0) ? $t('selectAssessment')+' *' : $t('msg.noAuditTypeForThisStage')"
                :error="!!errors.auditType"
                :error-message="errors.auditType"
                v-model="currentAudit.auditType"
                :options="modalAuditTypes"
                option-value="name"
                option-label="name"
                emit-value
                map-options
                options-sanitize
                outlined
                :readonly="!(modalAuditTypes && modalAuditTypes.length > 0)"
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

<script src='./audits-list.js'></script>

<style>
.icon-next-to-button {
    padding: 0 12px;
    font-size: 1.5em!important;
}
</style>