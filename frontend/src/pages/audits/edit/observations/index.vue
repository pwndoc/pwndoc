<template>
  <div class="q-pa-md">
    <breadcrumb
      buttons
      :title="`${auditParent.name} (${auditParent.auditType || 'Audit Type not set'})`"
      :state="auditParent.state"
      :approvals="auditParent.approvals"
    >
      <template v-slot:buttons>
        <q-btn
          color="positive"
          :label="$t('btn.addObservation')"
          icon="add"
          no-caps
          @click="createObservation()"
          v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
        />
      </template>
    </breadcrumb>

    <q-card class="q-mt-md">
      <q-card-section>
        <div class="text-h6">{{$t('observations')}}</div>
        <div class="text-caption">{{$t('manageObservationsForAudit')}}</div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pa-none">
        <q-table
          :rows="observations"
          :columns="columns"
          row-key="_id"
          :pagination="pagination"
          :filter="filter"
          :loading="loading"
          @row-click="editObservation"
          binary-state-sort
        >
          <template v-slot:top-right>
            <q-input
              dense
              debounce="300"
              v-model="filter"
              :placeholder="$t('search')"
            >
              <template v-slot:append>
                <q-icon name="search" />
              </template>
            </q-input>
          </template>

          <template v-slot:body-cell-identifier="props">
            <q-td :props="props">
              <q-badge color="primary">
                OBS-{{ String(props.row.identifier).padStart(3, '0') }}
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-riskSeverity="props">
            <q-td :props="props">
              <q-chip
                :color="getRiskColor(props.row.riskScore?.severity)"
                text-color="white"
                dense
                class="text-weight-medium"
              >
                {{ props.row.riskScore?.severity || 'None' }}
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-riskScore="props">
            <q-td :props="props">
              <div class="text-weight-medium">
                {{ props.row.riskScore?.score?.toFixed(1) || 'N/A' }}
              </div>
              <div class="text-caption text-grey">
                {{ props.row.riskScore?.method || 'none' }}
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-priority="props">
            <q-td :props="props">
              <q-badge :color="getPriorityColor(props.row.priority)">
                {{ getPriorityLabel(props.row.priority) }}
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                round
                icon="edit"
                color="primary"
                @click.stop="editObservation(null, props.row)"
                v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
              >
                <q-tooltip>{{$t('btn.edit')}}</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="delete"
                color="negative"
                @click.stop="deleteObservation(props.row)"
                v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
              >
                <q-tooltip>{{$t('btn.delete')}}</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { ref, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Dialog, Notify } from 'quasar';
import ObservationService from '@/services/observation';
import Utils from '@/services/utils';
import { $t } from '@/boot/i18n';

export default {
  name: 'ObservationList',

  setup() {
    const route = useRoute();
    const router = useRouter();
    const auditId = route.params.auditId;

    const auditParent = inject('audit');
    const frontEndAuditState = inject('frontEndAuditState');
    const AUDIT_VIEW_STATE = Utils.AUDIT_VIEW_STATE;

    const observations = ref([]);
    const loading = ref(false);
    const filter = ref('');
    const pagination = ref({
      sortBy: 'identifier',
      descending: false,
      page: 1,
      rowsPerPage: 10
    });

    const columns = [
      {
        name: 'identifier',
        label: $t('id'),
        align: 'left',
        field: 'identifier',
        sortable: true
      },
      {
        name: 'title',
        label: $t('title'),
        align: 'left',
        field: 'title',
        sortable: true
      },
      {
        name: 'category',
        label: $t('category'),
        align: 'left',
        field: 'category',
        sortable: true
      },
      {
        name: 'riskSeverity',
        label: $t('severity'),
        align: 'center',
        field: row => row.riskScore?.severity,
        sortable: true
      },
      {
        name: 'riskScore',
        label: $t('riskScore'),
        align: 'center',
        field: row => row.riskScore?.score,
        sortable: true
      },
      {
        name: 'priority',
        label: $t('priority'),
        align: 'center',
        field: 'priority',
        sortable: true
      },
      {
        name: 'actions',
        label: $t('actions'),
        align: 'center'
      }
    ];

    const getRiskColor = (severity) => {
      const colors = {
        'None': 'blue-5',
        'Low': 'green',
        'Medium': 'orange',
        'High': 'red',
        'Critical': 'black'
      };
      return colors[severity] || 'grey';
    };

    const getPriorityColor = (priority) => {
      const colors = {
        1: 'red',      // Urgent
        2: 'orange',   // High
        3: 'yellow-8', // Medium
        4: 'blue'      // Low
      };
      return colors[priority] || 'grey';
    };

    const getPriorityLabel = (priority) => {
      const labels = {
        1: $t('urgent'),
        2: $t('high'),
        3: $t('medium'),
        4: $t('low')
      };
      return labels[priority] || 'N/A';
    };

    const loadObservations = async () => {
      loading.value = true;
      try {
        const response = await ObservationService.getObservations(auditId);
        observations.value = response.data.data || [];
      } catch (error) {
        Notify.create({
          type: 'negative',
          message: $t('err.errorGettingObservations')
        });
      } finally {
        loading.value = false;
      }
    };

    const createObservation = () => {
      router.push(`/audits/${auditId}/observations/new`);
    };

    const editObservation = (evt, row) => {
      router.push(`/audits/${auditId}/observations/${row._id}`);
    };

    const deleteObservation = (observation) => {
      Dialog.create({
        title: $t('confirm'),
        message: $t('confirmDeleteObservation', { title: observation.title }),
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          await ObservationService.deleteObservation(auditId, observation._id);
          Notify.create({
            type: 'positive',
            message: $t('observationDeletedSuccessfully')
          });
          loadObservations();
        } catch (error) {
          Notify.create({
            type: 'negative',
            message: $t('err.errorDeletingObservation')
          });
        }
      });
    };

    onMounted(() => {
      loadObservations();
    });

    return {
      auditParent,
      frontEndAuditState,
      AUDIT_VIEW_STATE,
      observations,
      loading,
      filter,
      pagination,
      columns,
      getRiskColor,
      getPriorityColor,
      getPriorityLabel,
      createObservation,
      editObservation,
      deleteObservation
    };
  }
};
</script>

<style scoped>
.q-table tbody td {
  cursor: pointer;
}
</style>
