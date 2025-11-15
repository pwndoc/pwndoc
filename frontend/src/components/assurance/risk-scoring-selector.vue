<template>
  <div>
    <div class="text-subtitle2 q-mb-md">{{ label }}</div>

    <!-- Risk Scoring Method Selector -->
    <q-select
      v-model="localRiskScore.method"
      :options="scoringMethods"
      option-value="value"
      option-label="label"
      :label="$t('riskScoringMethod')"
      emit-value
      map-options
      outlined
      dense
      class="q-mb-md"
      @update:model-value="onMethodChange"
      :readonly="readonly"
    >
      <template v-slot:prepend>
        <q-icon name="analytics" />
      </template>
    </q-select>

    <!-- Custom Scoring -->
    <div v-if="localRiskScore.method === 'custom'" class="q-gutter-md">
      <q-slider
        v-model="localRiskScore.customScore"
        :min="0"
        :max="10"
        :step="0.1"
        label
        :label-value="`Score: ${localRiskScore.customScore?.toFixed(1)} - ${computedSeverity}`"
        color="primary"
        @update:model-value="updateRiskScore"
        :readonly="readonly"
      />
      <q-badge :color="getSeverityColor(computedSeverity)" class="q-pa-sm">
        {{ computedSeverity }}
      </q-badge>
    </div>

    <!-- Risk Matrix -->
    <div v-else-if="localRiskScore.method === 'matrix'" class="q-gutter-md">
      <div class="row q-col-gutter-md">
        <div class="col-6">
          <q-select
            v-model="localRiskScore.likelihood"
            :options="matrixOptions"
            :label="$t('likelihood')"
            outlined
            dense
            @update:model-value="updateRiskScore"
            :readonly="readonly"
          />
        </div>
        <div class="col-6">
          <q-select
            v-model="localRiskScore.impact"
            :options="matrixOptions"
            :label="$t('impact')"
            outlined
            dense
            @update:model-value="updateRiskScore"
            :readonly="readonly"
          />
        </div>
      </div>
      <div v-if="localRiskScore.likelihood && localRiskScore.impact">
        <div class="text-caption">{{$t('calculatedRiskScore')}}: {{ computedScore?.toFixed(1) }}</div>
        <q-badge :color="getSeverityColor(computedSeverity)" class="q-pa-sm">
          {{ computedSeverity }}
        </q-badge>
      </div>
    </div>

    <!-- CVSS 3.1 -->
    <div v-else-if="localRiskScore.method === 'cvss3'">
      <q-input
        v-model="localRiskScore.vector"
        :label="$t('cvss3Vector')"
        outlined
        dense
        placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
        @update:model-value="updateRiskScore"
        :readonly="readonly"
      />
      <div v-if="cvssError" class="text-negative text-caption q-mt-xs">
        {{ cvssError }}
      </div>
      <div v-else-if="localRiskScore.vector && computedScore !== null" class="q-mt-sm">
        <div class="text-caption">{{$t('baseScore')}}: {{ computedScore?.toFixed(1) }}</div>
        <q-badge :color="getSeverityColor(computedSeverity)" class="q-pa-sm">
          {{ computedSeverity }}
        </q-badge>
      </div>
      <q-btn
        flat
        dense
        color="primary"
        :label="$t('openCvssCalculator')"
        icon="open_in_new"
        size="sm"
        class="q-mt-sm"
        @click="openCvssCalculator('3.1')"
      />
    </div>

    <!-- CVSS 4.0 -->
    <div v-else-if="localRiskScore.method === 'cvss4'">
      <q-input
        v-model="localRiskScore.vector"
        :label="$t('cvss4Vector')"
        outlined
        dense
        placeholder="CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"
        @update:model-value="updateRiskScore"
        :readonly="readonly"
      />
      <div v-if="cvssError" class="text-negative text-caption q-mt-xs">
        {{ cvssError }}
      </div>
      <div v-else-if="localRiskScore.vector && computedScore !== null" class="q-mt-sm">
        <div class="text-caption">{{$t('baseScore')}}: {{ computedScore?.toFixed(1) }}</div>
        <q-badge :color="getSeverityColor(computedSeverity)" class="q-pa-sm">
          {{ computedSeverity }}
        </q-badge>
      </div>
      <q-btn
        flat
        dense
        color="primary"
        :label="$t('openCvssCalculator')"
        icon="open_in_new"
        size="sm"
        class="q-mt-sm"
        @click="openCvssCalculator('4.0')"
      />
    </div>

    <!-- None -->
    <div v-else-if="localRiskScore.method === 'none'" class="text-caption text-grey">
      {{ $t('noRiskScoringApplied') }}
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { Cvss3P1, Cvss4P0 } from 'ae-cvss-calculator';
import { $t } from '@/boot/i18n';

