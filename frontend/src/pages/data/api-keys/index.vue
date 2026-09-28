<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-table
                class="sticky-header-table rounded-borders"
                flat
                bordered
                row-key="_id"
                :columns="tableColumns"
                :rows="apiKeys"
                :loading="loading"
                :filter="search"
                :filter-method="keyFilter"
                v-model:pagination="pagination"
                :no-data-label="$t('apiKeys.noKeys')"
            >
                <template v-slot:top>
                    <div class="full-width">
                        <div class="row items-center">
                            <div class="text-h6">{{ $t('apiKeys.adminTitle') }}</div>
                            <q-space />
                            <q-btn
                                flat
                                round
                                dense
                                icon="refresh"
                                :loading="loading"
                                @click="getApiKeys"
                            >
                                <q-tooltip>{{ $t('refresh') }}</q-tooltip>
                            </q-btn>
                        </div>
                        <div class="text-caption text-grey-7 q-mb-md">
                            {{ $t('apiKeys.adminDescription') }}
                        </div>
                        <q-input
                            dense
                            outlined
                            clearable
                            debounce="250"
                            v-model="search"
                            :placeholder="$t('apiKeys.searchPlaceholder')"
                            class="q-mb-sm"
                        >
                            <template v-slot:prepend>
                                <q-icon name="search" />
                            </template>
                        </q-input>
                    </div>
                </template>

                <template v-slot:body-cell-owner="props">
                    <q-td :props="props">
                        {{ ownerLabel(props.row) }}
                    </q-td>
                </template>

                <template v-slot:body-cell-roles="props">
                    <q-td :props="props">
                        <div class="row q-gutter-xs">
                            <q-chip
                                v-for="role in (props.row.roles || [])"
                                :key="role"
                                dense
                                square
                                :label="role"
                                :color="role === 'admin' ? 'orange' : 'info'"
                                text-color="white"
                                class="q-ma-none"
                            />
                        </div>
                    </q-td>
                </template>

                <template v-slot:body-cell-createdAt="props">
                    <q-td :props="props">{{ formatDate(props.row.createdAt) }}</q-td>
                </template>

                <template v-slot:body-cell-lastUsed="props">
                    <q-td :props="props">{{ formatDate(props.row.lastUsed) }}</q-td>
                </template>

                <template v-slot:body-cell-expiresAt="props">
                    <q-td :props="props">{{ formatDate(props.row.expiresAt) }}</q-td>
                </template>

                <template v-slot:body-cell-enabled="props">
                    <q-td :props="props">
                        <q-toggle
                            :model-value="props.row.enabled"
                            :disable="updatingApiKeys.includes(props.row._id)"
                            color="secondary"
                            @update:model-value="toggleApiKey(props.row)"
                        />
                    </q-td>
                </template>

                <template v-slot:body-cell-actions="props">
                    <q-td :props="props">
                        <q-btn
                            flat
                            round
                            dense
                            color="negative"
                            icon="delete"
                            @click="confirmRevokeApiKey(props.row)"
                        >
                            <q-tooltip>{{ $t('btn.delete') }}</q-tooltip>
                        </q-btn>
                    </q-td>
                </template>
            </q-table>
        </div>
    </div>
</template>

<script src="./api-keys.js"></script>
