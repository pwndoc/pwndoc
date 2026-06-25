<template>
    <div>
        <q-card-section class="q-pt-none role-permission-toolbar">
            <div class="row items-center q-col-gutter-sm q-mb-sm">
                <div class="col-md-6 col-12">
                    <q-input dense outlined clearable :model-value="search" :placeholder="$t('searchPermissions')" @update:model-value="$emit('update:search', $event)">
                        <template v-slot:prepend>
                            <q-icon name="search" />
                        </template>
                    </q-input>
                </div>
                <div class="col-md-6 col-12 row items-center justify-end q-gutter-sm">
                    <q-chip dense square color="grey-7" text-color="white" :label="selectedLabel" />
                    <q-btn flat dense no-caps color="primary" :label="$t('expandAll')" @click="expandAll()" />
                    <q-btn flat dense no-caps color="primary" :label="$t('collapseAll')" @click="collapseAll()" />
                    <q-btn v-if="editable" flat dense no-caps color="negative" :label="$t('clearAll')" @click="$emit('clear')" />
                </div>
            </div>
        </q-card-section>
        <q-card-section class="q-pt-none role-modal-content">
            <div class="role-permissions">
                <q-expansion-item
                v-for="group in filteredPermissionsCatalog"
                :key="group.key"
                :model-value="expandedPermissionGroups[group.key]"
                @update:model-value="setGroupExpanded(group.key, $event)"
                expand-separator
                dense
                header-class="bg-blue-grey-1"
                >
                    <template v-slot:header>
                        <q-item-section>
                            <div class="text-weight-bold">{{group.label}}</div>
                        </q-item-section>
                        <q-item-section side>
                            <q-badge rounded color="grey-7" :label="groupCheckedCount(group) + ' / ' + group.permissions.length" />
                        </q-item-section>
                    </template>
                    <div class="row q-col-gutter-sm q-pa-sm">
                        <div v-for="permission in group.permissions" :key="permission.scope" class="col-md-6 col-12">
                            <q-checkbox
                            dense
                            :model-value="isPermissionChecked(permission.scope)"
                            @update:model-value="togglePermission(permission.scope)"
                            :label="permission.scope"
                            :color="permission.core ? 'secondary' : 'primary'"
                            :disable="!editable"
                            />
                        </div>
                    </div>
                </q-expansion-item>
                <div v-if="filteredPermissionsCatalog.length === 0" class="text-grey-7 q-pa-md text-center">{{$t('noPermissionsFound')}}</div>
            </div>
        </q-card-section>
    </div>
</template>

<script>
export default {
    name: 'RolePermissionsPanel',
    props: {
        permissionsCatalog: {
            type: Array,
            default: () => []
        },
        allows: {
            type: Array,
            default: () => []
        },
        allPermissions: {
            type: Boolean,
            default: false
        },
        editable: {
            type: Boolean,
            default: false
        },
        search: {
            type: String,
            default: ''
        },
        expandedPermissionGroups: {
            type: Object,
            default: () => ({})
        }
    },
    emits: ['update:search', 'update:expandedPermissionGroups', 'toggle', 'clear'],
    computed: {
        permissionsCount: function() {
            return this.permissionsCatalog.reduce((count, group) => count + group.permissions.length, 0)
        },
        selectedPermissionsCount: function() {
            return this.allPermissions ? this.permissionsCount : this.allows.length
        },
        selectedLabel: function() {
            const label = this.editable ? this.$t('selected') : this.$t('assigned')
            return `${this.selectedPermissionsCount} / ${this.permissionsCount} ${label}`
        },
        filteredPermissionsCatalog: function() {
            return this.permissionsCatalog
            .map(group => {
                return {
                    ...group,
                    permissions: group.permissions.filter(permission => this.permissionMatchesSearch(permission, group))
                }
            })
            .filter(group => group.permissions.length > 0)
        }
    },
    methods: {
        isPermissionChecked: function(scope) {
            return this.allPermissions || this.allows.includes(scope)
        },
        permissionMatchesSearch: function(permission, group) {
            const needle = this.search.trim().toLowerCase()
            if (!needle)
                return true
            return (
                permission.scope.toLowerCase().includes(needle) ||
                group.label.toLowerCase().includes(needle)
            )
        },
        groupCheckedCount: function(group) {
            return group.permissions.filter(permission => this.isPermissionChecked(permission.scope)).length
        },
        togglePermission: function(scope) {
            if (this.editable)
                this.$emit('toggle', scope)
        },
        setGroupExpanded: function(groupKey, value) {
            this.$emit('update:expandedPermissionGroups', {
                ...this.expandedPermissionGroups,
                [groupKey]: value
            })
        },
        expandAll: function() {
            this.$emit('update:expandedPermissionGroups', this.permissionsCatalog.reduce((acc, group) => {
                acc[group.key] = true
                return acc
            }, {}))
        },
        collapseAll: function() {
            this.$emit('update:expandedPermissionGroups', this.permissionsCatalog.reduce((acc, group) => {
                acc[group.key] = false
                return acc
            }, {}))
        }
    }
}
</script>
