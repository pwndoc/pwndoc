<template>
  <div class="draft-diff">
    <q-expansion-item
      v-for="field in changedFields"
      :key="field.path"
      default-opened
      dense
      expand-separator
      :label="field.path"
      header-class="text-weight-medium"
    >
      <div class="row q-col-gutter-md q-pa-sm">
        <div class="col-12 col-md-6">
          <div class="text-caption text-grey-7 q-mb-xs">{{ $t('draftRecovery.currentVersion') }}</div>
          <div v-if="isHtmlField(field.path)" class="draft-preview" v-html="htmlEncode(field.current)"></div>
          <pre v-else class="draft-raw">{{ formatValue(field.current) }}</pre>
          <pre v-if="isHtmlField(field.path)" class="draft-raw q-mt-sm">{{ formatValue(field.current) }}</pre>
        </div>
        <div class="col-12 col-md-6">
          <div class="text-caption text-grey-7 q-mb-xs">{{ $t('draftRecovery.draftVersion') }}</div>
          <div v-if="isHtmlField(field.path)" class="draft-preview" v-html="htmlEncode(field.draft)"></div>
          <pre v-else class="draft-raw">{{ formatValue(field.draft) }}</pre>
          <pre v-if="isHtmlField(field.path)" class="draft-raw q-mt-sm">{{ formatValue(field.draft) }}</pre>
        </div>
      </div>
    </q-expansion-item>
    <div v-if="changedFields.length === 0" class="text-grey-7 q-pa-sm">
      {{ $t('draftRecovery.noDifferences') }}
    </div>
  </div>
</template>

<script>
import Utils from '@/services/utils'
import _ from 'lodash'

const HTML_FIELDS = ['description', 'observation', 'remediation', 'poc', 'text']

export default {
  name: 'DraftDiff',

  props: {
    current: {
      type: Object,
      default: () => ({})
    },
    draft: {
      type: Object,
      default: () => ({})
    }
  },

  computed: {
    changedFields() {
      const fields = []
      this.collectDiffs('', this.current, this.draft, fields)
      return fields
    }
  },

  methods: {
    collectDiffs(path, current, draft, fields) {
      if (_.isEqual(current, draft))
        return

      const currentIsObject = current && typeof current === 'object' && !Array.isArray(current)
      const draftIsObject = draft && typeof draft === 'object' && !Array.isArray(draft)

      if (currentIsObject && draftIsObject) {
        const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(draft)]))
        keys.forEach(key => this.collectDiffs(path ? `${path}.${key}` : key, current[key], draft[key], fields))
        return
      }

      fields.push({
        path: path || 'value',
        current,
        draft
      })
    },

    isHtmlField(path) {
      const lastPart = path.split('.').pop()
      return HTML_FIELDS.includes(lastPart)
    },

    htmlEncode(value) {
      return Utils.htmlEncode(typeof value === 'string' ? value : this.formatValue(value))
    },

    formatValue(value) {
      if (value === undefined)
        return ''
      if (value === null)
        return 'null'
      if (typeof value === 'string')
        return value
      return JSON.stringify(value, null, 2)
    }
  }
}
</script>

<style scoped>
.draft-raw {
  max-height: 260px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  background: #fafafa;
  margin: 0;
}

.draft-preview {
  max-height: 260px;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  background: white;
}
</style>
