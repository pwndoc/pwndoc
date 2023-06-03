<template>
    <q-card class="cvsscalculator">
        <q-card-section class="row">
            <div class="col-md-3" style="align-self:center">
            <span>
                {{this.$t('cvss.title')}}
                <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                    <span :style="tooltip.style">{{this.$t('cvss.tooltip.baseMetricGroup_Legend')}}</span>
                </q-tooltip>
            </span>
            </div>
            <q-space />
            <div v-if="cvss.baseImpact && cvss.baseExploitability" style="margin-right:120px">
                <q-chip square color="blue-12" text-color="white">{{this.$t('cvss.impactSubscore')}}:&nbsp;<span class="text-bold">{{roundUp1(cvss.baseImpact)}}</span></q-chip>
                <q-chip square color="blue-12" text-color="white">{{this.$t('cvss.exploitabilitySubscore')}}:&nbsp;<span class="text-bold">{{roundUp1(cvss.baseExploitability)}}</span></q-chip>
            </div>
            <div class="scoreRating" :class="cvss.baseSeverity">
                <span class="baseSeverity" v-if="!cvss.baseMetricScore">{{this.$t('cvss.infoWhenNoScore')}}</span>
                <div v-else>
                    <span class="baseMetricScore">{{cvss.baseMetricScore}}</span>
                    <span class="baseSeverity">({{cvss.baseSeverity}})</span>
                </div>
            </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="row q-col-gutter-md">
            <div class="col-md-6">
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{this.$t('cvss.attackVector')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.AV_Heading')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.AV"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.AV"
                    :readonly="readonly"
                >
                <template v-slot:one>
                    <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                        <span :style="tooltip.style">{{this.$t('cvss.tooltip.AV_N_Label')}}</span>
                    </q-tooltip>
                </template>
                <template v-slot:two>
                    <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                        <span :style="tooltip.style">{{this.$t('cvss.tooltip.AV_A_Label')}}</span>
                    </q-tooltip>
                </template>
                <template v-slot:three>
                    <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                        <span :style="tooltip.style">{{this.$t('cvss.tooltip.AV_L_Label')}}</span>
                    </q-tooltip>
                </template>
                <template v-slot:four>
                    <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                        <span :style="tooltip.style">{{this.$t('cvss.tooltip.AV_P_Label')}}</span>
                    </q-tooltip>
                </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{this.$t('cvss.attackComplexity')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.AC_Heading')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.AC"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.AC"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.AC_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.AC_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{this.$t('cvss.privilegesRequired')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.PR_Heading')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.PR"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.PR"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.PR_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.PR_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.PR_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{this.$t('cvss.userInteraction')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.UI_Heading')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.UI"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.UI"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.UI_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.UI_R_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
            </div>
            <div class="col-md-6">
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{this.$t('cvss.scope')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.S_Heading')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.S"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.S"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.S_U_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.S_C_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{this.$t('cvss.confidentialityImpact')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.C_Heading')}}</span>
                        </q-tooltip>
                    </span>        
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.C"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.C"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.C_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.C_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.C_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{this.$t('cvss.integrityImpact')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.I_Heading')}}</span>
                        </q-tooltip>
                    </span>        
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.I"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.I"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.I_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.I_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.I_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{this.$t('cvss.availabilityImpact')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.A_Heading')}}</span>
                        </q-tooltip>
                    </span>        
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvssObj.A"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvssItems.A"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.A_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.A_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.A_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
            </div>
        </q-card-section>
        <q-expansion-item 
        :label="this.$t('cvss.temporalEnvironmentalTitle')"
        header-class="bg-blue-grey-5 text-white" 
        expand-icon-class="text-white">
            <q-card-section class="row">
            <div class="col-md-6">
                <span>
                {{this.$t('cvss.temporalTitle')}}
                <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                    <span :style="tooltip.style">{{this.$t('cvss.tooltip.temporalMetricGroup_Legend')}}</span>
                </q-tooltip>
                </span>
            </div>
            <q-space />
            <div class="scoreRating" :class="cvss.temporalSeverity">
                <span class="baseSeverity" v-if="!cvss.temporalMetricScore">{{this.$t('cvss.infoWhenNoScore')}}</span>
                <div v-else>
                    <span class="baseMetricScore">{{cvss.temporalMetricScore}}</span>
                    <span class="baseSeverity">({{cvss.temporalSeverity}})</span>
                </div>
            </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row q-col-gutter-md">
                <div class="col">
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.exploitCodeMaturity')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.E_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.E"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.E"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.E_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.E_U_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.E_P_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.E_F_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:five>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.E_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.remediationLevel')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RL_Heading')}}</span>
                            </q-tooltip>
                        </span>        
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.RL"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.RL"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RL_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RL_O_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RL_T_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RL_W_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:five>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RL_U_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.reportConfidence')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RC_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.RC"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.RC"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RC_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RC_U_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RC_R_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.RC_C_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row">
                <div class="col-md-3" style="align-self:center">
                    <span>
                        {{this.$t('cvss.environmentalTitle')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{this.$t('cvss.tooltip.environmentalMetricGroup_Legend')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-space />
                <div v-if="cvss.baseImpact && cvss.baseExploitability" style="margin-right:120px">
                    <q-chip square color="blue-12" text-color="white">{{this.$t('cvss.environmentalModifiedImpact')}}:&nbsp;<span class="text-bold">{{roundUp1(cvss.environmentalModifiedImpact)}}</span></q-chip>
                    <q-chip square color="blue-12" text-color="white">{{this.$t('cvss.environmentalModifiedExploitability')}}:&nbsp;<span class="text-bold">{{roundUp1(cvss.environmentalModifiedExploitability)}}</span></q-chip>
                </div>
                <div class="scoreRating" :class="cvss.environmentalSeverity">
                    <span class="baseSeverity" v-if="!cvss.environmentalMetricScore">{{this.$t('cvss.infoWhenNoScore')}}</span>
                    <div v-else>
                        <span class="baseMetricScore">{{cvss.environmentalMetricScore}}</span>
                        <span class="baseSeverity">({{cvss.environmentalSeverity}})</span>
                    </div>
                </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row q-col-gutter-md">
                <div class="col-md-6">
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.confidentialityRequirement')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.CR_Heading')}}</span>
                            </q-tooltip>
                        </span>        
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.CR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.CR"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.CR_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.CR_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.CR_M_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.CR_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.integrityRequirement')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.IR_Heading')}}</span>
                            </q-tooltip>
                        </span>  
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.IR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.IR"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.IR_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.IR_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.IR_M_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.IR_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.availabilityRequirement')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.AR_Heading')}}</span>
                            </q-tooltip>
                        </span>  
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.AR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.AR"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.AR_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.AR_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.AR_M_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.AR_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                </div>
                <div class="col-md-6">
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.modifiedAttackVector')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MAV_Heading')}}</span>
                            </q-tooltip>
                        </span>        
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MAV"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MAV"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MAV_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MAV_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MAV_A_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MAV_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:five>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MAV_P_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.modifiedAttackComplexity')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MAC_Heading')}}</span>
                            </q-tooltip>
                        </span>        
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MAC"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MAC"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MAC_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MAC_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MAC_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.modifiedPrivilegesRequired')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MPR_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MPR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MPR"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MPR_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MPR_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MPR_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MPR_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.modifiedUserInteraction')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MUI_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MUI"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MUI"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MUI_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MUI_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MUI_R_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.modifiedScope')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MS_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MS"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MS"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MS_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MS_U_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MS_C_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.modifiedConfidentialityImpact')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MC_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MC"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MC"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MC_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MC_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MC_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MC_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.modifiedIntegrityImpact')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MI_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MI"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MI"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MI_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MI_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MI_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MI_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{this.$t('cvss.modifiedAvailabilityImpact')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MA_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvssObj.MA"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvssItems.MA"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MA_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MA_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MA_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{this.$t('cvss.tooltip.MA_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                </div>
            </q-card-section>
        </q-expansion-item>
    </q-card>
