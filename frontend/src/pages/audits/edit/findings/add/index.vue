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
        <div class="col-xl-10 offset-xl-1 col-12">
            <q-table
            class="sticky-header-table-addfinding"
            :columns="dtVulnHeaders"
            :rows="vulnerabilities"
            :filter="search"
            :filter-method="customFilter"
            v-model:pagination="vulnPagination"
            row-key="_id"
            separator="none"
            :loading="loading"
            >
                <template v-slot:top>
                    <q-select 
                    class="col-md-2"
                    v-model="dtLanguage" 
                    :label="$t('language')" 
                    :options="languages" 
                    option-value="locale" 
                    option-label="language"
                    map-options
                    emit-value
                    @update:model-value="getVulnerabilities"
                    options-sanitize
                    outlined
                    />
                    <q-space />
                    <q-input v-model="findingTitle" :label="$t('title')" class="q-pl-md col-md-6" @keyup.enter="addFinding()" outlined>
                        <template v-slot:append>
                            <q-btn-dropdown :label="$t('btn.create')" no-caps flat>
                                <q-list separator>
                                    <q-item-label header>{{$t('selectCategory')}}</q-item-label>
                                    <q-item clickable v-close-popup @click="addFinding()">
                                        <q-item-section>
                                        <q-item-label>{{$t('noCategory')}}</q-item-label>
                                        </q-item-section>
                                    </q-item>
                                    <q-item v-for="category of vulnCategories" :key="category.name" clickable v-close-popup @click="addFinding(category)">
                                        <q-item-section>
                                        <q-item-label>{{category.name}}</q-item-label>
                                        </q-item-section>
                                    </q-item>
                                </q-list>
                            </q-btn-dropdown>
                        </template>
                    </q-input>
                </template>

                <template v-slot:top-row="props">
                    <q-tr>
                        <q-td style="width: 60%">
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.title"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td style="width: 20%">
                            <q-select
                            dense
                            :label="$t('search')"
                            v-model="search.category"
                            clearable
                            :options="vulnCategoriesOptions"
                            options-sanitize
                            outlined
                            />
                        </q-td>
                        <q-td style="width: 20%">
                            <q-select
                            dense
                            :label="$t('search')"
                            v-model="search.vulnType"
                            clearable
                            :options="vulnTypeOptions"
                            options-sanitize
                            outlined
                            />
                        </q-td>
                        <q-td></q-td>
                    </q-tr>
                </template>

                <template v-slot:body="props">
                    <q-tr :props="props">
                        <q-td key="title" :props="props">
                            {{props.row.detail.title}}
                            <q-btn dense round flat :icon="props.expand ? 'arrow_drop_up' : 'arrow_drop_down'" @click="props.expand = !props.expand" />
                        </q-td>
                        <q-td key="category" :props="props">
                            {{props.row.category || $t('noCategory')}}
                        </q-td>
                        <q-td key="vulnType" :props="props">
                            {{props.row.detail.vulnType || $t('undefined')}}
                        </q-td>
                        <q-td key="action" :props="props" style="width:1px">
                            <q-btn flat color="primary" icon="fa fa-plus-circle" @click="addFindingFromVuln(props.row)">
                                <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.addToFindings')}}</q-tooltip>                            
                            </q-btn>
                        </q-td>
                    </q-tr>
                    <q-tr v-show="props.expand" :props="props">
                        <q-td colspan="100%" class="bg-grey-4">
                            <div class="editor__content" style="white-space: initial" v-html="htmlEncode(props.row.detail.description)"></div>
                        </q-td>
                    </q-tr>
                </template>

                <template v-slot:bottom="scope">
                    <span v-if="vulnerabilities.length === 1">{{filteredRowsCount}} / 1 {{$t('vulnerabilityNum1')}}</span>                
                    <span v-else>{{filteredRowsCount}} / {{vulnerabilities.length}} {{$t('vulnerabilitiesNums')}}</span>  
                    <q-space />
                    <span>{{$t('resultsPerPage')}}</span>
                    <q-select
                    class="q-px-md"
                    v-model="vulnPagination.rowsPerPage"
                    :options="rowsPerPageOptions"
                    emit-value
                    map-options
                    dense
                    options-dense
                    options-cover
                    borderless
                    />
                    <q-pagination input v-model="vulnPagination.page" :max="scope.pagesNumber" />            
                </template> 
        
            </q-table>
        </div>
    </div>
</template>

<script src='./add.js'></script>

<style scoped>
.content {
    margin-top: 50px;
}
</style>