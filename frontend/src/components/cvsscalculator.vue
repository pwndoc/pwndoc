<template>
    <q-card>
        <q-card-section class="row">
            <div class="col-md-3" style="align-self:center">
            {{$t('cvss.title')}}
            </div>
            <q-space />
            <div v-if="cvss.baseImpact && cvss.baseExploitability" style="margin-right:120px">
                <q-chip square color="blue-12" text-color="white">{{$t('cvss.impactSubscore')}}:&nbsp;<span class="text-bold">{{$_.round(cvss.baseImpact, 1)}}</span></q-chip>
                <q-chip square color="blue-12" text-color="white">{{$t('cvss.exploitabilitySubscore')}}:&nbsp;<span class="text-bold">{{$_.round(cvss.baseExploitability, 1)}}</span></q-chip>
            </div>
            <div class="scoreRating" :class="cvss.baseSeverity">
                <span class="baseSeverity" v-if="!cvss.baseMetricScore">{{$t('cvss.infoWhenNoScore')}}</span>
                <div v-else>
                    <span class="baseMetricScore">{{cvss.baseMetricScore}}</span>
                    <span class="baseSeverity">({{cvss.baseSeverity}})</span>
                </div>
            </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="row q-col-gutter-md">
            <div class="col-md-6">
                <div class="q-my-sm text-weight-bold">{{$t('cvss.attackVector')}}</div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.AV"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.AV"
                    :readonly="readonly"
                />
                <div class="q-my-sm text-weight-bold">{{$t('cvss.attackComplexity')}}</div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.AC"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.AC"
                    :readonly="readonly"
                />
                <div class="q-my-sm text-weight-bold">{{$t('cvss.privilegesRequired')}}</div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.PR"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.PR"
                    :readonly="readonly"
                />
                <div class="q-my-sm text-weight-bold">{{$t('cvss.userInteraction')}}</div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.UI"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.UI"
                    :readonly="readonly"
                />
            </div>
            <div class="col-md-6">
                <div class="q-my-sm text-weight-bold">{{$t('cvss.scope')}}</div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.S"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.S"
                    :readonly="readonly"
                />
                <div class="q-my-sm text-weight-bold">{{$t('cvss.confidentialityImpact')}}</div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.C"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.C"
                    :readonly="readonly"
                />
                <div class="q-my-sm text-weight-bold">{{$t('cvss.integrityImpact')}}</div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.I"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.I"
                    :readonly="readonly"
                />
                <div class="q-my-sm text-weight-bold">{{$t('cvss.availabilityImpact')}}</div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.A"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.A"
                    :readonly="readonly"
                />
            </div>
        </q-card-section>
        <q-expansion-item 
        :label="$t('cvss.temporalEnvironmentalTitle')"
        header-class="bg-blue-grey-5 text-white" 
        expand-icon-class="text-white">
            <q-card-section class="row">
            <div class="col-md-6">
            {{$t('cvss.temporalTitle')}}
            </div>
            <q-space />
            <div class="scoreRating" :class="cvss.temporalSeverity">
                <span class="baseSeverity" v-if="!cvss.temporalMetricScore">{{$t('cvss.infoWhenNoScore')}}</span>
                <div v-else>
                    <span class="baseMetricScore">{{cvss.temporalMetricScore}}</span>
                    <span class="baseSeverity">({{cvss.temporalSeverity}})</span>
                </div>
            </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row q-col-gutter-md">
                <div class="col">
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.exploitCodeMaturity')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.E"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.E"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.remediationLevel')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.RL"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.RL"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.reportConfidence')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.RC"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.RC"
                        :readonly="readonly"
                    />
                </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row">
                <div class="col-md-6">
                {{$t('cvss.environmentalTitle')}}
                </div>
                <q-space />
                <div class="scoreRating" :class="cvss.environmentalSeverity">
                    <span class="baseSeverity" v-if="!cvss.environmentalMetricScore">{{$t('cvss.infoWhenNoScore')}}</span>
                    <div v-else>
                        <span class="baseMetricScore">{{cvss.environmentalMetricScore}}</span>
                        <span class="baseSeverity">({{cvss.environmentalSeverity}})</span>
                    </div>
                </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row q-col-gutter-md">
                <div class="col-md-6">
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.confidentialityRequirement')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.CR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.CR"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.integrityRequirement')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.IR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.IR"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.availabilityRequirement')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.AR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.AR"
                        :readonly="readonly"
                    />
                </div>
                <div class="col-md-6">
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.modifiedAttackVector')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MAV"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MAV"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.modifiedAttackComplexity')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MAC"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MAC"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.modifiedPrivilegesRequired')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MPR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MPR"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.modifiedUserInteraction')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MUI"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MUI"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.modifiedScope')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MS"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MS"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.modifiedConfidentialityImpact')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MC"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MC"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.modifiedIntegrityImpact')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MI"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MI"
                        :readonly="readonly"
                    />
                    <div class="q-my-sm text-weight-bold">{{$t('cvss.modifiedAvailabilityImpact')}}</div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MA"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MA"
                        :readonly="readonly"
                    />
                </div>
            </q-card-section>
        </q-expansion-item>
    </q-card>
