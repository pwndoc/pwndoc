<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-banner v-if="rules.length === 0 && !loading" class="bg-info text-white q-mb-md">
                <template v-slot:avatar>
                    <q-icon name="info" />
                </template>
                {{$t('noRulesFound')}} {{$t('rulesAreLoadedFromGrammarXml')}}
            </q-banner>

            <q-table
                class="sticky-header-table"
                :columns="dtHeaders"
                :rows="rules"
                :filter="search"
                :filter-method="customFilter"
                v-model:pagination="pagination"
                row-key="id"
                :loading="loading"
            >
                <template v-slot:top>
                    <q-space />
                    <q-btn 
                    v-if="canEdit"
                    flat 
                    :label="$t('btn.create')"
                    color="primary" 
                    no-caps
                    icon="add"
                    @click="openCreateDialog()"
                    />    
                </template>

                <template v-slot:top-row="props">
                    <q-tr>
                        <q-td>
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.id"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td>
                            <q-input 
                            dense
                            :label="$t('name')"
                            v-model="search.name"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td></q-td>
                        <q-td></q-td>
                        <q-td></q-td>
                    </q-tr>
                </template>

                <template v-slot:body-cell-ruleXml="props">
                    <q-td>
                        <q-btn 
                            size="sm" 
                            flat 
                            color="primary" 
                            icon="visibility" 
                            :label="$t('view')"
                            @click="viewRule(props.row)"
                        />
                    </q-td>
                </template>

                <template v-slot:body-cell-action="props">
                    <q-td style="width:1px">
                        <q-btn 
                            size="sm" 
                            flat 
                            color="negative" 
                            icon="delete" 
                            v-if="canEdit"
                            @click="confirmDeleteRule(props.row)"
                        >
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">
                                {{$t('tooltip.delete')}}
                            </q-tooltip>
                        </q-btn>
                    </q-td>
                </template>

                <template v-slot:bottom="scope">
                    <span v-if="rules.length === 1">1 {{$t('rule')}}</span>                
                    <span v-else>{{rules.length}} {{$t('rules')}}</span>    
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

    <q-dialog ref="viewModal">
        <q-card style="width:900px; max-width:90vw">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('viewRule')}} - {{selectedRule?.name}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.viewModal.hide()" />
            </q-bar>

            <q-card-section v-if="selectedRule">
                <div class="row q-col-gutter-md">
                    <q-input
                        :label="$t('id')"
                        class="col-md-6"
                        v-model="selectedRule.id" 
                        outlined
                        readonly
                        />
                    <q-input
                        :label="$t('name')"
                        class="col-md-6"
                        v-model="selectedRule.name" 
                        outlined
                        readonly
                        />
                    <q-input
                        :label="$t('language')"
                        class="col-md-12"
                        v-model="selectedRule.language" 
                        outlined
                        readonly
                        />
                    <q-input
                        :label="$t('ruleXml')"
                        class="col-md-12"
                        v-model="selectedRule.ruleXml"
                        type="textarea"
                        rows="20"
                        outlined
                        readonly
                        stack-label
                        />
                </div>
            </q-card-section>

            <q-card-actions align="right">
                <q-btn color="primary" unelevated @click="$refs.viewModal.hide()">{{$t('btn.close')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>

    <q-dialog ref="createModal" persistent @hide="cleanCreateForm()">
        <q-card style="width:900px; max-width:90vw">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('createRule')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.createModal.hide()" />
            </q-bar>

            <q-card-section>
                <div class="row q-col-gutter-md">
                    <q-select
                        :label="$t('language') + ' *'"
                        class="col-md-12"
                        v-model="newRule.language"
                        :options="languages"
                        :loading="loadingLanguages"
                        :error="!!errors.language"
                        :error-message="errors.language"
                        outlined
                        emit-value
                        map-options
                        />
                    <q-input
                        :label="$t('ruleXml') + ' *'"
                        class="col-md-12"
                        v-model="newRule.ruleXml"
                        type="textarea"
                        rows="20"
                        outlined
                        :error="!!errors.ruleXml"
                        :error-message="errors.ruleXml"
                        stack-label
                        placeholder='<?xml version="1.0" encoding="UTF-8"?>
<rules lang="en">
  <rule id="MY_RULE_ID" name="My Rule Name">
    <pattern>
      <token>example</token>
    </pattern>
    <message>This is an example rule</message>
  </rule>
</rules>'
                        />
                    <q-banner v-if="newRule.language" class="bg-info text-white q-mt-sm col-md-12" dense>
                        <template v-slot:avatar>
                            <q-icon name="info" />
                        </template>
                        {{$t('ruleXmlHint')}}
                    </q-banner>
                </div>
            </q-card-section>

            <q-separator />

            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.createModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="createRule()" :loading="creating">{{$t('btn.create')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script src='./languagetool-rules.js'></script>

<style></style>