export default {
  name: 'RiskScoringSelector',

  props: {
    modelValue: {
      type: Object,
      default: () => ({
        method: 'custom',
        customScore: 5.0,
        severity: 'Medium'
      })
    },
    label: {
      type: String,
      default: () => $t('riskScoring')
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },

  emits: ['update:modelValue'],

  setup(props, { emit }) {
    const localRiskScore = ref({
      method: props.modelValue?.method || 'custom',
      customScore: props.modelValue?.customScore || 5.0,
      likelihood: props.modelValue?.likelihood || 'Medium',
      impact: props.modelValue?.impact || 'Medium',
      vector: props.modelValue?.vector || '',
      score: props.modelValue?.score || 0,
      severity: props.modelValue?.severity || 'Medium'
    });

    const cvssError = ref('');

    const scoringMethods = [
      { label: $t('customScoring'), value: 'custom' },
      { label: $t('riskMatrix'), value: 'matrix' },
      { label: 'CVSS 3.1', value: 'cvss3' },
      { label: 'CVSS 4.0', value: 'cvss4' },
      { label: $t('none'), value: 'none' }
    ];

    const matrixOptions = ['Low', 'Medium', 'High'];

    const computedScore = computed(() => {
      if (localRiskScore.value.method === 'custom') {
        return localRiskScore.value.customScore;
      } else if (localRiskScore.value.method === 'matrix') {
        const likelihoodMap = { 'Low': 1, 'Medium': 2, 'High': 3 };
        const impactMap = { 'Low': 1, 'Medium': 2, 'High': 3 };
        const l = likelihoodMap[localRiskScore.value.likelihood] || 2;
        const i = impactMap[localRiskScore.value.impact] || 2;
        return (l * i) / 9 * 10;
      } else if (localRiskScore.value.method === 'cvss3' && localRiskScore.value.vector) {
        try {
          const calc = new Cvss3P1(localRiskScore.value.vector);
          const result = calc.calculateCVSSFromVector(localRiskScore.value.vector);
          cvssError.value = '';
          return result.baseScore;
        } catch (e) {
          cvssError.value = $t('invalidCvssVector');
          return null;
        }
      } else if (localRiskScore.value.method === 'cvss4' && localRiskScore.value.vector) {
        try {
          const calc = new Cvss4P0(localRiskScore.value.vector);
          const result = calc.calculateCVSSFromVector(localRiskScore.value.vector);
          cvssError.value = '';
          return result.baseScore;
        } catch (e) {
          cvssError.value = $t('invalidCvssVector');
          return null;
        }
      }
      return null;
    });

    const computedSeverity = computed(() => {
      const score = computedScore.value;
      if (score === null || score === undefined) return 'None';
      if (score >= 9.0) return 'Critical';
      if (score >= 7.0) return 'High';
      if (score >= 4.0) return 'Medium';
      if (score >= 0.1) return 'Low';
      return 'None';
    });

    const getSeverityColor = (severity) => {
      const colors = {
        'None': 'blue-5',
        'Low': 'green',
        'Medium': 'orange',
        'High': 'red',
        'Critical': 'black'
      };
      return colors[severity] || 'grey';
    };

    const updateRiskScore = () => {
      const updatedScore = {
        ...localRiskScore.value,
        score: computedScore.value,
        severity: computedSeverity.value
      };
      emit('update:modelValue', updatedScore);
    };

    const onMethodChange = () => {
      // Reset method-specific fields
      if (localRiskScore.value.method === 'custom') {
        localRiskScore.value.customScore = 5.0;
      } else if (localRiskScore.value.method === 'matrix') {
        localRiskScore.value.likelihood = 'Medium';
        localRiskScore.value.impact = 'Medium';
      } else if (localRiskScore.value.method === 'cvss3' || localRiskScore.value.method === 'cvss4') {
        localRiskScore.value.vector = '';
      }
      updateRiskScore();
    };

    const openCvssCalculator = (version) => {
      const url = version === '3.1'
        ? 'https://www.first.org/cvss/calculator/3.1'
        : 'https://www.first.org/cvss/calculator/4.0';
      window.open(url, '_blank');
    };

    // Watch for prop changes
    watch(() => props.modelValue, (newValue) => {
      if (newValue) {
        localRiskScore.value = {
          method: newValue.method || 'custom',
          customScore: newValue.customScore || 5.0,
          likelihood: newValue.likelihood || 'Medium',
          impact: newValue.impact || 'Medium',
          vector: newValue.vector || '',
          score: newValue.score || 0,
          severity: newValue.severity || 'Medium'
        };
      }
    }, { deep: true });

    return {
      localRiskScore,
      scoringMethods,
      matrixOptions,
      cvssError,
      computedScore,
      computedSeverity,
      getSeverityColor,
      updateRiskScore,
      onMethodChange,
      openCvssCalculator
    };
  }
};
</script>
