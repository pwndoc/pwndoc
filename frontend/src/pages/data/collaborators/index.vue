<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-table
                class="sticky-header-table rounded-borders"
                :columns="tableColumns"
                :rows="collabs"
                :filter="search"
                :filter-method="collaboratorFilter"
                v-model:pagination="pagination"
                :selection="canUpdateUsers ? 'multiple' : 'none'"
                v-model:selected="selected"
                row-key="username"
                :loading="loading"
                @row-dblclick="dblClick"
            >
                <template v-slot:top>
                    <div class="full-width">
                        <div class="row">
                            <div v-if="selected.length" class="row items-center q-gutter-sm">
                                <span class="text-grey-7">{{ selected.length }} {{ selected.length === 1 ? $t('userSelected') : $t('usersSelected') }}</span>
                                <q-space />
                                <template v-if="userStore.isAllowed('users:update')">
                                    <q-btn outline no-caps color="primary" icon="check_circle" :label="$t('btn.enable')" @click="bulkSetEnabled(true)" />
                                    <q-btn outline no-caps color="primary" icon="block" :label="$t('btn.disable')" @click="openDisableConfirmation(selected)" />
                                    <q-btn outline no-caps color="primary" icon="person_add" :label="$t('addRoles')" @click="openBulkRoles('add')" />
                                    <q-btn outline no-caps color="primary" icon="person_remove" :label="$t('removeRoles')" @click="openBulkRoles('remove')" />
                                </template>
                            </div>
                            <q-space />
                            <div class="col-auto">
                                <q-btn
                                v-if="userStore.isAllowed('users:create')"
                                unelevated
                                icon="person_add"
                                :label="$t('addCollaborator')"
                                color="secondary"
                                no-caps
                                @click="cleanCurrentCollab(); $refs.createModal.show()"
                                />
                            </div>
                        </div>

                        <div class="row items-center q-col-gutter-md q-mt-md">
                            <div class="col-md col-12">
                                <q-input
                                dense
                                outlined
                                clearable
                                debounce="250"
                                v-model="search.query"
                                :placeholder="$t('searchUsersPlaceholder')"
                                >
                                    <template v-slot:prepend>
                                        <q-icon name="search" />
                                    </template>
                                </q-input>
                            </div>
                            <div class="col-md-2 col-sm-6 col-12">
                                <q-select
                                dense
                                outlined
                                emit-value
                                map-options
                                :label="$t('role')"
                                v-model="search.roles"
                                :options="roleFilterOptions()"
                                />
                            </div>
                            <div class="col-md-2 col-sm-6 col-12">
                                <q-select
                                dense
                                outlined
                                emit-value
                                map-options
                                :label="$t('status')"
                                v-model="search.enabled"
                                :options="statusOptions()"
                                />
                            </div>
                        </div>
                    </div>
                </template>

                <template v-slot:body-cell-name="props">
                    <q-td>
                        <div class="row items-center no-wrap">
                            <q-avatar size="34px" class="text-white text-weight-bold q-mr-sm" :style="{backgroundColor: avatarColor(props.row.username)}">
                                {{ initials(props.row) }}
                            </q-avatar>
                            <span class="text-weight-medium">{{ fullName(props.row) }}</span>
                        </div>
                    </q-td>
                </template>

                <template v-slot:body-cell-roles="props">
                    <q-td>
                        <div class="row items-center no-wrap q-gutter-xs">
                            <q-chip
                            dense
                            square
                            :label="roleLabel(primaryRole(props.row))"
                            :color="roleColor(primaryRole(props.row))"
                            text-color="white"
                            class="q-ma-none"
                            />
                            <q-chip
                            v-if="props.row.roles && props.row.roles.length > 1"
                            dense
                            clickable
                            :label="'+' + (props.row.roles.length - 1)"
                            color="grey-7"
                            text-color="white"
                            >
                                <q-menu>
                                    <q-list dense>
                                        <q-item-label header>{{ $t('allRoles') }} ({{ props.row.roles.length }})</q-item-label>
                                        <q-separator inset />
                                        <q-item v-for="role in props.row.roles" :key="role">
                                            <q-item-section>
                                                <q-chip square dense :color="roleColor(role)">{{ roleLabel(role) }}</q-chip>
                                            </q-item-section>
                                        </q-item>
                                    </q-list>
                                </q-menu>
                            </q-chip>
                        </div>
                    </q-td>
                </template>

                <template v-slot:body-cell-status="props">
                    <q-td>
                        <q-chip v-if="props.row.enabled" dense rounded color="positive" text-color="white" class="q-ma-none">
                            <q-icon name="circle" size="8px" class="q-mr-xs" />
                            {{ $t('statusActive') }}
                        </q-chip>
                        <q-chip v-else dense rounded color="grey-7" text-color="white" class="q-ma-none">
                            <q-icon name="circle" size="8px" class="q-mr-xs" />
                            {{ $t('statusDisabled') }}
                        </q-chip>
                    </q-td>
                </template>

                <template v-slot:body-cell-action="props">
                    <q-td class="text-right">
                        <q-btn data-testid="edit-collaborator-button" v-if="userStore.isAllowed('users:update')" size="sm" flat round color="primary" icon="fa fa-edit" @click="clone(props.row); $refs.editModal.show()">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.edit')}}</q-tooltip>
                        </q-btn>
                        <q-btn v-if="userStore.isAllowed('users:update') && props.row.enabled" size="sm" flat round color="negative" icon="block" @click="openDisableConfirmation([props.row])">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('btn.disable')}}</q-tooltip>
                        </q-btn>
                        <q-btn v-if="userStore.isAllowed('users:update') && !props.row.enabled" size="sm" flat round color="positive" icon="check_circle" @click="setEnabled(props.row, true)">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('btn.enable')}}</q-tooltip>
                        </q-btn>
                    </q-td>
                </template> 

                <template v-slot:bottom="scope">
                    <span>{{$t('showing')}} {{ pageStart() }} {{$t('to')}} {{ pageEnd() }} {{$t('of')}} {{ filteredCollabsCount() }} {{$t('users')}}</span>
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
        <q-card style="width:800px" class="collab-form-card">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('addCollaborator')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.createModal.hide()" />
            </q-bar>

            <div class="collab-form-body">
                <div class="collab-form-section">
                    <div class="collab-form-section__header">
                        <q-icon name="fa fa-address-card" />
                        <span>{{$t('details')}}</span>
                    </div>
                    <div class="row q-col-gutter-md">
                        <q-input
                        data-testid="create-collaborator-username-input"
                        :label="$t('username')+' *'"
                        autofocus
                        class="col-md-6 col-12"
                        :error="!!errors.username"
                        :error-message="errors.username"
                        hide-bottom-space
                        @keyup.enter="createCollab()"
                        v-model="currentCollab.username"
                        outlined
                        />
                        <div class="col-md-6 col-12"></div>
                        <q-input
                        data-testid="create-collaborator-firstname-input"
                        :label="$t('firstname')+' *'"
                        class="col-md-6 col-12"
                        :error="!!errors.firstname"
                        :error-message="errors.firstname"
                        hide-bottom-space
                        @keyup.enter="createCollab()"
                        v-model="currentCollab.firstname"
                        outlined
                        />
                        <q-input
                        data-testid="create-collaborator-lastname-input"
                        :label="$t('lastname')+' *'"
                        class="col-md-6 col-12"
                        :error="!!errors.lastname"
                        :error-message="errors.lastname"
                        hide-bottom-space
                        @keyup.enter="createCollab()"
                        v-model="currentCollab.lastname"
                        outlined
                        />
                        <q-input
                        data-testid="create-collaborator-email-input"
                        :label="$t('email')"
                        class="col-md-6 col-12"
                        hide-bottom-space
                        @keyup.enter="createCollab()"
                        v-model="currentCollab.email"
                        outlined
                        />
                        <q-input
                        data-testid="create-collaborator-phone-input"
                        :label="$t('phone')"
                        class="col-md-6 col-12"
                        hide-bottom-space
                        @keyup.enter="createCollab()"
                        v-model="currentCollab.phone"
                        outlined
                        />
                        <q-input
                        data-testid="create-collaborator-jobtitle-input"
                        :label="$t('jobTitle')"
                        class="col-md-6 col-12"
                        hide-bottom-space
                        @keyup.enter="createCollab()"
                        v-model="currentCollab.jobTitle"
                        outlined
                        />
                    </div>
                </div>
                <div class="collab-form-section">
                    <div class="collab-form-section__header">
                        <q-icon name="fa fa-user-shield" />
                        <span>{{$t('roles')}}</span>
                    </div>
                    <div class="row q-col-gutter-md">
                        <q-select
                        data-testid="create-collaborator-role-select"
                        :label="$t('role')+' *'"
                        class="col-md-12"
                        v-model="currentCollab.roles"
                        :options="roleOptions()"
                        emit-value
                        map-options
                        multiple
                        use-chips
                        @keyup.enter="createCollab()"
                        options-sanitize
                        outlined
                        />
                        <q-input
                        data-testid="create-collaborator-password-input"
                        ref="pwdCreateRef"
                        class="col-md-12"
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
                    </div>
                </div>
            </div>

            <q-separator />

            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.createModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn data-testid="create-collaborator-submit-button" color="secondary" unelevated @click="createCollab()">{{$t('btn.create')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>

    <q-dialog ref="editModal" persistent @hide="cleanErrors()">
        <q-card style="width:800px" class="collab-form-card">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('editCollaborator')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.editModal.hide()" />
            </q-bar>

            <div class="collab-form-body">
                <div class="collab-form-section">
                    <div class="collab-form-section__header">
                        <q-icon name="fa fa-address-card" />
                        <span>{{$t('details')}}</span>
                    </div>
                    <div class="row q-col-gutter-md">
                        <q-input
                        data-testid="edit-collaborator-username-input"
                        :label="$t('username')+' *'"
                        autofocus
                        class="col-md-6 col-12"
                        :error="!!errors.username"
                        :error-message="errors.username"
                        hide-bottom-space
                        @keyup.enter="updateCollab()"
                        v-model="currentCollab.username"
                        outlined
                        />
                        <div class="col-md-6 col-12"></div>
                        <q-input
                        data-testid="edit-collaborator-firstname-input"
                        :label="$t('firstname')+' *'"
                        class="col-md-6 col-12"
                        :error="!!errors.firstname"
                        :error-message="errors.firstname"
                        hide-bottom-space
                        @keyup.enter="updateCollab()"
                        v-model="currentCollab.firstname"
                        outlined
                        />
                        <q-input
                        data-testid="edit-collaborator-lastname-input"
                        :label="$t('lastname')+' *'"
                        class="col-md-6 col-12"
                        :error="!!errors.lastname"
                        :error-message="errors.lastname"
                        hide-bottom-space
                        @keyup.enter="updateCollab()"
                        v-model="currentCollab.lastname"
                        outlined
                        />
                        <q-input
                        data-testid="edit-collaborator-email-input"
                        :label="$t('email')"
                        class="col-md-6 col-12"
                        hide-bottom-space
                        @keyup.enter="updateCollab()"
                        v-model="currentCollab.email"
                        outlined
                        />
                        <q-input
                        data-testid="edit-collaborator-phone-input"
                        :label="$t('phone')"
                        class="col-md-6 col-12"
                        hide-bottom-space
                        @keyup.enter="updateCollab()"
                        v-model="currentCollab.phone"
                        outlined
                        />
                        <q-input
                        data-testid="edit-collaborator-jobtitle-input"
                        :label="$t('jobTitle')"
                        class="col-md-6 col-12"
                        hide-bottom-space
                        @keyup.enter="updateCollab()"
                        v-model="currentCollab.jobTitle"
                        outlined
                        />
                    </div>
                </div>
                <div class="collab-form-section">
                    <div class="collab-form-section__header">
                        <q-icon name="fa fa-user-shield" />
                        <span>{{$t('roles')}}</span>
                    </div>
                    <div class="row q-col-gutter-md">
                        <q-select
                        data-testid="edit-collaborator-role-select"
                        :label="$t('role')+' *'"
                        class="col-md-12"
                        v-model="currentCollab.roles"
                        :options="roleOptions()"
                        emit-value
                        map-options
                        multiple
                        use-chips
                        @keyup.enter="updateCollab()"
                        options-sanitize
                        outlined
                        />
                        <q-input
                        data-testid="edit-collaborator-password-input"
                        ref="pwdUpdateRef"
                        class="col-md-12"
                        v-model="currentCollab.password"
                        :label="$t('password')"
                        type="password"
                        @keyup.enter="updateCollab()"
                        outlined
                        :rules="(currentCollab.password) ? strongPassword : ['']"
                        />
                        <div class="col-md-12">
                            <p class="q-mb-sm" v-if="currentCollab.totpEnabled">{{$t('twoFactorAuthentication')}} <b>{{$t('enabled')}}</b> {{$t('forThisUser')}}</p>
                            <p class="q-mb-sm" v-else>{{$t('twoFactorAuthentication')}} <b>{{$t('disabled')}}</b> {{$t('forThisUser')}}</p>

                            <q-toggle
                            data-testid="edit-collaborator-enabled-toggle"
                            v-model="currentCollab.enabled"
                            :label="currentCollab.enabled ? $t('btn.accountEnabled') : $t('btn.accountDisabled')"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <q-separator />

            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.editModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn data-testid="edit-collaborator-submit-button" color="secondary" unelevated @click="updateCollab()">{{$t('btn.update')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>

    <q-dialog ref="bulkRolesModal" persistent>
        <q-card style="width:500px">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{ bulkAction === 'add' ? $t('addRoles') : $t('removeRoles') }}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.bulkRolesModal.hide()" />
            </q-bar>
            <q-card-section>
                <q-select
                v-model="bulkRoles"
                :options="roleOptions()"
                emit-value
                map-options
                multiple
                use-chips
                outlined
                :label="$t('roles')"
                />
            </q-card-section>
            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.bulkRolesModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="applyBulkRoles()">{{$t('btn.update')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>

    <q-dialog ref="disableModal" persistent>
        <q-card style="width:500px">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">
                    {{$t('btn.disable')}}
                </div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.disableModal.hide()" />
            </q-bar>
            <q-card-section>
                <div class="text-weight-bold q-mb-sm">{{ disableConfirmationTitle() }}</div>
                <div>{{ $t('disableUsersWarning') }}</div>
            </q-card-section>
            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.disableModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="negative" unelevated @click="confirmDisableUsers()">{{$t('btn.disable')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script src='./collaborators.js'></script>

<style scoped>
.collab-form-card {
    display: flex;
    flex-direction: column;
}

.collab-form-body {
    padding: 20px 24px;
    background: #F5F6FA;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.body--dark .collab-form-body {
    background: #121212;
}

.collab-form-section {
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    padding: 20px;
}

.body--dark .collab-form-section {
    background: #1e1e1e;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.collab-form-section__header {
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
