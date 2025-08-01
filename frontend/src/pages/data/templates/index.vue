<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-table
                class="sticky-header-table"
                :columns="dtHeaders"
                :rows="templates"
                :filter="search"
                :filter-method="customFilter"
                v-model:pagination="pagination"
                row-key="name"
                :loading="loading"
                @row-dblclick="dblClick"
            >
                <template v-slot:top>
                    <q-space />
                    <q-btn 
                    v-if="userStore.isAllowed('templates:create')"
                    unelevated
                    :label="$t('createTemplate')"
                    color="secondary" 
                    no-caps
                    @click="cleanCurrentTemplate; $refs.createModal.show()"
                    />     
                </template>

                <template v-slot:top-row="props">
                    <q-tr>
                        <q-td style="width: 50%">
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.name"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td style="width: 50%">
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.ext"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td></q-td>
                    </q-tr>
                </template>

                <template v-slot:body-cell-action="props">
                    <q-td style="width:1px">
                        <q-btn v-if="userStore.isAllowed('templates:update')" size="sm" flat color="primary" icon="fa fa-edit" @click="clone(props.row); $refs.editModal.show()">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.edit')}}</q-tooltip>
                        </q-btn>
                        <q-btn size="sm" flat color="info" icon="fa fa-download" @click="downloadTemplate(props.row)">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.download')}}</q-tooltip>
                        </q-btn>
                        <q-btn v-if="userStore.isAllowed('templates:delete')" size="sm" flat color="negative" icon="fa fa-trash" @click="confirmDeleteTemplate(props.row)">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.delete')}}</q-tooltip>
                        </q-btn>
                    </q-td>
                </template>
                
                <template v-slot:bottom="scope">
                    <span v-if="templates.length === 1">1 {{$t('quantifier')}}{{$t('template')}}</span>                
                    <span v-else>{{templates.length}} {{$t('quantifier')}}{{$t('templates')}}</span>     
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

    <q-dialog ref="createModal" persistent @hide="cleanCurrentTemplate()">
        <q-card style="width:800px">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('createTemplate')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.createModal.hide()" />
            </q-bar>

            <q-card-section>
                <div class="row">
                    <q-input
                    :label="$t('name')+' *'"
                    autofocus
                    class="col-md-12 col-12"
                    stack-label
                    :error="!!errors.name"
                    :error-message="errors.name"
                    @keyup.enter="createTemplate()"
                    v-model="currentTemplate.name" 
                    outlined
                    />
                    
                    <q-field class="col-md-12 col-12" no-error-icon borderless :error="!!errors.file" :error-message="errors.file">
                        <template v-slot:control>
                            <q-uploader
                            class="col-md-12 col-12"
                            :label="$t('file')+' *'"
                            accept='.doc,.docx,.docm,.ppt,.pptx'
                            hide-upload-btn
                            @added="handleFile"
                            color="fixed-primary"
                            />
                        </template>
                    </q-field>
                </div>
            </q-card-section>

            <q-separator />

            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.createModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="createTemplate()">{{$t('btn.create')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>

    <q-dialog ref="editModal" persistent @hide="cleanCurrentTemplate()">
        <q-card style="width:800px">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('editTemplate')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.editModal.hide()" />
            </q-bar>

            <q-card-section>
                <div class="row">
                    <q-input
                    :label="$t('name')+' *'"
                    autofocus
                    class="col-md-12 col-12"
                    stack-label
                    :error="!!errors.name"
                    :error-message="errors.name"
                    @keyup.enter="updateTemplate()"
                    v-model="currentTemplate.name" 
                    outlined
                    />
                    
                    <q-field class="col-md-12 col-12" no-error-icon borderless :error="!!errors.file" :error-message="errors.file">
                        <template v-slot:control>
                            <q-uploader
                            class="col-md-12"
                            :label="$t('file')+' *'"
                            accept='.doc,.docx,.docm,.ppt,.pptx'
                            hide-upload-btn
                            @added="handleFile"
                            color="fixed-primary"
                            />
                        </template>
                    </q-field>
                </div>
            </q-card-section>

            <q-separator />

            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.editModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="updateTemplate()">{{$t('btn.update')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script src='./templates.js'></script>

<style></style>