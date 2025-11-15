<template>
  <breadcrumb
    buttons
    :title="`${auditParent.name} (${auditParent.auditType || 'Audit Type not set'})`"
    :state="auditParent.state"
    :approvals="auditParent.approvals"
  >
    <template v-slot:buttons>
      <q-btn
        color="negative"
        class="q-mr-sm"
        :label="$t('btn.delete')"
        no-caps
        @click="deleteObservation()"
        v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT && !isNew"
      />
      <q-btn
        color="positive"
        :label="$t('btn.save') + ' (ctrl+s)'"
        no-caps
        @click="saveObservation()"
        v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
      />
    </template>
  </breadcrumb>

  <div class="row">
    <q-tabs
      v-model="selectedTab"
      align="left"
      indicator-color="primary"
      active-bg-color="grey-3"
      class="bg-white full-width top-fixed"
    >
      <q-tab name="definition" :label="$t('definition')" />
      <q-tab name="evidence" :label="$t('evidence')" />
      <q-tab name="details" :label="$t('details')" />
      <q-space />
      <template v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT && !isNew">
        <q-separator vertical />
        <q-toggle
          :label="$t('completed')"
          v-model="observation.status"
          :true-value="0"
          :false-value="1"
          checked-icon="check"
          unchecked-icon="clear"
          color="green"
        />
      </template>
    </q-tabs>

    <div class="row full-width content">
      <q-tab-panels
        v-model="selectedTab"
        animated
        class="bg-transparent q-mt-md col-xl-8 offset-xl-2 col-12"
      >
        <!-- Definition Tab -->
        <q-tab-panel name="definition">
          <q-card>
            <q-card-section class="row q-col-gutter-md">
              <!-- Title -->
              <q-input
                class="col-md-8 col-12"
                :label="$t('title')"
                v-model="observation.title"
                outlined
                :rules="[val => !!val || $t('fieldIsRequired')]"
                :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
              >
                <template v-slot:label>
                  {{ $t('title') }} <span class="text-red">*</span>
                </template>
              </q-input>

              <!-- Category -->
              <q-input
                class="col-md-4 col-12"
                :label="$t('category')"
                v-model="observation.category"
                outlined
                :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
              />

              <!-- Description -->
              <div class="col-12">
                <div class="text-subtitle2 q-mb-sm">
                  {{ $t('description') }} <span class="text-red">*</span>
                </div>
                <basic-editor
                  v-model="observation.description"
                  :noSync="true"
                  :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                />
              </div>

              <!-- Impact -->
              <div class="col-12">
                <div class="text-subtitle2 q-mb-sm">{{ $t('impact') }}</div>
                <basic-editor
                  v-model="observation.impact"
                  :noSync="true"
                  :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                />
              </div>

              <!-- Recommendation -->
              <div class="col-12">
                <div class="text-subtitle2 q-mb-sm">
                  {{ $t('recommendation') }} <span class="text-red">*</span>
                </div>
                <basic-editor
                  v-model="observation.recommendation"
                  :noSync="true"
                  :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                />
              </div>

              <!-- References -->
              <div class="col-12">
                <div class="text-subtitle2 q-mb-sm">{{ $t('references') }}</div>
                <textarea-array
                  v-model="observation.references"
                  :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                />
              </div>
            </q-card-section>
          </q-card>
        </q-tab-panel>

        <!-- Evidence Tab -->
        <q-tab-panel name="evidence">
          <q-card>
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">{{ $t('evidenceDetails') }}</div>
              <basic-editor
                v-model="observation.evidence"
                :noSync="true"
                :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
              />
            </q-card-section>
          </q-card>
        </q-tab-panel>

        <!-- Details Tab -->
        <q-tab-panel name="details">
          <q-card>
            <q-card-section class="row q-col-gutter-md">
              <!-- Risk Scoring -->
              <div class="col-12">
                <risk-scoring-selector
                  v-model="observation.riskScore"
                  :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
                />
              </div>

              <q-separator class="col-12" />

              <!-- Priority -->
              <q-select
                class="col-md-6 col-12"
                :label="$t('priority')"
                v-model="observation.priority"
                :options="priorityOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
              />

              <!-- Effort Level -->
              <q-select
                class="col-md-6 col-12"
                :label="$t('effortLevel')"
                v-model="observation.effortLevel"
                :options="effortOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
              />

              <!-- Verification Status -->
              <q-select
                class="col-12"
                :label="$t('verificationStatus')"
                v-model="observation.verificationStatus"
                :options="verificationOptions"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                :readonly="frontEndAuditState !== AUDIT_VIEW_STATE.EDIT"
              />
            </q-card-section>
          </q-card>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, inject, onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Dialog, Notify } from 'quasar';
