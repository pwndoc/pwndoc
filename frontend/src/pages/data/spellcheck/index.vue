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
                    :label="$t('createWord')"
                    v-if="canEdit"
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
                        <q-btn data-testid="delete-spellcheck-button" size="sm" flat color="negative" icon="fa fa-trash" @click="confirmDeleteWord(props.row)" v-if="canEdit">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.delete')}}</q-tooltip>
                        </q-btn>
                    </q-td>
                </template>

                <template v-slot:bottom="scope">
                    <span v-if="words.length === 1">1 {{$t('quantifier')}}{{$t('ignoredWord')}}</span>                
                    <span v-else>{{words.length}} {{$t('quantifier')}}{{$t('ignoredWords')}}</span>    
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
        <q-card style="width:800px" class="spellcheck-form-card">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('createWord')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.createModal.hide()" />
            </q-bar>

            <div class="spellcheck-form-body">
                <div class="spellcheck-form-section">
                    <div class="spellcheck-form-section__header">
                        <q-icon name="fa fa-spell-check" />
                        <span>{{$t('details')}}</span>
                    </div>
                    <div class="row q-col-gutter-md">
                        <q-input
                            data-testid="create-spellcheck-word-input"
                            :label="$t('word')+' *'"
                            autofocus
                            class="col-md-12"
                            :error="!!errors.name"
                            :error-message="errors.name"
                            @keyup.enter="createWord()"
                            v-model="currentWord.word"
                            outlined
                            hide-bottom-space
                            />
                    </div>
                </div>
            </div>

            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.createModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn data-testid="create-spellcheck-submit-button" color="secondary" unelevated @click="createWord()">{{$t('btn.create')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script src='./spellcheck.js'></script>

<style scoped>
.spellcheck-form-card {
    display: flex;
    flex-direction: column;
}

.spellcheck-form-body {
    padding: 20px 24px;
    background: #F5F6FA;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.body--dark .spellcheck-form-body {
    background: #121212;
}

.spellcheck-form-section {
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    padding: 20px;
}

.body--dark .spellcheck-form-section {
    background: #1e1e1e;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.spellcheck-form-section__header {
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
</style>