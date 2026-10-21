<template>
    <breadcrumb :title="`${auditParent.name} — ${$t('auditFiles.title')}`"
        :state="auditParent.state" :approvals="auditParent.approvals" />

    <div class="q-pa-md audit-files">
        <q-card>
            <q-card-section class="row items-center q-gutter-sm">
                <div class="col">
                    <div class="text-h6">{{ $t('auditFiles.title') }}</div>
                    <div class="text-caption text-grey-7">{{ $t('auditFiles.description') }}</div>
                </div>
                <q-btn flat round icon="refresh" :aria-label="$t('auditFiles.refresh')" :loading="loading" :disable="busy" @click="loadFiles">
                    <q-tooltip>{{ $t('auditFiles.refresh') }}</q-tooltip>
                </q-btn>
                <q-btn v-if="canEdit" color="primary" icon="upload_file" :label="$t('auditFiles.upload')"
                    :disable="busy || loading || Boolean(loadError)" @click="$refs.fileInput.click()" data-testid="upload-audit-files" />
                <input ref="fileInput" type="file" multiple hidden @change="pickFiles" />
            </q-card-section>

            <q-card-section v-if="loadError">
                <q-banner class="bg-red-1 text-negative" role="alert">{{ loadError }}</q-banner>
            </q-card-section>
            <q-card-section v-if="!canEdit">
                <q-banner class="bg-grey-2">{{ $t('auditFiles.readOnly') }}</q-banner>
            </q-card-section>

            <q-card-section v-if="canEdit && !loadError">
                <div class="drop-zone rounded-borders q-pa-lg text-center"
                    :class="{ 'bg-blue-1': dragging, 'text-grey-6': busy }"
                    @dragover.prevent="dragging = !busy" @dragleave.prevent="dragging = false"
                    @drop.prevent="dropFiles" data-testid="audit-files-drop-zone">
                    <q-icon name="cloud_upload" size="36px" color="primary" />
                    <div>{{ $t('auditFiles.drop') }}</div>
                    <div class="text-caption text-grey-7">
                        {{ $t('auditFiles.limits', { size: formatSize(limits.maxFileBytes), count: limits.maxAuditFiles, total: formatSize(limits.maxAuditBytes) }) }}
                    </div>
                </div>
            </q-card-section>

            <q-card-section v-if="queue.length" aria-live="polite">
                <div v-for="(item, index) in queue" :key="index" class="q-mb-sm">
                    <div class="row items-center no-wrap q-gutter-sm">
                        <span class="col ellipsis">{{ item.name }}</span>
                        <span :class="item.status === 'failed' ? 'text-negative' : 'text-grey-7'">
                            {{ $t(`auditFiles.${item.status}`) }}
                        </span>
                    </div>
                    <q-linear-progress v-if="item.status === 'uploading'" :value="item.progress / 100"
                        :indeterminate="item.progress === 100" color="primary" class="q-mt-xs" />
                    <div v-if="item.error" class="text-negative text-caption" role="alert">{{ item.error }}</div>
                </div>
            </q-card-section>

            <q-table :rows="files" :columns="columns" row-key="_id" :loading="loading" :filter="filter"
                :pagination="{ rowsPerPage: 20, sortBy: 'createdAt', descending: true }"
                :no-data-label="$t('auditFiles.empty')" wrap-cells flat data-testid="audit-files-table">
                <template #top>
                    <div class="text-caption text-grey-7 col">
                        {{ $t('auditFiles.usage', { count: usage.count, size: formatSize(usage.bytes) }) }}
                    </div>
                    <q-input v-model="filter" dense outlined clearable :label="$t('auditFiles.search')">
                        <template #prepend><q-icon name="search" /></template>
                    </q-input>
                </template>
                <template #body-cell-name="props">
                    <q-td :props="props" class="file-name"><q-icon name="insert_drive_file" class="q-mr-sm" />{{ props.row.name }}</q-td>
                </template>
                <template #body-cell-scanStatus="props">
                    <q-td :props="props">
                        <q-badge :color="props.row.scanStatus === 'clean' ? 'positive' : 'grey-7'">
                            {{ $t(props.row.scanStatus === 'clean' ? 'auditFiles.clean' : 'auditFiles.notScanned') }}
                        </q-badge>
                    </q-td>
                </template>
                <template #body-cell-actions="props">
                    <q-td :props="props" class="text-right no-wrap">
                        <q-btn flat round color="primary" icon="download" :loading="downloading === props.row._id"
                            :disable="Boolean(downloading)" :aria-label="$t('auditFiles.download')" @click="downloadFile(props.row)">
                            <q-tooltip>{{ $t('auditFiles.download') }}</q-tooltip>
                        </q-btn>
                        <q-btn v-if="canEdit" flat round color="negative" icon="delete"
                            :disable="busy" :aria-label="$t('auditFiles.remove')" @click="confirmRemove(props.row)">
                            <q-tooltip>{{ $t('auditFiles.remove') }}</q-tooltip>
                        </q-btn>
                    </q-td>
                </template>
            </q-table>
        </q-card>
    </div>
</template>

<script src="./files.js"></script>

<style scoped>
.audit-files { max-width: 1500px; margin: 50px auto 0; }
.drop-zone { border: 2px dashed var(--q-primary); }
.file-name { overflow-wrap: anywhere; max-width: 400px; }
</style>
