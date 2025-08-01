<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-table
                class="sticky-header-table"
                :columns="dtHeaders"
                :rows="clients"
                :filter="search"
                :filter-method="customFilter"
                v-model:pagination="pagination"
                row-key="email"
                :loading="loading"
                @row-dblclick="dblClick"
            >

                <template v-slot:top>
                    <q-space />
                    <q-btn 
                    unelevated 
                    :label="$t('addClient')"
                    color="secondary"
                    no-caps
                    @click="cleanCurrentClient(); $refs.createModal.show()"
                    />          
                </template>

                <template v-slot:top-row="props">
                    <q-tr>
                        <q-td style="width: 25%">
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.firstname"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td style="width: 25%">
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.lastname"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td style="width: 25%">
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.email"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td style="width: 25%">
                            <q-select 
                            dense
                            :label="$t('search')"
                            v-model="search['company.name']"
                            clearable
                            :options="companies"
                            option-value="name"
                            option-label="name"
                            map-options
                            emit-value
                            options-sanitize
                            outlined
                            />
                        </q-td>
                        <q-td></q-td>
                    </q-tr>
                </template>

                <template v-slot:body-cell-action="props">
                    <q-td style="width:1px">
                        <q-btn size="sm" flat color="primary" icon="fa fa-edit" @click="clone(props.row); $refs.editModal.show()">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.edit')}}</q-tooltip>
                        </q-btn>
                        <q-btn size="sm" flat color="negative" icon="fa fa-trash" @click="confirmDeleteClient(props.row)">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.delete')}}</q-tooltip>
                        </q-btn>
                    </q-td>
                </template>

                <template v-slot:bottom="scope">
                    <span v-if="clients.length === 1">1 {{$t('quantifier')}}{{$t('client')}}</span>                
                    <span v-else>{{clients.length}} {{$t('quantifier')}}{{$t('clients')}}</span>  
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
        <q-card persistent style="width:800px">
            <q-bar class="bg-fixed-primary text-white">
                <span>{{$t('addClient')}}</span>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.createModal.hide()" />
            </q-bar>

            <q-card-section>
                <q-select
                :label="$t('company')"
                stack-label
                clearable
                v-model="currentClient.company"
                :options="companies"
                option-value="name"
                option-label="name"
                options-sanitize
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                autofocus
                :label="$t('firstname')+' *'"
                :error="!!errors.firstname"
                :error-message="errors.firstname"
                hide-bottom-space
                @keyup.enter="createClient()"
                v-model="currentClient.firstname" 
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('lastname')+' *'"
                :error="!!errors.lastname"
                :error-message="errors.lastname"
                hide-bottom-space
                @keyup.enter="createClient()"
                v-model="currentClient.lastname"
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('email')+' *'"
                :error="!!errors.email"
                :error-message="errors.email"
                hide-bottom-space
                @keyup.enter="createClient()"
                v-model="currentClient.email" 
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('function')"
                @keyup.enter="createClient()"
                v-model="currentClient.title" 
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('phone')"
                @keyup.enter="createClient()"
                v-model="currentClient.phone" 
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('cell')"
                @keyup.enter="createClient()"
                v-model="currentClient.cell" 
                outlined
                />
            </q-card-section>  
                    
            <q-separator />
            
            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.createModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="createClient()">{{$t('btn.create')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>

    <q-dialog ref="editModal" persistent @hide="cleanErrors()">
        <q-card persistent style="width:800px">
            <q-bar class="bg-fixed-primary text-white">
                <span>{{$t('editClient')}}</span>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.editModal.hide()" />
            </q-bar>

            <q-card-section>
                    <q-select
                    :label="$t('company')"
                    stack-label
                    clearable
                    v-model="currentClient.company"
                    :options="companies"
                    option-value="name"
                    option-label="name"
                    options-sanitize
                    outlined
                    />
                </q-card-section>
                <q-card-section>
                    <q-input
                    :label="$t('firstname')+' *'"
                    :error="!!errors.firstname"
                    :error-message="errors.firstname"
                    hide-bottom-space
                    @keyup.enter="updateClient()"
                    v-model="currentClient.firstname" 
                    outlined
                    />
                </q-card-section>
                <q-card-section>
                    <q-input
                    :label="$t('lastname')+' *'"
                    :error="!!errors.lastname"
                    :error-message="errors.lastname"
                    hide-bottom-space
                    ref="lastnameInput"
                    @keyup.enter="updateClient()"
                    v-model="currentClient.lastname"
                    outlined
                    />
                </q-card-section>
                <q-card-section>
                    <q-input
                    :label="$t('email')+' *'"
                    :error="!!errors.email"
                    :error-message="errors.email"
                    hide-bottom-space
                    @keyup.enter="updateClient()"
                    v-model="currentClient.email" 
                    outlined
                    />
                </q-card-section>
                <q-card-section>
                    <q-input
                    :label="$t('function')"
                    @keyup.enter="updateClient()"
                    v-model="currentClient.title" 
                    outlined
                    />
                </q-card-section>
                <q-card-section>
                    <q-input
                    :label="$t('phone')"
                    @keyup.enter="updateClient()"
                    v-model="currentClient.phone" 
                    outlined
                    />
                </q-card-section>
                <q-card-section>
                    <q-input
                    :label="$t('cell')"
                    @keyup.enter="updateClient()"
                    v-model="currentClient.cell" 
                    outlined
                    />
                </q-card-section>  
            
            <q-separator />

            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.editModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="updateClient()">{{$t('btn.update')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script src='./clients.js'></script>

<style></style>