import ObservationService from '@/services/observation';
import Utils from '@/services/utils';
import { $t } from '@/boot/i18n';
import BasicEditor from 'components/editor/Editor.vue';
import TextareaArray from 'components/textarea-array.vue';
import RiskScoringSelector from 'components/assurance/risk-scoring-selector.vue';

export default {
  name: 'ObservationEditor',

  components: {
    BasicEditor,
    TextareaArray,
    RiskScoringSelector
  },

  setup() {
    const route = useRoute();
    const router = useRouter();
    const auditId = route.params.auditId;
    const observationId = route.params.observationId;
    const isNew = observationId === 'new';

    const auditParent = inject('audit');
    const frontEndAuditState = inject('frontEndAuditState');
    const AUDIT_VIEW_STATE = Utils.AUDIT_VIEW_STATE;

    const selectedTab = ref('definition');
    const observation = ref({
      title: '',
      category: '',
      description: '<p></p>',
      evidence: '<p></p>',
      impact: '<p></p>',
      recommendation: '<p></p>',
      references: [],
      priority: 3,
      effortLevel: 2,
      status: 1,
      verificationStatus: 'not_verified',
      riskScore: {
        method: 'custom',
        customScore: 5.0,
        severity: 'Medium',
        score: 5.0
      }
    });

    const priorityOptions = [
      { label: $t('urgent'), value: 1 },
      { label: $t('high'), value: 2 },
      { label: $t('medium'), value: 3 },
      { label: $t('low'), value: 4 }
    ];

    const effortOptions = [
      { label: $t('low'), value: 1 },
      { label: $t('medium'), value: 2 },
      { label: $t('high'), value: 3 }
    ];

    const verificationOptions = [
      { label: $t('verified'), value: 'verified' },
      { label: $t('notVerified'), value: 'not_verified' },
      { label: $t('partial'), value: 'partial' },
      { label: $t('notApplicable'), value: 'not_applicable' }
    ];

    const loadObservation = async () => {
      if (!isNew) {
        try {
          const response = await ObservationService.getObservation(auditId, observationId);
          observation.value = response.data.data;
        } catch (error) {
          Notify.create({
            type: 'negative',
            message: $t('err.errorGettingObservation')
          });
        }
      }
    };

    const saveObservation = async () => {
      // Validation
      if (!observation.value.title) {
        Notify.create({
          type: 'warning',
          message: $t('err.titleRequired')
        });
        return;
      }

      try {
        if (isNew) {
          const response = await ObservationService.createObservation(auditId, observation.value);
          Notify.create({
            type: 'positive',
            message: $t('observationCreatedSuccessfully')
          });
          // Redirect to edit page with new ID
          router.replace(`/audits/${auditId}/observations/${response.data.data._id}`);
        } else {
          await ObservationService.updateObservation(auditId, observationId, observation.value);
          Notify.create({
            type: 'positive',
            message: $t('observationUpdatedSuccessfully')
          });
        }
      } catch (error) {
        Notify.create({
          type: 'negative',
          message: $t('err.errorSavingObservation')
        });
      }
    };

    const deleteObservation = () => {
      Dialog.create({
        title: $t('confirm'),
        message: $t('confirmDeleteObservation', { title: observation.value.title }),
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await ObservationService.deleteObservation(auditId, observationId);
          Notify.create({
            type: 'positive',
            message: $t('observationDeletedSuccessfully')
          });
          router.push(`/audits/${auditId}/observations`);
        } catch (error) {
          Notify.create({
            type: 'negative',
            message: $t('err.errorDeletingObservation')
          });
        }
      });
    };

    // Keyboard shortcut for save
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (frontEndAuditState.value === AUDIT_VIEW_STATE.EDIT) {
          saveObservation();
        }
      }
    };

    onBeforeMount(() => {
      window.addEventListener('keydown', handleKeyDown);
    });

    onMounted(() => {
      loadObservation();
    });

    return {
      auditParent,
      frontEndAuditState,
      AUDIT_VIEW_STATE,
      selectedTab,
      observation,
      isNew,
      priorityOptions,
      effortOptions,
      verificationOptions,
      saveObservation,
      deleteObservation
    };
  }
};
</script>
