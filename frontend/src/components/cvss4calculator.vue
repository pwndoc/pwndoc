<template>
    <q-card class="cvss4calculator">
        <q-card-section class="row">
            <div class="col-md-3" style="align-self:center">
            <span>
                {{$t('cvss4.title')}}
                <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                    <span :style="tooltip.style">{{$t('cvss4.tooltip.baseMetricGroup_Legend')}}</span>
                </q-tooltip>
            </span>
            </div>
            <q-space />
            <div class="scoreRating" :class="cvss4.baseSeverity">
                <div v-if="cvss4.baseScore >= 0">
                    <span class="baseMetricScore">{{cvss4.baseScore.toFixed(1)}}</span>
                    <span class="baseSeverity">({{cvss4.baseSeverity}})</span>
                </div>
                <span class="baseSeverity" v-else>{{$t('cvss4.infoWhenNoScore')}}</span>
            </div>
        </q-card-section>
        <q-separator />
        <h6 class="q-mb-none q-mt-md q-ml-md row">{{$t('cvss4.exploitabilityMetric')}}</h6>
        <q-card-section class="row q-col-gutter-md">
            <div class="col-12">
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.attackVector')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.AV_Heading')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.AV"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.AV"
                    :readonly="readonly"
                >
                <template v-slot:one>
                    <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                        <span :style="tooltip.style">{{$t('cvss4.tooltip.AV_N_Label')}}</span>
                    </q-tooltip>
                </template>
                <template v-slot:two>
                    <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                        <span :style="tooltip.style">{{$t('cvss4.tooltip.AV_A_Label')}}</span>
                    </q-tooltip>
                </template>
                <template v-slot:three>
                    <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                        <span :style="tooltip.style">{{$t('cvss4.tooltip.AV_L_Label')}}</span>
                    </q-tooltip>
                </template>
                <template v-slot:four>
                    <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                        <span :style="tooltip.style">{{$t('cvss4.tooltip.AV_P_Label')}}</span>
                    </q-tooltip>
                </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.attackComplexity')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.AC_Heading')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.AC"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.AC"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.AC_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.AC_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.attackRequirements')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.AT_Heading')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.AT"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.AT"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.AT_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.AT_P_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.privilegesRequired')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.PR_Heading')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.PR"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.PR"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.PR_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.PR_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.PR_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.userInteraction')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.UI_Heading')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.UI"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.UI"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.UI_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.UI_P_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.UI_A_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
            </div>
        </q-card-section>
        <h6 class="q-mb-none q-mt-md q-ml-md row">{{$t('cvss4.vulnerableSystemImpact')}}</h6>
        <q-card-section class="row q-col-gutter-md">
            <div class="col-12">
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.confidentialityImpact')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VC_Heading')}}</span>
                        </q-tooltip>
                    </span>        
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.VC"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.VC"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VC_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VC_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VC_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.integrityImpact')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VI_Heading')}}</span>
                        </q-tooltip>
                    </span>        
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.VI"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.VI"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VI_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VI_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VI_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.availabilityImpact')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VA_Heading')}}</span>
                        </q-tooltip>
                    </span>        
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.VA"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.VA"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VA_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VA_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.VA_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
            </div>
        </q-card-section>
        <h6 class="q-mb-none q-mt-md q-ml-md row">{{$t('cvss4.subsequentSystemImpact')}}</h6>
        <q-card-section class="row q-col-gutter-md">
            <div class="col-12">
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.confidentialityImpact')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SC_Heading')}}</span>
                        </q-tooltip>
                    </span>        
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.SC"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.SC"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SC_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SC_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SC_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.integrityImpact')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SI_Heading')}}</span>
                        </q-tooltip>
                    </span>        
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.SI"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.SI"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SI_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SI_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SI_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
                <div class="q-my-sm text-weight-bold">
                    <span>
                        {{$t('cvss4.availabilityImpact')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SA_Heading')}}</span>
                        </q-tooltip>
                    </span>        
                </div>
                <q-btn-toggle
                    class="group-btn"
                    v-model="cvss4Obj.SA"
                    toggle-color="grey-5"
                    toggle-text-color="black"
                    no-caps
                    :options="cvss4Items.SA"
                    :readonly="readonly"
                >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SA_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SA_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.SA_H_Label')}}</span>
                        </q-tooltip>
                    </template>
                </q-btn-toggle>
            </div>
        </q-card-section>
        <q-expansion-item 
        :label="$t('cvss4.otherMetricsTitle')"
        header-class="bg-blue-grey-5 text-white" 
        expand-icon-class="text-white">
            <q-card-section class="row">
            <div class="col-12">
                <span>
                {{$t('cvss4.supplementalTitle')}}
                <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                    <span :style="tooltip.style">{{$t('cvss4.tooltip.supplementalMetricGroup_Legend')}}</span>
                </q-tooltip>
                </span>
            </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row q-col-gutter-md">
                <div class="col">
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.safety')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.S_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.S"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.S"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.S_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.S_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.S_P_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.automatable')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.AU_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.AU"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.AU"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.AU_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.AU_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.AU_Y_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.recovery')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.R_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.R"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.R"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.R_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.R_A_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.R_U_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.R_I_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.valueDensity')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.V_C_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.V"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.V"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.V_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.V_D_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.V_C_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.vulnResponseEffort')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.RE_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.RE"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.RE"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.RE_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.RE_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.RE_M_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.RE_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.providerUrgency')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.U_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.U"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.U"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.U_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.U_CLEAR_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.U_GREEN_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.U_AMBER_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:five>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.U_RED_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row">
                <div class="col-md-3" style="align-self:center">
                    <span>
                        {{$t('cvss4.environmentalTitle')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.environmentalMetricGroup_Legend')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-space />
            </q-card-section>
            <q-separator />
            <h6 class="q-mb-none q-mt-md q-ml-md row">{{$t('cvss4.exploitabilityMetric')}}</h6>
            <q-card-section class="row q-col-gutter-md">
                <div class="col-12">
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.attackVector')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MAV_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MAV"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MAV"
                        :readonly="readonly"
                    >
                    <template v-slot:one>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.MAV_X_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:two>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.MAV_N_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:three>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.MAV_A_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:four>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.MAV_L_Label')}}</span>
                        </q-tooltip>
                    </template>
                    <template v-slot:five>
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.MAV_P_Label')}}</span>
                        </q-tooltip>
                    </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.attackComplexity')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MAC_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MAC"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MAC"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MAC__Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MAC_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MAC_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.attackRequirements')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MAT_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MAT"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MAT"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MAT_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MAT_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MAT_P_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.privilegesRequired')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MPR_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MPR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MPR"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MPR_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MPR_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MPR_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MPR_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.userInteraction')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MUI_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MUI"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MUI"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MUI_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MUI_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MUI_P_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MUI_A_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                </div>
            </q-card-section>
            <h6 class="q-mb-none q-mt-md q-ml-md row">{{$t('cvss4.vulnerableSystemImpact')}}</h6>
            <q-card-section class="row q-col-gutter-md">
                <div class="col-12">
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.confidentialityImpact')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVC_Heading')}}</span>
                            </q-tooltip>
                        </span>        
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MVC"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MVC"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVC_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVC_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVC_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVC_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.integrityImpact')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVI_Heading')}}</span>
                            </q-tooltip>
                        </span>        
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MVI"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MVI"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVI_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVI_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVI_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVI_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.availabilityImpact')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVA_Heading')}}</span>
                            </q-tooltip>
                        </span>        
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MVA"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MVA"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVA_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVA_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVA_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MVA_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                </div>
            </q-card-section>
            <h6 class="q-mb-none q-mt-md q-ml-md row">{{$t('cvss4.subsequentSystemImpact')}}</h6>
            <q-card-section class="row q-col-gutter-md">
                <div class="col-12">
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.confidentialityImpact')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSC_Heading')}}</span>
                            </q-tooltip>
                        </span>        
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MSC"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MSC"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSC_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSC_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSC_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSC_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.integrityImpact')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSI_Heading')}}</span>
                            </q-tooltip>
                        </span>        
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MSI"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MSI"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSI_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSI_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSI_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSI_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.availabilityImpact')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSA_Heading')}}</span>
                            </q-tooltip>
                        </span>        
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.MSA"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.MSA"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSA_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSA_N_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSA_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.MSA_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row">
                <div class="col-md-3" style="align-self:center">
                    <span>
                        {{$t('cvss4.environmentalSecurityReqTitle')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.environmentalSecurityReqMetricGroup_Legend')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-space />
            </q-card-section>
            <q-separator />
            <q-card-section class="row q-col-gutter-md">
                <div class="col">
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.confidentialityRequirement')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.CR_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.CR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.CR"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.CR_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.CR_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.CR_M_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.CR_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.integrityRequirement')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.IR_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.IR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.IR"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.IR_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.IR_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.IR_M_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.IR_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.availabilityRequirement')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.AR_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.AR"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.AR"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.AR_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.AR_L_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.AR_M_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.AR_H_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row">
                <div class="col-md-3" style="align-self:center">
                    <span>
                        {{$t('cvss4.exploitTitle')}}
                        <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                            <span :style="tooltip.style">{{$t('cvss4.tooltip.exploitMetricGroup_Legend')}}</span>
                        </q-tooltip>
                    </span>
                </div>
                <q-space />
            </q-card-section>
            <q-separator />
            <q-card-section class="row q-col-gutter-md">
                <div class="col">
                    <div class="q-my-sm text-weight-bold">
                        <span>
                            {{$t('cvss4.exploitMaturity')}}
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.E_Heading')}}</span>
                            </q-tooltip>
                        </span>
                    </div>
                    <q-btn-toggle
                        class="group-btn"
                        v-model="cvss4Obj.E"
                        toggle-color="grey-5"
                        toggle-text-color="black"
                        no-caps
                        :options="cvss4Items.E"
                        :readonly="readonly"
                    >
                        <template v-slot:one>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.E_X_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:two>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.E_A_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:three>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.E_P_Label')}}</span>
                            </q-tooltip>
                        </template>
                        <template v-slot:four>
                            <q-tooltip :anchor="tooltip.anchor" :self="tooltip.self" :delay="tooltip.delay" :max-width="tooltip.maxWidth">
                                <span :style="tooltip.style">{{$t('cvss4.tooltip.E_U_Label')}}</span>
                            </q-tooltip>
                        </template>
                    </q-btn-toggle>
                </div>
            </q-card-section>
        </q-expansion-item>
    </q-card>
</template>

<script>
import { $t } from '@/boot/i18n'
import { Cvss4P0 } from 'ae-cvss-calculator'


export default {
    name: 'cvss4-calculator',
    props: ['value', 'readonly'],

    data: function() {
        return {
            cvss4Items: {
                AV: [{label: $t("cvss4.network"), value: "N", slot: 'one'}, {label: $t("cvss4.adjacentNetwork"), value: "A", slot: 'two'}, {label: $t("cvss4.local"), value: "L", slot: 'three'}, {label: $t("cvss4.physical"), value: "P", slot: 'four'}],
                AC: [{label: $t("cvss4.low"), value: "L", slot: 'one'}, {label: $t("cvss4.high"), value: "H", slot: 'two'}],
                AT: [{label: $t("cvss4.none"), value: "N", slot: 'one'}, {label: $t("cvss4.present"), value: "P", slot: 'two'}],
                PR: [{label: $t("cvss4.none"), value: "N", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.high"), value: "H", slot: 'three'}],
                UI: [{label: $t("cvss4.none"), value: "N", slot: 'one'}, {label: $t("cvss4.passive"), value: "P", slot: 'two'}, {label: $t("cvss4.active"), value: "A", slot: 'three'}],
                
                VC: [{label: $t("cvss4.none"), value: "N", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.high"), value: "H", slot: 'three'}],
                VI: [{label: $t("cvss4.none"), value: "N", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.high"), value: "H", slot: 'three'}],
                VA: [{label: $t("cvss4.none"), value: "N", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.high"), value: "H", slot: 'three'}],
                SC: [{label: $t("cvss4.none"), value: "N", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.high"), value: "H", slot: 'three'}],
                SI: [{label: $t("cvss4.none"), value: "N", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.high"), value: "H", slot: 'three'}],
                SA: [{label: $t("cvss4.none"), value: "N", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.high"), value: "H", slot: 'three'}],
                
                S: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.negligible"), value: "N", slot: 'two'}, {label: $t("cvss4.present"), value: "P", slot: 'three'}],
                AU: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.no"), value: "N", slot: 'two'}, {label: $t("cvss4.yes"), value: "Y", slot: 'three'}],
                R: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.automatic"), value: "A", slot: 'two'}, {label: $t("cvss4.user"), value: "U", slot: 'three'}, {label: $t("cvss4.irrecoverable"), value: "I", slot: 'four'}],
                V: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.diffuse"), value: "D", slot: 'two'}, {label: $t("cvss4.concentrated"), value: "C", slot: 'three'}],
                RE: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.moderate"), value: "M", slot: 'three'}, {label: $t("cvss4.high"), value: "H", slot: 'four'}],
                U: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.clear"), value: "Clear", slot: 'two'}, {label: $t("cvss4.green"), value: "Green", slot: 'three'}, {label: $t("cvss4.amber"), value: "Amber", slot: 'four'}, {label: $t("cvss4.red"), value: "Red", slot: 'five'}],

                MAV: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.network"), value: "N", slot: 'two'}, {label: $t("cvss4.adjacentNetwork"), value: "A", slot: 'three'}, {label: $t("cvss4.local"), value: "L", slot: 'three'}, {label: $t("cvss4.physical"), value: "P", slot: 'four'}],
                MAC: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.high"), value: "H", slot: 'three'}],
                MAT: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.none"), value: "N", slot: 'two'}, {label: $t("cvss4.present"), value: "P", slot: 'three'}],
                MPR: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.none"), value: "N", slot: 'two'}, {label: $t("cvss4.low"), value: "L", slot: 'three'}, {label: $t("cvss4.high"), value: "H", slot: 'three'}],
                MUI: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.none"), value: "N", slot: 'two'}, {label: $t("cvss4.passive"), value: "P", slot: 'three'}, {label: $t("cvss4.active"), value: "A", slot: 'three'}],
                
                MVC: [{label: $t("cvss4.high"), value: "H", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.none"), value: "N", slot: 'three'}],
                MVI: [{label: $t("cvss4.high"), value: "H", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.none"), value: "N", slot: 'three'}],
                MVA: [{label: $t("cvss4.high"), value: "H", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.none"), value: "N", slot: 'three'}],
                MSC: [{label: $t("cvss4.high"), value: "H", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.none"), value: "N", slot: 'three'}],
                MSI: [{label: $t("cvss4.high"), value: "H", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.none"), value: "N", slot: 'three'}],
                MSA: [{label: $t("cvss4.high"), value: "H", slot: 'one'}, {label: $t("cvss4.low"), value: "L", slot: 'two'}, {label: $t("cvss4.none"), value: "N", slot: 'three'}],

                CR: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.high"), value: "H", slot: 'two'}, {label: $t("cvss4.medium"), value: "M", slot: 'three'}, {label: $t("cvss4.low"), value: "L", slot: 'four'}],
                IR: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.high"), value: "H", slot: 'two'}, {label: $t("cvss4.medium"), value: "M", slot: 'three'}, {label: $t("cvss4.low"), value: "L", slot: 'four'}],
                AR: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.high"), value: "H", slot: 'two'}, {label: $t("cvss4.medium"), value: "M", slot: 'three'}, {label: $t("cvss4.low"), value: "L", slot: 'four'}],

                E: [{label: $t("cvss4.notDefined"), value: "X", slot: 'one'}, {label: $t("cvss4.attacked"), value: "A", slot: 'two'}, {label: $t("cvss4.poc"), value: "P", slot: 'three'}, {label: $t("cvss4.unreported"), value: "U", slot: 'four'}],
            },
            cvss4Obj: {version:'4.0', AV:'', AC:'', AT: '', PR:'', UI:'', VC:'', VI:'', VA:'', SC:'', SI:'', SA:'', S:'', AU:'', R:'', V:'', RE:'', U:'', MAV:'', MAC:'', MAT:'', MPR:'', MUI:'', MVC:'', MVI:'', MVA:'', MSC:'', MSI:'', MSA:'', CR:'', IR:'', AR:'', E:''},
            cvss4: {
                baseScore: '',
                baseSeverity: '',
                environmentalScore: '',
                environmentalSeverity: '',
                threatScore: '',
                threatSeverity: ''
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
        this.cvss4StrToObject(this.value);
        try {
            this.cvss4 = new Cvss4P0(this.value).createJsonSchema();
        } catch {
            this.cvss4 = {}
        }
    },

    watch: {
        value: function(val) {
            this.cvss4StrToObject(val);
        },
        cvss4Obj: {
            handler(newValue, oldValue) {
                this.cvss4ObjectToStr()
            },
            deep: true
        }
    },

    methods: {
        cvss4StrToObject(str) {
            if (str) {
                var temp = str.split('/');
                for (var i=0; i<temp.length; i++) {
                    var elt = temp[i].split(':');
                    switch(elt[0]) {
                        case "CVSS":
                            this.cvss4Obj.version = elt[1];
                        case "AV":
                            this.cvss4Obj.AV = elt[1];
                            break;
                        case "AC":
                            this.cvss4Obj.AC = elt[1];
                            break;
                        case "AT":
                            this.cvss4Obj.AT = elt[1];
                            break;
                        case "PR":
                            this.cvss4Obj.PR = elt[1];
                            break;
                        case "UI":
                            this.cvss4Obj.UI = elt[1];
                            break;
                        case "VC":
                            this.cvss4Obj.VC = elt[1];
                            break;
                        case "VI":
                            this.cvss4Obj.VI = elt[1];
                            break;
                        case "VA":
                            this.cvss4Obj.VA = elt[1];
                            break;
                        case "SC":
                            this.cvss4Obj.SC = elt[1];
                            break;
                        case "SI":
                            this.cvss4Obj.SI = elt[1];
                            break;
                        case "SA":
                            this.cvss4Obj.SA = elt[1];
                            break;
                        case "S":
                            this.cvss4Obj.S = elt[1];
                            break;
                        case "AU":
                            this.cvss4Obj.AU = elt[1];
                            break;
                        case "R":
                            this.cvss4Obj.R = elt[1];
                            break;
                        case "V":
                            this.cvss4Obj.V = elt[1];
                            break;
                        case "RE":
                            this.cvss4Obj.RE = elt[1];
                            break;
                        case "U":
                            this.cvss4Obj.U = elt[1];
                            break;
                        case "MAV":
                            this.cvss4Obj.MAV = elt[1];
                            break;
                        case "MAC":
                            this.cvss4Obj.MAC = elt[1];
                            break;
                        case "MAT":
                            this.cvss4Obj.MAT = elt[1];
                            break;
                        case "MPR":
                            this.cvss4Obj.MPR = elt[1];
                            break;
                        case "MUI":
                            this.cvss4Obj.MUI = elt[1];
                            break;
                        case "MVC":
                            this.cvss4Obj.MVC = elt[1];
                            break;
                        case "MVI":
                            this.cvss4Obj.MVI = elt[1];
                            break;
                        case "MVA":
                            this.cvss4Obj.MVA = elt[1];
                            break;
                        case "MSC":
                            this.cvss4Obj.MSC = elt[1];
                            break;
                        case "MSI":
                            this.cvss4Obj.MSI = elt[1];
                            break;
                        case "MSA":
                            this.cvss4Obj.MSA = elt[1];
                            break;
                        case "CR":
                            this.cvss4Obj.CR = elt[1];
                            break;
                        case "IR":
                            this.cvss4Obj.IR = elt[1];
                            break;
                        case "AR":
                            this.cvss4Obj.AR = elt[1];
                            break;
                        case "E":
                            this.cvss4Obj.E = elt[1];
                            break;
                    }
                }
            }
        },

        cvss4ObjectToStr() {
            var vectorString = "CVSS:"+this.cvss4Obj.version;
            if (this.cvss4Obj.AV) vectorString += "/AV:"+this.cvss4Obj.AV
            if (this.cvss4Obj.AC) vectorString += "/AC:"+this.cvss4Obj.AC
            if (this.cvss4Obj.AT) vectorString += "/AT:"+this.cvss4Obj.AT
            if (this.cvss4Obj.PR) vectorString += "/PR:"+this.cvss4Obj.PR
            if (this.cvss4Obj.UI) vectorString += "/UI:"+this.cvss4Obj.UI
            if (this.cvss4Obj.VC) vectorString += "/VC:"+this.cvss4Obj.VC
            if (this.cvss4Obj.VI) vectorString += "/VI:"+this.cvss4Obj.VI
            if (this.cvss4Obj.VA) vectorString += "/VA:"+this.cvss4Obj.VA
            if (this.cvss4Obj.SC) vectorString += "/SC:"+this.cvss4Obj.SC
            if (this.cvss4Obj.SI) vectorString += "/SI:"+this.cvss4Obj.SI
            if (this.cvss4Obj.SA) vectorString += "/SA:"+this.cvss4Obj.SA
            if (this.cvss4Obj.S) vectorString += "/S:"+this.cvss4Obj.S
            if (this.cvss4Obj.AU) vectorString += "/AU:"+this.cvss4Obj.AU
            if (this.cvss4Obj.R) vectorString += "/R:"+this.cvss4Obj.R
            if (this.cvss4Obj.V) vectorString += "/V:"+this.cvss4Obj.V
            if (this.cvss4Obj.RE) vectorString += "/RE:"+this.cvss4Obj.RE
            if (this.cvss4Obj.U) vectorString += "/U:"+this.cvss4Obj.U
            if (this.cvss4Obj.MAV) vectorString += "/MAV:"+this.cvss4Obj.MAV
            if (this.cvss4Obj.MAC) vectorString += "/MAC:"+this.cvss4Obj.MAC
            if (this.cvss4Obj.MAT) vectorString += "/MAT:"+this.cvss4Obj.MAT
            if (this.cvss4Obj.MPR) vectorString += "/MPR:"+this.cvss4Obj.MPR
            if (this.cvss4Obj.MUI) vectorString += "/MUI:"+this.cvss4Obj.MUI
            if (this.cvss4Obj.MVC) vectorString += "/MVC:"+this.cvss4Obj.MVC
            if (this.cvss4Obj.MVI) vectorString += "/MVI:"+this.cvss4Obj.MVI
            if (this.cvss4Obj.MVA) vectorString += "/MVA:"+this.cvss4Obj.MVA
            if (this.cvss4Obj.MSC) vectorString += "/MSC:"+this.cvss4Obj.MSC
            if (this.cvss4Obj.MSI) vectorString += "/MSI:"+this.cvss4Obj.MSI
            if (this.cvss4Obj.MSA) vectorString += "/MSA:"+this.cvss4Obj.MSA
            if (this.cvss4Obj.CR) vectorString += "/CR:"+this.cvss4Obj.CR
            if (this.cvss4Obj.IR) vectorString += "/IR:"+this.cvss4Obj.IR
            if (this.cvss4Obj.AR) vectorString += "/AR:"+this.cvss4Obj.AR
            if (this.cvss4Obj.E) vectorString += "/E:"+this.cvss4Obj.E

            try {
                this.cvss4 = new Cvss4P0(this.value).createJsonSchema();
            } catch {
                this.cvss4 = {}
            }
            
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