</template>

<script>
import { $t } from '@/boot/i18n'


export default {
    name: 'cvss-calculator',
    props: ['value', 'readonly'],

    data: function() {
        return {
            cvssItems: {
                AV: [{label: $t("cvss.network"), value: "N"}, {label: $t("cvss.adjacentNetwork"), value: "A"}, {label: $t("cvss.local"), value: "L"}, {label: $t("cvss.physical"), value: "P"}],
                AC: [{label: $t("cvss.low"), value: "L"}, {label: $t("cvss.high"), value: "H"}],
                PR: [{label: $t("cvss.none"), value: "N"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.high"), value: "H"}],
                UI: [{label: $t("cvss.none"), value: "N"}, {label: $t("cvss.required"), value: "R"}],
                S: [{label: $t("cvss.unchanged"), value: "U"}, {label: $t("cvss.changed"), value: "C"}],
                C: [{label: $t("cvss.none"), value: "N"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.high"), value: "H"}],
                I: [{label: $t("cvss.none"), value: "N"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.high"), value: "H"}],
                A: [{label: $t("cvss.none"), value: "N"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.high"), value: "H"}],
                E: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.unproven"), value: "U"}, {label: $t("cvss.poc"), value: "P"}, {label: $t("cvss.functional"), value: "F"}, {label: $t("cvss.high"), value: "H"}],
                RL: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.officialFix"), value: "O"}, {label: $t("cvss.temporaryFix"), value: "T"}, {label: $t("cvss.workaround"), value: "W"}, {label: $t("cvss.unavailable"), value: "U"}],
                RC: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.unknown"), value: "U"}, {label: $t("cvss.reasonable"), value: "R"}, {label: $t("cvss.confirmed"), value: "C"}],
                CR: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.medium"), value: "M"}, {label: $t("cvss.high"), value: "H"}],
                IR: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.medium"), value: "M"}, {label: $t("cvss.high"), value: "H"}],
                AR: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.medium"), value: "M"}, {label: $t("cvss.high"), value: "H"}],
                MAV: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.network"), value: "N"}, {label: $t("cvss.adjacentNetwork"), value: "A"}, {label: $t("cvss.local"), value: "L"}, {label: $t("cvss.physical"), value: "P"}],
                MAC: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.high"), value: "H"}],
                MPR: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.none"), value: "N"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.high"), value: "H"}],
                MUI: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.none"), value: "N"}, {label: $t("cvss.required"), value: "R"}],
                MS: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.unchanged"), value: "U"}, {label: $t("cvss.changed"), value: "C"}],
                MC: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.none"), value: "N"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.high"), value: "H"}],
                MI: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.none"), value: "N"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.high"), value: "H"}],
                MA: [{label: $t("cvss.notDefined"), value: "X"}, {label: $t("cvss.none"), value: "N"}, {label: $t("cvss.low"), value: "L"}, {label: $t("cvss.high"), value: "H"}],
            },
            cvssObj: {AV:'', AC:'', PR:'', UI:'', S:'', C:'', I:'', A:'', E:'', RL:'', RC:'', CR:'', IR:'', AR:'', MAV:'', MAC:'', MPR:'', MUI:'', MS:'', MC:'', MI:'', MA:''},
            cvss: {
                baseMetricScore: '',
                baseSeverity: '',
                temporalMetricScore: '',
                temporalSeverity: '',
                environmentalMetricScore: '',
                environmentalSeverity: ''
            }
        }
    },

    created: function() {
        this.cvssStrToObject(this.value);
        this.cvss = CVSS31.calculateCVSSFromVector(this.value);
    },

    watch: {
        value: function(val) {
            this.cvssStrToObject(val);
        },
        cvssObj: {
            handler(newValue, oldValue) {
                this.cvssObjectToStr()
            },
            deep: true
        }
    },

    methods: {
        cvssStrToObject(str) {
            if (str) {
                var temp = str.split('/');
                for (var i=0; i<temp.length; i++) {
                    var elt = temp[i].split(':');
                    switch(elt[0]) {
                        case "AV":
                            this.cvssObj.AV = elt[1];
                            break;
                        case "AC":
                            this.cvssObj.AC = elt[1];
                            break;
                        case "PR":
                            this.cvssObj.PR = elt[1];
                            break;
                        case "UI":
                            this.cvssObj.UI = elt[1];
                            break;
                        case "S":
                            this.cvssObj.S = elt[1];
                            break;
                        case "C":
                            this.cvssObj.C = elt[1];
                            break;
                        case "I":
                            this.cvssObj.I = elt[1];
                            break;
                        case "A":
                            this.cvssObj.A = elt[1];
                            break;
                        case "E":
                            this.cvssObj.E = elt[1];
                            break;
                        case "RL":
                            this.cvssObj.RL = elt[1];
                            break;
                        case "RC":
                            this.cvssObj.RC = elt[1];
                            break;
                        case "CR":
                            this.cvssObj.CR = elt[1];
                            break;
                        case "IR":
                            this.cvssObj.IR = elt[1];
                            break;
                        case "AR":
                            this.cvssObj.AR = elt[1];
                            break;
                        case "MAV":
                            this.cvssObj.MAV = elt[1];
                            break;
                        case "MAC":
                            this.cvssObj.MAC = elt[1];
                            break;
                        case "MPR":
                            this.cvssObj.MPR = elt[1];
                            break;
                        case "MUI":
                            this.cvssObj.MUI = elt[1];
                            break;
                        case "MS":
                            this.cvssObj.MS = elt[1];
                            break;
                        case "MC":
                            this.cvssObj.MC = elt[1];
                            break;
                        case "MI":
                            this.cvssObj.MI = elt[1];
                            break;
                        case "MA":
                            this.cvssObj.MA = elt[1];
                            break;
                        default:
                            break;
                    }
                }
            }
        },

        cvssObjectToStr() {
            var vectorString = "CVSS:3.1";
            if (this.cvssObj.AV) vectorString += "/AV:"+this.cvssObj.AV
            if (this.cvssObj.AC) vectorString += "/AC:"+this.cvssObj.AC
            if (this.cvssObj.PR) vectorString += "/PR:"+this.cvssObj.PR
            if (this.cvssObj.UI) vectorString += "/UI:"+this.cvssObj.UI
            if (this.cvssObj.S) vectorString += "/S:"+this.cvssObj.S
            if (this.cvssObj.C) vectorString += "/C:"+this.cvssObj.C
            if (this.cvssObj.I) vectorString += "/I:"+this.cvssObj.I
            if (this.cvssObj.A) vectorString += "/A:"+this.cvssObj.A
            if (this.cvssObj.E) vectorString += "/E:"+this.cvssObj.E
            if (this.cvssObj.RL) vectorString += "/RL:"+this.cvssObj.RL
            if (this.cvssObj.RC) vectorString += "/RC:"+this.cvssObj.RC
            if (this.cvssObj.CR) vectorString += "/CR:"+this.cvssObj.CR
            if (this.cvssObj.IR) vectorString += "/IR:"+this.cvssObj.IR
            if (this.cvssObj.AR) vectorString += "/AR:"+this.cvssObj.AR
            if (this.cvssObj.MAV) vectorString += "/MAV:"+this.cvssObj.MAV
            if (this.cvssObj.MAC) vectorString += "/MAC:"+this.cvssObj.MAC
            if (this.cvssObj.MPR) vectorString += "/MPR:"+this.cvssObj.MPR
            if (this.cvssObj.MUI) vectorString += "/MUI:"+this.cvssObj.MUI
            if (this.cvssObj.MS) vectorString += "/MS:"+this.cvssObj.MS
            if (this.cvssObj.MC) vectorString += "/MC:"+this.cvssObj.MC
            if (this.cvssObj.MI) vectorString += "/MI:"+this.cvssObj.MI
            if (this.cvssObj.MA) vectorString += "/MA:"+this.cvssObj.MA

            this.cvss = CVSS31.calculateCVSSFromVector(vectorString);                 
            this.$emit('input', vectorString);
            this.$emit('cvssScoreChange', this.cvss.baseMetricScore);
        }
    }
}