</template>

<script>
export default {
    name: 'cvss-calculator',
    props: ['value', 'readonly'],

    data: function() {
        return {
            cvssItems: {
                AV: [{label: this.$t("cvss.network"), value: "N", slot: 'one'}, {label: this.$t("cvss.adjacentNetwork"), value: "A", slot: 'two'}, {label: this.$t("cvss.local"), value: "L", slot: 'three'}, {label: this.$t("cvss.physical"), value: "P", slot: 'four'}],
                AC: [{label: this.$t("cvss.low"), value: "L", slot: 'one'}, {label: this.$t("cvss.high"), value: "H", slot: 'two'}],
                PR: [{label: this.$t("cvss.none"), value: "N", slot: 'one'}, {label: this.$t("cvss.low"), value: "L", slot: 'two'}, {label: this.$t("cvss.high"), value: "H", slot: 'three'}],
                UI: [{label: this.$t("cvss.none"), value: "N", slot: 'one'}, {label: this.$t("cvss.required"), value: "R", slot: 'two'}],
                S: [{label: this.$t("cvss.unchanged"), value: "U", slot: 'one'}, {label: this.$t("cvss.changed"), value: "C", slot: 'two'}],
                C: [{label: this.$t("cvss.none"), value: "N", slot: 'one'}, {label: this.$t("cvss.low"), value: "L", slot: 'two'}, {label: this.$t("cvss.high"), value: "H", slot: 'three'}],
                I: [{label: this.$t("cvss.none"), value: "N", slot: 'one'}, {label: this.$t("cvss.low"), value: "L", slot: 'two'}, {label: this.$t("cvss.high"), value: "H", slot: 'three'}],
                A: [{label: this.$t("cvss.none"), value: "N", slot: 'one'}, {label: this.$t("cvss.low"), value: "L", slot: 'two'}, {label: this.$t("cvss.high"), value: "H", slot: 'three'}],
                E: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.unproven"), value: "U", slot: 'two'}, {label: this.$t("cvss.poc"), value: "P", slot: 'three'}, {label: this.$t("cvss.functional"), value: "F", slot: 'four'}, {label: this.$t("cvss.high"), value: "H", slot: 'five'}],
                RL: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.officialFix"), value: "O", slot: 'two'}, {label: this.$t("cvss.temporaryFix"), value: "T", slot: 'three'}, {label: this.$t("cvss.workaround"), value: "W", slot: 'four'}, {label: this.$t("cvss.unavailable"), value: "U", slot: 'five'}],
                RC: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.unknown"), value: "U", slot: 'two'}, {label: this.$t("cvss.reasonable"), value: "R", slot: 'three'}, {label: this.$t("cvss.confirmed"), value: "C", slot: 'four'}],
                CR: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.low"), value: "L", slot: 'two'}, {label: this.$t("cvss.medium"), value: "M", slot: 'three'}, {label: this.$t("cvss.high"), value: "H", slot: 'four'}],
                IR: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.low"), value: "L", slot: 'two'}, {label: this.$t("cvss.medium"), value: "M", slot: 'three'}, {label: this.$t("cvss.high"), value: "H", slot: 'four'}],
                AR: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.low"), value: "L", slot: 'two'}, {label: this.$t("cvss.medium"), value: "M", slot: 'three'}, {label: this.$t("cvss.high"), value: "H", slot: 'four'}],
                MAV: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.network"), value: "N", slot: 'two'}, {label: this.$t("cvss.adjacentNetwork"), value: "A", slot: 'three'}, {label: this.$t("cvss.local"), value: "L", slot: 'four'}, {label: this.$t("cvss.physical"), value: "P", slot: 'five'}],
                MAC: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.low"), value: "L", slot: 'two'}, {label: this.$t("cvss.high"), value: "H", slot: 'three'}],
                MPR: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.none"), value: "N", slot: 'two'}, {label: this.$t("cvss.low"), value: "L", slot: 'three'}, {label: this.$t("cvss.high"), value: "H", slot: 'four'}],
                MUI: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.none"), value: "N", slot: 'two'}, {label: this.$t("cvss.required"), value: "R", slot: 'three'}],
                MS: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.unchanged"), value: "U", slot: 'two'}, {label: this.$t("cvss.changed"), value: "C", slot: 'three'}],
                MC: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.none"), value: "N", slot: 'two'}, {label: this.$t("cvss.low"), value: "L", slot: 'three'}, {label: this.$t("cvss.high"), value: "H", slot: 'four'}],
                MI: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.none"), value: "N", slot: 'two'}, {label: this.$t("cvss.low"), value: "L", slot: 'three'}, {label: this.$t("cvss.high"), value: "H", slot: 'four'}],
                MA: [{label: this.$t("cvss.notDefined"), value: "", slot: 'one'}, {label: this.$t("cvss.none"), value: "N", slot: 'two'}, {label: this.$t("cvss.low"), value: "L", slot: 'three'}, {label: this.$t("cvss.high"), value: "H", slot: 'four'}],
            },
            cvssObj: {version:'3.1', AV:'', AC:'', PR:'', UI:'', S:'', C:'', I:'', A:'', E:'', RL:'', RC:'', CR:'', IR:'', AR:'', MAV:'', MAC:'', MPR:'', MUI:'', MS:'', MC:'', MI:'', MA:''},
            cvss: {
                baseMetricScore: '',
                baseSeverity: '',
                temporalMetricScore: '',
                temporalSeverity: '',
                environmentalMetricScore: '',
                environmentalSeverity: ''
            },
            tooltip: {
                anchor: "bottom middle",
                self: "top left",
                delay: 500,
                maxWidth: "700px",
                class: "",
                style: "font-size: 12px"
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
        roundUp1(n) {
            return CVSS31.roundUp1(n)
        },

        cvssStrToObject(str) {
            if (str) {
                var temp = str.split('/');
                for (var i=0; i<temp.length; i++) {
                    var elt = temp[i].split(':');
                    switch(elt[0]) {
                        case "CVSS":
                            this.cvssObj.version = elt[1];
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
            var vectorString = "CVSS:"+this.cvssObj.version;
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