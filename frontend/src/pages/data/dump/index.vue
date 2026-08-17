<template>
    <div class="row">
        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-card>
                <q-card-section class="q-py-xs bg-blue-grey-5 text-white">
                    <div class="text-h6">{{$t('nav.vulnerabilities')}}</div>
                </q-card-section>
                <q-separator />
                <div v-if="userStore.isAllowed('vulnerabilities:create')">
                    <q-card-section>
                        <div class="text-bold">{{$t('importVulnerabilities')}}</div>
                    </q-card-section>
                    <q-card-section>
                        <div class="text-grey-8" v-html="$t('importVulnerabilitiesInfo')"></div>
                    </q-card-section>
                    <q-card-section>
                        <input
                        ref="importVulnerabilities"
                        value=""
                        type="file"
                        multiple
                        accept=".yml, .json"
                        class="hidden"
                        @change="importVulnerabilities($event.target.files)"
                        />
                        <q-btn 
                        :label="$t('import')"
                        color="secondary"
                        flat
                        class="bg-secondary text-white"
                        @click="$refs.importVulnerabilities.click()"
                        />
                    </q-card-section>
                    <q-separator />
                </div>
                <q-card-section>
                    <div class="text-bold">{{$t('exportVulnerabilities')}}</div>
                </q-card-section>
                <q-card-section>
                        <div class="text-grey-8" v-html="$t('exportVulnerabilitiesInfo')"></div>
                    </q-card-section>
                    <q-card-section>
                        <q-btn 
                        :label="$t('export')"
                        color="secondary"
                        flat
                        class="bg-secondary text-white"
                        @click="getVulnerabilities"
                        />
                    </q-card-section>
                    <q-separator />
                    <div v-if="userStore.isAllowed('vulnerabilities:delete-all')">
                        <q-card-section>
                            <div class="text-bold">{{$t('deleteAllVulnerabilities')}}</div>
                        </q-card-section>
                        <q-card-section>
                            <div class="text-grey-8" v-html="$t('deleteAllVulnerabilitiesInfo')"></div>
                        </q-card-section>
                        <q-card-section>
                            <q-btn 
                            :label="$t('btn.deleteAll')"
                            flat
                            class="bg-negative text-white"
                            @click="deleteAllVulnerabilities"
                            />
                        </q-card-section>
                    </div>
            </q-card>
        </div>

        <div class="col-md-10 col-12 offset-md-1 q-mt-md">
            <q-card>
                <q-card-section class="q-py-xs bg-blue-grey-5 text-white">
                    <div class="text-h6">{{$t('nav.audits')}}</div>
                </q-card-section>
                <q-separator />
                <div v-if="userStore.isAllowed('data:stats')">
                    <q-card-section>
                        <div class="text-bold">{{$t('findingStatistics')}}</div>
                    </q-card-section>
                    <q-card-section>
                        <div class="text-grey-8" v-html="$t('findingStatisticsInfo')"></div>
                    </q-card-section>
                    <q-card-section>
                        <div class="row q-gutter-md items-end">
                            <q-select
                                v-model="statsFormat"
                                :options="formatOptions"
                                :label="$t('exportFormat')"
                                emit-value
                                map-options
                                dense
                                outlined
                                style="min-width: 120px"
                            />
                            <q-select
                                v-model="selectedCompany"
                                :options="companies"
                                :label="$t('company')"
                                option-label="name"
                                option-value="_id"
                                clearable
                                dense
                                outlined
                                style="min-width: 200px"
                            />
                            <q-input
                                v-model="dateFrom"
                                :label="$t('dateFrom')"
                                type="date"
                                dense
                                outlined
                                style="min-width: 150px"
                            />
                            <q-input
                                v-model="dateTo"
                                :label="$t('dateTo')"
                                type="date"
                                dense
                                outlined
                                style="min-width: 150px"
                            />
                            <q-btn
                                :label="$t('downloadStatistics')"
                                color="secondary"
                                flat
                                class="bg-secondary text-white"
                                @click="downloadFindingStats"
                                :loading="loadingStats"
                            />
                        </div>
                    </q-card-section>
                </div>
                <div v-else>
                    <q-card-section>
                        <div class="text-grey-6">{{$t('noStatsPermission')}}</div>
                    </q-card-section>
                </div>
            </q-card>
        </div>
    </div>
</template>

<script src='./dump.js'></script>

<style></style>