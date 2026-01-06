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
            <q-btn color="positive" :label="$t('btn.save')+' (ctrl+s)'" no-caps @click="updateAuditNetwork" />
        </template>
    </breadcrumb>

    <div class="row content q-pa-md">
        <div class="col-md-6 q-pr-sm">
            <q-card>
                <q-card-section>{{$t('hostsAssociateScopes')}}</q-card-section>
                <q-separator />
                <q-card-section v-for="scope of audit.scope" :key="scope.name">
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
                </q-card-section>
            </q-card>
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
}
</style>