<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-table
                class="sticky-header-table rounded-borders"
                :columns="dtHeaders"
                :rows="roles"
                :filter="search"
                :filter-method="roleFilter"
                v-model:pagination="pagination"
                row-key="name"
                :loading="loading"
                @row-dblclick="dblClick"
            >
                <template v-slot:top>
                    <div class="full-width">
                        <div class="row items-start q-col-gutter-md">
                            <div class="col">
                                <div class="text-h5 text-weight-bold">{{$t('roles')}}</div>
                                <div class="text-body2 text-grey-7">{{$t('rolesPageSubtitle')}}</div>
                            </div>
                            <div class="col-auto">
                                <q-btn
                                v-if="userStore.isAllowed('roles:create')"
                                unelevated
                                icon="add"
                                :label="$t('createRole')"
                                color="secondary"
                                no-caps
                                @click="cleanCurrentRole(); $refs.createModal.show()"
                                />
                            </div>
                        </div>

                        <div class="row items-center q-col-gutter-md q-mt-md">
                            <div class="col-md col-12">
                                <q-input dense outlined clearable debounce="250" v-model="search.query" :placeholder="$t('searchRolesPlaceholder')">
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
                                v-model="search.type"
                                :options="typeOptions()"
                                />
                            </div>
                        </div>
                    </div>
                </template>

                <template v-slot:body-cell-name="props">
                    <q-td>
                        <div class="text-weight-bold">{{roleDisplayName(props.row)}}</div>
                        <div class="text-caption text-grey-7">{{props.row.name}}</div>
                        <div class="text-body2 text-grey-7">{{roleDescription(props.row)}}</div>
                    </q-td>
                </template>

                <template v-slot:body-cell-type="props">
                    <q-td>
                        <q-chip dense square :color="isSystem(props.row) ? 'grey-7' : 'blue-grey'" text-color="white" class="q-ma-none" :label="typeLabel(props.row)" />
                    </q-td>
                </template>

                <template v-slot:body-cell-permissions="props">
                    <q-td>
                        <div class="text-body2 q-mb-xs">{{permissionSummary(props.row)}}</div>
                        <q-linear-progress
                        rounded
                        size="6px"
                        color="secondary"
                        track-color="grey-3"
                        :value="permissionProgress(props.row)"
                        />
                    </q-td>
                </template>

                <template v-slot:body-cell-users="props">
                    <q-td>
                        <q-btn flat dense no-caps color="primary" :to="`/data/collaborators?role=${props.row.name}`">
                            <q-icon name="groups" size="18px" class="q-mr-sm" />
                            {{ props.row.users }}
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('usersWithRole')}}</q-tooltip>
                        </q-btn>
                    </q-td>
                </template>

                <template v-slot:body-cell-action="props">
                    <q-td class="text-right">
                        <q-icon v-if="isSystem(props.row)" name="lock" color="grey-7">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('cannotEditSystemRole')}}</q-tooltip>
                        </q-icon>
                        <q-btn v-if="userStore.isAllowed('roles:read') && (!userStore.isAllowed('roles:update') || isSystem(props.row))" size="sm" flat round color="primary" icon="visibility" @click="viewRole(props.row); $refs.viewModal.show()">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.view')}}</q-tooltip>
                        </q-btn>
                        <q-btn v-if="userStore.isAllowed('roles:update') && !isSystem(props.row)" size="sm" flat round color="primary" icon="fa fa-edit" @click="clone(props.row); $refs.editModal.show()">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.edit')}}</q-tooltip>
                        </q-btn>
                        <q-btn v-if="userStore.isAllowed('roles:delete') && !isSystem(props.row)" size="sm" flat round color="negative" icon="fa fa-trash" @click="confirmDeleteRole(props.row)">
                            <q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.delete')}}</q-tooltip>
                        </q-btn>
                    </q-td>
                </template>

                <template v-slot:bottom="scope">
                    <span>{{$t('showing')}} {{ pageStart() }} {{$t('to')}} {{ pageEnd() }} {{$t('of')}} {{ filteredRolesCount() }} {{$t('roles')}}</span>
                    <q-space />
                    <span>{{$t('resultsPerPage')}}</span>
                    <q-select class="q-px-md" v-model="pagination.rowsPerPage" :options="rowsPerPageOptions" emit-value map-options dense options-dense options-cover borderless />
                    <q-pagination input v-model="pagination.page" :max="scope.pagesNumber" />
                </template>
            </q-table>
        </div>
    </div>

    <q-dialog ref="createModal" persistent @hide="cleanErrors()">
        <q-card class="role-modal-card" style="width:900px; max-width:95vw">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">{{$t('createRole')}}</div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.createModal.hide()" />
            </q-bar>
            <q-card-section>
                <q-input dense :label="$t('roleDisplayName')+' *'" :model-value="currentRole.displayName" @update:model-value="updateDisplayName" :error="!!errors.displayName" :error-message="errors.displayName" hide-bottom-space outlined />
            </q-card-section>
            <q-card-section>
                <q-input dense :label="$t('roleName')+' *'" :model-value="currentRole.name" @update:model-value="updateRoleName" :error="!!errors.name" :error-message="errors.name" hide-bottom-space outlined />
            </q-card-section>
            <q-card-section>
                <q-input dense :label="$t('description')" v-model="currentRole.description" outlined type="textarea" autogrow />
            </q-card-section>
            <q-card-section>
                <q-select dense :label="$t('cloneFrom')" v-model="cloneFrom" :options="roleOptions()" emit-value map-options clearable outlined @update:model-value="applyClone" />
            </q-card-section>
            <role-permissions-panel
            :permissions-catalog="permissionsCatalog"
            :allows="roleAllowsList(currentRole)"
            :all-permissions="roleAllowsAll(currentRole)"
            :editable="true"
            v-model:search="permissionSearch"
            v-model:expanded-permission-groups="expandedPermissionGroups"
            @toggle="togglePermission"
            @clear="clearPermissions"
            />
            <q-card-actions class="role-modal-actions bg-white" align="right">
                <q-btn color="primary" outline @click="$refs.createModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="createRole()">{{$t('btn.create')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>

    <q-dialog ref="editModal" persistent @hide="cleanErrors()">
        <q-card class="role-modal-card" style="width:900px; max-width:95vw">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">{{$t('editRole')}}</div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.editModal.hide()" />
            </q-bar>
            <q-card-section>
                <q-input dense :label="$t('roleDisplayName')+' *'" v-model="currentRole.displayName" :error="!!errors.displayName" :error-message="errors.displayName" hide-bottom-space outlined />
            </q-card-section>
            <q-card-section>
                <q-input dense :label="$t('roleName')+' *'" v-model="currentRole.name" :error="!!errors.name" :error-message="errors.name" hide-bottom-space outlined />
            </q-card-section>
            <q-card-section>
                <q-input dense :label="$t('description')" v-model="currentRole.description" outlined type="textarea" autogrow />
            </q-card-section>
            <role-permissions-panel
            :permissions-catalog="permissionsCatalog"
            :allows="roleAllowsList(currentRole)"
            :all-permissions="roleAllowsAll(currentRole)"
            :editable="true"
            v-model:search="permissionSearch"
            v-model:expanded-permission-groups="expandedPermissionGroups"
            @toggle="togglePermission"
            @clear="clearPermissions"
            />
            <q-card-actions class="role-modal-actions bg-white" align="right">
                <q-btn color="primary" outline @click="$refs.editModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="secondary" unelevated @click="updateRole()">{{$t('btn.update')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>

    <q-dialog ref="viewModal">
        <q-card class="role-modal-card" style="width:900px; max-width:95vw">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">{{$t('viewRole')}}</div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.viewModal.hide()" />
            </q-bar>
            <q-card-section>
                <div class="row q-col-gutter-md">
                    <div class="col-md-6 col-12">
                        <div class="text-caption text-grey-7">{{$t('roleDisplayName')}}</div>
                        <div class="text-body1 text-weight-bold">{{roleDisplayName(currentRole)}}</div>
                    </div>
                    <div class="col-md-6 col-12">
                        <div class="text-caption text-grey-7">{{$t('roleName')}}</div>
                        <div class="text-body1">{{currentRole.name}}</div>
                    </div>
                    <div class="col-md-6 col-12">
                        <div class="text-caption text-grey-7">{{$t('roleType')}}</div>
                        <q-chip dense square :color="isSystem(currentRole) ? 'grey-7' : 'blue-grey'" text-color="white" class="q-ma-none" :label="typeLabel(currentRole)" />
                    </div>
                    <div class="col-12">
                        <div class="text-caption text-grey-7">{{$t('description')}}</div>
                        <div class="text-body1">{{roleDescription(currentRole)}}</div>
                    </div>
                </div>
            </q-card-section>
            <role-permissions-panel
            :permissions-catalog="permissionsCatalog"
            :allows="roleAllowsList(currentRole)"
            :all-permissions="roleAllowsAll(currentRole)"
            :editable="false"
            v-model:search="permissionSearch"
            v-model:expanded-permission-groups="expandedPermissionGroups"
            />
            <q-card-actions class="role-modal-actions bg-white" align="right">
                <q-btn color="primary" unelevated @click="$refs.viewModal.hide()">{{$t('btn.close')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>

    <q-dialog ref="deleteModal" persistent>
        <q-card style="width:500px; max-width:95vw">
            <q-bar class="bg-fixed-primary text-white">
                <div class="q-toolbar-title">{{$t('deleteRole')}}</div>
                <q-space />
                <q-btn dense flat icon="close" @click="$refs.deleteModal.hide()" />
            </q-bar>
            <q-card-section>
                <p v-if="usersCount > 0">{{$t('usersWithRole')}}: {{usersCount}}</p>
                <p>{{$t('msg.confirmSuppression')}}</p>
            </q-card-section>
            <q-card-actions align="right">
                <q-btn color="primary" outline @click="$refs.deleteModal.hide()">{{$t('btn.cancel')}}</q-btn>
                <q-btn color="negative" unelevated @click="deleteRole()">{{$t('btn.delete')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script src="./roles.js"></script>

<style>
.role-permissions {
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 4px;
    overflow: hidden;
}

.role-modal-card {
    display: flex;
    flex-direction: column;
    max-height: 90vh;
}

.role-modal-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
}

.role-permission-toolbar {
    flex: 0 0 auto;
}

.role-modal-actions {
    flex: 0 0 auto;
    position: sticky;
    bottom: 0;
    z-index: 1;
    border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
