<template>
    <breadcrumb
        buttons
        :title="`${auditParent.name} (${auditParent.auditType || 'Audit Type not set'})`"
        :state="auditParent.state"
        :approvals="auditParent.approvals"
        :path="(auditParent.parentId) ? `/audits/${auditParent.parentId}` : ''"
        :path-name="(auditParent.type === 'retest') ? $t('originalAudit') : (auditParent.type === 'default') ? $t('multi') : ''"
    >
        <template v-slot:buttons v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT">
            <q-btn-dropdown 
            class="q-mr-sm"
            :label="$t('import')"
            no-caps
            >
                <q-list>
                    <q-item clickable @click="$refs.nmapFile.click()">
                        <q-item-section>
                            <q-item-label>
                                Nmap
                                <input
                                type="file"
                                ref="nmapFile"
                                accept=".xml"
                                class="hidden"
                                @change="importNetworkScan($event.target.files, 'nmap')"
                                />
                            </q-item-label>
                        </q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable @click="$refs.nessusFile.click()">
                        <q-item-section>
                            <q-item-label>
                                Nessus
                                <input
                                type="file"
                                ref="nessusFile"
                                accept=".nessus"
                                class="hidden"
                                @change="importNetworkScan($event.target.files, 'nessus')"
                                />
                            </q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-btn-dropdown>
            <q-btn
                class="save-state-btn"
                outline
                :color="saveButtonColor"
                :text-color="saveButtonTextColor"
                unelevated
                no-caps
                @click="updateAuditNetwork"
            >
                <q-icon v-if="saveButtonState === 'saved'" name="check" class="q-mr-sm" />
                <span>{{ saveButtonLabel }}</span>
                <q-icon
                    v-if="saveButtonState === 'dirty'"
                    data-testid="save-unsaved-badge"
                    name="circle"
                    size="12px"
                    class="q-ml-sm"
                />
            </q-btn>
        </template>
    </breadcrumb>

    <div class="row content q-pa-md">
        <div class="col-md-6 q-pr-sm">
            <div class="network-form-section">
                <div class="network-form-section__header">
                    <q-icon name="fa fa-sitemap" />
                    <span>{{$t('hostsAssociateScopes')}}</span>
                </div>
                <div v-for="scope of audit.scope" :key="scope.name" class="network-form-scope">
                    <span class="text-h6">{{scope.name}}</span>
                    <div class="q-col-gutter-md row">
                        <q-select
                        class="col-md-12"
                        multiple
                        :label="selectHostsLabel"
                        v-model="selectedTargets[scope.name]"
                        :options="targetsOptions"
                        use-chips
                        clearable
                        options-sanitize
                        >
                            <template v-slot:append>
                                <q-btn round dense flat icon="add" @click.close="updateScopeHosts(scope)" />
                            </template>
                        </q-select>
                        <div v-for="(host, index) of scope.hosts">
                            <q-chip
                            :key="host.ip"
                            color="blue-grey-7"
                            text-color="white"
                            dense
                            square
                            class="col-md-6 cursor-pointer"
                            clickable
                            @click="currentHost = $_.cloneDeep(host)"
                            removable
                            @remove="scope.hosts.splice(index, 1)"
                            >
                                {{host.ip}}
                            </q-chip>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="currentHost !== null" class="col-md-6 q-pl-sm">
            <q-table
            :title="`${currentHost.ip} (${currentHost.hostname})`"
            :rows="currentHost.services"
            :columns="dtHostHeaders"
            v-model:pagination="hostPagination"
            row-key="port"
            />
        </div>
    </div>
</template>

<script src='./network.js'></script>

<style scoped>
.content {
    margin-top: 50px;
    background: #F5F6FA;
}

.body--dark .content {
    background: #121212;
}

.network-form-section {
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    padding: 20px;
}

.body--dark .network-form-section {
    background: #1e1e1e;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.network-form-section__header {
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

.network-form-scope {
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.body--dark .network-form-scope {
    border-top-color: rgba(255, 255, 255, 0.1);
}

.network-form-scope:first-of-type {
    padding-top: 0;
    margin-top: 0;
    border-top: none;
}
</style>