</script>

<style>
    .group-btn .q-btn {
        border: 1px solid #ccc;
    }

    .group-btn .q-btn-inner div {
        font-weight: 400;
    }

    .baseSeverity {
        font-size: 16px;
        font-weight: normal;
        margin-bottom: 5px;
        display: block;
    }

    .baseMetricScore {
        display: block;
        font-size: 32px;
        line-height: 32px;
        font-weight: normal;
        margin-top: 4px;
    }

    .scoreRating {
        width: 100px;
        top: -4px;
        right: 20px;
        border: 2px solid #666666;
        background: #dddddd;
        font-size: 11px;
        border-radius: 10px;
        line-height: 150%;
        text-align: center;
        height: fit-content!important;
        position: absolute;
    }

    .scoreRating.None {
        background: #53aa33;
        border: 2px solid #53aa33;
        color: white;
    }

    .scoreRating.Low {
        background: #ffcb0d;
        border: 2px solid #ffcb0d;
        color: white;
    }

    .scoreRating.Medium {
        background: #f9a009;
        border: 2px solid #f9a009;
        color: white;
    }

    .scoreRating.High {
        background: #df3d03;
        border: 2px solid #df3d03;
        color: white;
    }

    .scoreRating.Critical {
        background: #212121;
        border: 2px solid #212121;
        color: white;
    }
</style>