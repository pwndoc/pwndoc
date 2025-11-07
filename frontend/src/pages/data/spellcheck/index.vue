<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-table
                class="sticky-header-table"
                :columns="dtHeaders"
                :rows="words"
                :filter="search"
                :filter-method="customFilter"
                v-model:pagination="pagination"
                row-key="word"
                :loading="loading"
            >
                <template v-slot:top>
                    <q-space />
                    <q-btn 
                    unelevated 
                    :label="$t('addWord')"
                    color="secondary" 
                    no-caps
                    @click="cleanCurrentWord(); $refs.createModal.show()"
                    />    
                </template>

                <template v-slot:top-row="props">
                    <q-tr>
                        <q-td>
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.word"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td></q-td>
                    </q-tr>
                </template>

                <template v-slot:body-cell-action="props">
                    <q-td style="width:1px">
                        <q-btn size="sm" flat color="negative" icon="fa fa-trash" @click="confirmDeleteWord(props.row)">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.delete')}}</q-tooltip>
                        </q-btn>
                    </q-td>
                </template>

                <template v-slot:bottom="scope">
                    <span v-if="words.length === 1">1 {{$t('quantifier')}}{{$t('Word')}}</span>                
                    <span v-else>{{words.length}} {{$t('quantifier')}}{{$t('companies')}}</span>    
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

    <q-dialog ref="createModal" persistent @hide="cleanErrors()">
        <q-card style="width:800px">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('addWord')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.createModal.hide()" />
            </q-bar>

            <q-card-section>
                <div class="row q-col-gutter-md">
                    <q-input
                        :label="$t('name')+' *'"
                        autofocus
                        class="col-md-12"
                        :error="!!errors.name"
                        :error-message="errors.name"
                        @keyup.enter="createWord()"
                        v-model="currentWord.name" 
                        outlined
                        hide-bottom-space
                        />
                    <q-input
                        :label="$t('shortName')"
                        class="col-md-12"
                        @keyup.enter="createWord()"
                        v-model="currentWord.shortName" 
                        outlined
                        />
                    <div class="col-md-12">
                        <q-uploader
                            ref="addUploader"
                            class="full-width"
                            url=""
                            :label="$t('logo')"
                            accept='.gif,.jpg,.jpeg,.png'
                            hide-upload-btn
                            @added="handleImage"
                            color="fixed-primary"
                        />
                    </div>
                </div>
            </q-card-section>

            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.createModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="createWord()">{{$t('btn.create')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script src='./spellcheck.js'></script>

<style></style>