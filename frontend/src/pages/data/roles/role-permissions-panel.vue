<template>
    <div>
        <q-card-section class="q-pt-none role-permission-toolbar">
            <div class="row items-center q-col-gutter-sm q-mb-sm">
                <div class="col-md-6 col-12">
                    <q-input data-testid="role-permission-search-input" dense outlined clearable :model-value="search" :placeholder="$t('searchPermissions')" @update:model-value="$emit('update:search', $event)">
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
                :class="{ 'permission-group--critical': groupHasSensitivePermission(group) }"
                :header-class="groupHasSensitivePermission(group) ? 'bg-red-1' : 'bg-blue-grey-1'"
                >
                    <template v-slot:header>
                        <q-item-section>
                            <div class="row items-center q-gutter-x-sm">
                                <div class="text-weight-bold" :class="{ 'text-negative': groupHasSensitivePermission(group) }">{{group.label}}</div>
                                <q-chip v-if="groupHasSensitivePermission(group)" dense square outline color="negative" :label="$t('criticalPermissionBadge')" class="text-weight-bold" />
                            </div>
                        </q-item-section>
                        <q-item-section side>
                            <q-badge rounded :color="groupHasSensitivePermission(group) ? 'negative' : 'grey-7'" :label="groupCheckedCount(group) + ' / ' + group.permissions.length" />
                        </q-item-section>
                    </template>
                    <div class="row q-col-gutter-sm q-pa-sm">
                        <div v-for="permission in group.permissions" :key="permission.scope" class="col-md-6 col-12">
                            <div class="row items-center no-wrap permission-row" :class="{ 'permission-row--critical bg-red-1': isSensitivePermission(permission.scope) }">
                                <q-checkbox
                                dense
                                :data-testid="`role-permission-${permission.scope}-checkbox`"
                                :model-value="isPermissionChecked(permission.scope)"
                                @update:model-value="togglePermission(permission.scope)"
                                :label="permission.scope"
                                :color="permission.core ? 'secondary' : 'primary'"
                                :disable="!editable"
                                class="col-grow"
                                />
                                <q-icon v-if="isSensitivePermission(permission.scope)" name="warning" color="negative" size="18px" class="q-mr-sm" />
                            </div>
                        </div>
                        <div v-if="groupHasSensitivePermission(group)" class="col-12">
                            <q-banner dense rounded class="critical-permission-banner bg-red-1">
                                <template v-slot:avatar>
                                    <q-icon name="warning" color="negative" size="20px" />
                                </template>
                                <div class="text-negative text-weight-bold">{{$t('highImpactPermissionTitle')}}</div>
                                <div class="text-negative">{{$t('sensitivePermissionTooltip')}}</div>
                            </q-banner>
                        </div>
                    </div>
                </q-expansion-item>
                <div v-if="filteredPermissionsCatalog.length === 0" class="text-grey-7 q-pa-md text-center">{{$t('noPermissionsFound')}}</div>
            </div>
        </q-card-section>
    </div>
</template>

<script>
const SENSITIVE_PERMISSIONS = new Set(['backups:update'])

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
        isSensitivePermission: function(scope) {
            return SENSITIVE_PERMISSIONS.has(scope)
        },
        groupHasSensitivePermission: function(group) {
            return group.permissions.some(permission => this.isSensitivePermission(permission.scope))
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

<style scoped>
.permission-group--critical {
    border: 1px solid var(--q-negative);
    border-radius: 4px;
    overflow: hidden;
}

.permission-row {
    padding: 2px 4px;
    border-radius: 4px;
    border: 1px solid transparent;
}

.permission-row--critical {
    border-color: var(--q-negative);
}

.critical-permission-banner {
    border-left: 4px solid var(--q-negative);
}
</style>
