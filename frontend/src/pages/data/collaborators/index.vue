<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-table
                class="sticky-header-table"
                :columns="dtHeaders"
                :rows="collabs"
                :filter="search"
                :filter-method="customFilter"
                v-model:pagination="pagination"
                row-key="username"
                :loading="loading"
                @row-dblclick="dblClick"
            >
                <template v-slot:top>
                    <q-toggle 
                    :label="(search.enabled)? $t('btn.accountsEnabled'): $t('btn.accountsDisabled')" 
                    v-model="search.enabled" 
                    />
                    <q-space />
                    <q-btn 
                    v-if="userStore.isAllowed('users:create')"
                    unelevated
                    :label="$t('addCollaborator')" 
                    color="secondary"
                    no-caps
                    @click="cleanCurrentCollab(); $refs.createModal.show()"
                    />
                </template>

                <template v-slot:top-row="props">
                    <q-tr>
                        <q-td style="width: 20%">
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.username"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td style="width: 20%">
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.firstname"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td style="width: 20%">
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.lastname"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td style="width: 20%">
                            <q-input 
                            dense
                            :label="$t('search')"
                            v-model="search.email"
                            clearable
                            outlined
                            />
                        </q-td>
                        <q-td style="width: 20%">
                            <q-select 
                            dense
                            :label="$t('search')"
                            v-model="search.role"
                            clearable
                            :options="roles"
                            options-sanitize
                            outlined
                            />
                        </q-td>
                    </q-tr>
                </template>

                <template v-slot:body-cell-action="props">
                    <q-td style="width:1px">
                        <q-btn v-if="userStore.isAllowed('users:update')" size="sm" flat color="primary" icon="fa fa-edit" @click="clone(props.row); $refs.editModal.show()">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">Edit</q-tooltip>
                        </q-btn>
                    </q-td>
                </template> 

                <template v-slot:bottom="scope">
                    <span v-if="collabs.length === 1">1 {{$t('quantifier')}}{{$t('collatorator')}}</span>                
                    <span v-else>{{collabs.length}} {{$t('quantifier')}}{{$t('collaborators')}}</span>   
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
                    {{$t('addCollaborator')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.createModal.hide()" />
            </q-bar>
            
            <q-card-section>
                <q-input
                :label="$t('username')+' *'"
                autofocus
                class="col-md-12"
                :error="!!errors.username"
                :error-message="errors.username"
                hide-bottom-space
                @keyup.enter="createCollab()"
                v-model="currentCollab.username"
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('firstname')+' *'"
                class="col-md-12"
                :error="!!errors.firstname"
                :error-message="errors.firstname"
                hide-bottom-space
                @keyup.enter="createCollab()"
                v-model="currentCollab.firstname"
                outlined
                />
            </q-card-section>  
            <q-card-section>
                <q-input
                :label="$t('lastname')+' *'"
                class="col-md-12"
                :error="!!errors.lastname"
                :error-message="errors.lastname"
                hide-bottom-space
                @keyup.enter="createCollab()"
                v-model="currentCollab.lastname"
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('email')"
                class="col-md-12"
                hide-bottom-space
                @keyup.enter="createCollab()"
                v-model="currentCollab.email"
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('phone')"
                class="col-md-12"
                hide-bottom-space
                @keyup.enter="createCollab()"
                v-model="currentCollab.phone"
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-select
                :label="$t('role')+' *'"
                class="col-md-12"
                v-model="currentCollab.role"
                :options=roles
                @keyup.enter="createCollab()"
                options-sanitize
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                ref="pwdCreateRef"
                v-model="currentCollab.password" 
                :label="$t('password')+' *'"
                type="password"
                :error="!!errors.password" 
                :error-message="errors.password"
                hide-bottom-space
                @keyup.enter="createCollab()"
                outlined
                :rules="(currentCollab.password) ? strongPassword : ['']"
                />
            </q-card-section>
    
            <q-separator />
    
            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.createModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="createCollab()">{{$t('btn.create')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
    
    <q-dialog ref="editModal" persistent @hide="cleanErrors()">
        <q-card style="width:800px">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('editCollaborator')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.editModal.hide()" />
            </q-bar>
            
            <q-card-section>
                <q-input
                :label="$t('username')+' *'"
                autofocus
                class="col-md-12"
                :error="!!errors.username"
                :error-message="errors.username"
                hide-bottom-space
                @keyup.enter="updateCollab()"
                v-model="currentCollab.username"
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('firstname')+' *'"
                class="col-md-12"
                :error="!!errors.firstname"
                :error-message="errors.firstname"
                hide-bottom-space
                @keyup.enter="updateCollab()"
                v-model="currentCollab.firstname"
                outlined
                />
            </q-card-section>  
            <q-card-section>
                <q-input
                :label="$t('lastname')+' *'"
                class="col-md-12"
                :error="!!errors.lastname"
                :error-message="errors.lastname"
                hide-bottom-space
                @keyup.enter="updateCollab()"
                v-model="currentCollab.lastname"
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('email')"
                class="col-md-12"
                hide-bottom-space
                @keyup.enter="updateCollab()"
                v-model="currentCollab.email"
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-input
                :label="$t('phone')"
                class="col-md-12"
                hide-bottom-space
                @keyup.enter="updateCollab()"
                v-model="currentCollab.phone"
                outlined
                />
            </q-card-section>
            <q-card-section>
                <q-select
                :label="$t('role')+' *'"
                class="col-md-12"
                v-model="currentCollab.role"
                :options=roles
                @keyup.enter="updateCollab()"
                options-sanitize
                outlined
                />
            </q-card-section>   
            <q-card-section>
                <q-input 
                ref="pwdUpdateRef"
                v-model="currentCollab.password" 
                :label="$t('password')" 
                type="password"
                @keyup.enter="updateCollab()"
                outlined
                :rules="(currentCollab.password) ? strongPassword : ['']"
                />
            </q-card-section>
            <q-card-section>
                <div class="q-pl-sm">
                    <p v-if="currentCollab.totpEnabled">2FA <b>enabled</b> for this user</p>
                    <p v-else>2FA <b>disabled</b> for this user</p>
                </div>

                <q-toggle
                v-model="currentCollab.enabled" 
                :label="currentCollab.enabled ? $t('btn.accountEnabled') : $t('btn.accountDisabled')"
                />
            </q-card-section>
            
            <q-separator />

            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.editModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="updateCollab()">{{$t('btn.update')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script src='./collaborators.js'></script>

<style></style>