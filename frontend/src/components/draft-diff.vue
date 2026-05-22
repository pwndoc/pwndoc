<template>
  <div class="draft-diff">
    <div class="row items-center q-gutter-sm q-mb-sm">
      <span class="text-body2 text-grey-8">View</span>
      <q-btn-toggle
        v-model="splitView"
        no-caps
        dense
        unelevated
        class="view-toggle"
        :options="[
          { label: 'Inline', value: false, icon: 'view_list' },
          { label: 'Side-by-side', value: true, icon: 'view_column' }
        ]"
      />
    </div>

    <div
      v-for="section in diffSections"
      :key="section.key"
      class="draft-section"
    >
      <div v-if="diffSections.length > 1" class="draft-section__title">{{ section.label }}</div>

      <template v-if="!splitView">
        <!-- Unified view -->
        <div
          v-for="field in section.fields"
          :key="field.key"
          class="diff-block"
        >
          <div class="diff-block__header">@@ {{ field.label }} @@</div>
          <div
            v-if="field.isHtml"
            class="diff-block__body diff-block__body--html editor__content"
          >
            <div class="ProseMirror draft-rendered-diff" v-html="field.renderedHtml"></div>
          </div>
          <div v-else class="diff-block__body">
            <div
              v-for="(chunk, i) in field.chunks"
              :key="i"
              class="diff-line"
              :class="{
                'diff-line--removed': chunk.removed,
                'diff-line--added': chunk.added,
                'diff-line--context': !chunk.removed && !chunk.added
              }"
            >
              <span class="diff-line__glyph">{{ chunk.removed ? '-' : chunk.added ? '+' : ' ' }}</span>
              <span class="diff-line__content" v-html="chunk.lineHtml"></span>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Split view -->
        <div
          v-for="field in section.fields"
          :key="field.key"
          class="draft-field"
        >
          <div class="draft-field__label">{{ field.label }}</div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7 q-mb-xs">{{ $t('draftRecovery.currentVersion') }}</div>
              <div
                v-if="field.isHtml"
                class="draft-preview draft-preview--html editor__content"
              >
                <div class="ProseMirror draft-rendered-diff" v-html="field.currentHtml"></div>
              </div>
              <div v-else class="draft-preview" v-html="field.currentHtml"></div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-7 q-mb-xs">{{ $t('draftRecovery.draftVersion') }}</div>
              <div
                v-if="field.isHtml"
                class="draft-preview draft-preview--html editor__content"
              >
                <div class="ProseMirror draft-rendered-diff" v-html="field.draftHtml"></div>
              </div>
              <div v-else class="draft-preview" v-html="field.draftHtml"></div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="diffSections.length === 0" class="text-grey-7 q-pa-sm">
      {{ $t('draftRecovery.noDifferences') }}
    </div>
  </div>
</template>

<script>
import { Diff, diffLines, diffWords } from 'diff'
import _ from 'lodash'
import Utils from '@/services/utils'

const HTML_FIELDS = ['description', 'observation', 'remediation', 'poc', 'text', 'retestDescription']
const DETAIL_KEYS = ['title', 'vulnType', 'description', 'observation', 'remediation', 'references', 'customFields']
const EXCLUDED_TOP_LEVEL_KEYS = ['_id', 'id', 'details']
const INLINE_FORMAT_TAGS = 'strong|b|em|i|u|s|strike|mark|sub|sup|span'

const FIELD_LABELS = {
  auditType: 'Audit Type',
  category: 'Category',
  client: 'Client',
  collaborators: 'Collaborators',
  company: 'Company',
  createdAt: 'Created At',
  customFields: 'Custom Fields',
  cvssv3: 'CVSS v3',
  cvssv4: 'CVSS v4',
  description: 'Description',
  findings: 'Findings',
  language: 'Language',
  locale: 'Locale',
  name: 'Name',
  observation: 'Observation',
  poc: 'Proof of Concept',
  priority: 'Priority',
  references: 'References',
  remediation: 'Remediation',
  remediationComplexity: 'Remediation Complexity',
  retestDescription: 'Retest Description',
  retestStatus: 'Retest Status',
  reviewers: 'Reviewers',
  scope: 'Scope',
  status: 'Status',
  template: 'Template',
  text: 'Text',
  title: 'Title',
  updatedAt: 'Updated At',
  vulnType: 'Type'
}

const UNSET_HTML = '<span class="diff-unset">Not set</span>'

function htmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function sanitizeHtml(html) {
  return Utils.htmlEncode(String(html || ''))
}

function renderLegendText(label, alt) {
  return [label, alt].filter(Boolean).join(' - ')
}

function resolveImageSrc(src) {
  return /^[a-fA-F0-9]{24}$/.test(src || '')
    ? `/api/images/download/${src}`
    : src
}

function normalizeEditorHtmlForDiff(html) {
  const clean = sanitizeHtml(html)
  if (!clean) return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(clean, 'text/html')

  doc.body.querySelectorAll('legend').forEach((legend) => {
    const label = legend.getAttribute('label') || ''
    const alt = legend.getAttribute('alt') || ''
    const visibleCaption = renderLegendText(label, alt)
    if (visibleCaption && !legend.textContent.trim()) {
      legend.textContent = visibleCaption
    }
    legend.removeAttribute('label')
    legend.removeAttribute('alt')
    legend.removeAttribute('commentid')
  })

  doc.body.querySelectorAll('img').forEach((img) => {
    const figure = doc.createElement('figure')
    const normalizedImg = doc.createElement('img')
    const caption = doc.createElement('figcaption')
    const alt = img.getAttribute('alt') || ''

    figure.className = 'draft-image'
    normalizedImg.setAttribute('src', resolveImageSrc(img.getAttribute('src') || ''))
    normalizedImg.setAttribute('alt', '')
    caption.textContent = alt

    figure.appendChild(normalizedImg)
    if (alt) figure.appendChild(caption)
    img.replaceWith(figure)
  })

  return doc.body.innerHTML
}

function buildHtmlDiff() {
  const d = new Diff(true)
  d.tokenize = function(value) {
    return value
      .split(new RegExp(`(<(?:${INLINE_FORMAT_TAGS})(?:\\s[^>]*)?>.*?</(?:${INLINE_FORMAT_TAGS})>|<[^>]+>|[{}:;,.]|\\s+)`, 'gi'))
      .filter(part => part !== '')
  }
  return d
}

function injectSpan(value, cls, options = {}) {
  const tagWrapper = options.tagWrapper || 'span'
  const withHighlightedImages = value.replace(
    /<img\b[^>]*>/gi,
    match => `<${tagWrapper} class="${cls}">${match}</${tagWrapper}>`
  )

  return withHighlightedImages
    .replace(new RegExp(`(<(?:${INLINE_FORMAT_TAGS})(?:\\s[^>]*)?>)(.+?)(</(?:${INLINE_FORMAT_TAGS})>)`, 'gi'), `$1<span class="${cls}">$2</span>$3`)
    .replace(/(<p>)(.+?)(<\/p>|$)/g, `$1<span class="${cls}">$2</span>$3`)
    .replace(/(<pre><code>)(.+?)(<\/code><\/pre>|$)/g, `$1<span class="${cls}">$2</span>$3`)
    .replace(/(<legend\b[^>]*>)(.+?)(<\/legend>|$)/g, `$1<span class="${cls}">$2</span>$3`)
    .replace(/(^[^<].*?)(<|$)/g, `<span class="${cls}">$1</span>$2`)
}

function buildRenderedHtmlDiff(currentText, draftText) {
  const d = buildHtmlDiff()
  const changes = d.diff(currentText, draftText)

  const content = changes.reduce((content, part) => {
    const val = part.value.replace(/<p><\/p>/g, '<p><br></p>')
    if (part.added)
      return content + injectSpan(val, 'diffadd', { tagWrapper: 'ins' })
    if (part.removed)
      return content + injectSpan(val, 'diffrem', { tagWrapper: 'del' })
    return content + val
  }, '')

  return content
}

function computeSplitSidesHtml(currentText, draftText) {
  const d = buildHtmlDiff()
  const changes = d.diff(currentText, draftText)

  let currentHtml = ''
  let draftHtml = ''

  changes.forEach(part => {
    const val = part.value.replace(/<p><\/p>/g, '<p><br></p>')
    if (part.added) {
      draftHtml += injectSpan(val, 'diffadd')
    } else if (part.removed) {
      currentHtml += injectSpan(val, 'diffrem')
    } else {
      currentHtml += val
      draftHtml += val
    }
  })

  return { currentHtml, draftHtml }
}

function computeSplitSidesText(currentText, draftText) {
  const d = new Diff(true)
  const changes = d.diff(currentText, draftText)

  let currentHtml = ''
  let draftHtml = ''

  changes.forEach(part => {
    const escaped = htmlEscape(part.value)
    if (part.added) {
      draftHtml += `<span class="diffadd">${escaped}</span>`
    } else if (part.removed) {
      currentHtml += `<span class="diffrem">${escaped}</span>`
    } else {
      currentHtml += escaped
      draftHtml += escaped
    }
  })

  return { currentHtml: `<span>${currentHtml}</span>`, draftHtml: `<span>${draftHtml}</span>` }
}

function pushIntraLines(result, wordChanges, isRemovedSide) {
  const markCls = isRemovedSide ? 'diff-word-rem' : 'diff-word-add'
  let currentLine = ''

  wordChanges.forEach(part => {
    if (isRemovedSide ? !!part.added : !!part.removed) return
    const highlighted = isRemovedSide ? !!part.removed : !!part.added
    const segments = part.value.split('\n')

    segments.forEach((segment, idx) => {
      if (idx > 0) {
        result.push({ lineHtml: currentLine, removed: isRemovedSide, added: !isRemovedSide })
        currentLine = ''
      }
      if (segment) {
        const escaped = htmlEscape(segment)
        currentLine += highlighted ? `<mark class="${markCls}">${escaped}</mark>` : escaped
      }
    })
  })

  result.push({ lineHtml: currentLine, removed: isRemovedSide, added: !isRemovedSide })
}

function computeUnifiedChunks(currentText, draftText) {
  const a = currentText.endsWith('\n') ? currentText : currentText + '\n'
  const b = draftText.endsWith('\n') ? draftText : draftText + '\n'
  const lineChanges = diffLines(a, b)
  const result = []
  let i = 0

  while (i < lineChanges.length) {
    const curr = lineChanges[i]

    if (curr.removed && i + 1 < lineChanges.length && lineChanges[i + 1].added) {
      const wordChanges = diffWords(
        curr.value.replace(/\n$/, ''),
        lineChanges[i + 1].value.replace(/\n$/, '')
      )
      pushIntraLines(result, wordChanges, true)
      pushIntraLines(result, wordChanges, false)
      i += 2
    } else {
      curr.value.replace(/\n$/, '').split('\n').forEach(line => {
        result.push({ lineHtml: htmlEscape(line), added: !!curr.added, removed: !!curr.removed })
      })
      i++
    }
  }

  return result
}

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
    },
    languages: {
      type: Array,
      default: () => []
    }
  },

  data: () => ({
    splitView: false
  }),

  computed: {
    diffSections() {
      const sections = []
      const mainFields = this.buildMainFields(this.current || {}, this.draft || {})

      if (mainFields.length) {
        sections.push({
          key: 'main',
          label: 'Main fields',
          fields: mainFields
        })
      }

      sections.push(...this.buildDetailSections(this.current?.details, this.draft?.details))

      return sections
    }
  },

  methods: {
    buildMainFields(current, draft) {
      const fields = []
      const keys = this.sortedKeys(current, draft)
        .filter(key => !EXCLUDED_TOP_LEVEL_KEYS.includes(key))

      keys.forEach((key) => {
        if (_.isEqual(current[key], draft[key]))
          return

        if (key === 'customFields') {
          fields.push(...this.buildCustomFieldItems('customFields', current[key], draft[key]))
          return
        }

        fields.push(this.createField(key, key, current[key], draft[key]))
      })

      return fields
    },

    buildDetailSections(currentDetails = [], draftDetails = []) {
      if (!Array.isArray(currentDetails) && !Array.isArray(draftDetails))
        return []

      const currentByKey = this.indexDetails(currentDetails)
      const draftByKey = this.indexDetails(draftDetails)
      const detailKeys = Array.from(new Set([...Object.keys(currentByKey), ...Object.keys(draftByKey)]))

      return detailKeys.map((key) => {
        const current = currentByKey[key] || {}
        const draft = draftByKey[key] || {}
        const fields = []

        DETAIL_KEYS.forEach((fieldKey) => {
          if (_.isEqual(current[fieldKey], draft[fieldKey]))
            return

          if (fieldKey === 'customFields') {
            fields.push(...this.buildCustomFieldItems(`${key}.customFields`, current[fieldKey], draft[fieldKey]))
            return
          }

          fields.push(this.createField(`${key}.${fieldKey}`, fieldKey, current[fieldKey], draft[fieldKey]))
        })

        this.sortedKeys(current, draft)
          .filter(fieldKey => !DETAIL_KEYS.includes(fieldKey) && !['_id', 'id', 'locale'].includes(fieldKey))
          .forEach((fieldKey) => {
            if (!_.isEqual(current[fieldKey], draft[fieldKey]))
              fields.push(this.createField(`${key}.${fieldKey}`, fieldKey, current[fieldKey], draft[fieldKey]))
          })

        return {
          key: `details-${key}`,
          label: `Details (${this.detailLabel(current, draft, key)})`,
          fields
        }
      }).filter(section => section.fields.length)
    },

    buildCustomFieldItems(prefix, currentFields, draftFields) {
      const currentByKey = this.indexCustomFields(currentFields)
      const draftByKey = this.indexCustomFields(draftFields)
      const keys = Array.from(new Set([...Object.keys(currentByKey), ...Object.keys(draftByKey)]))

      return keys.reduce((items, key) => {
        const current = currentByKey[key]
        const draft = draftByKey[key]
        const currentValue = this.customFieldValue(current)
        const draftValue = this.customFieldValue(draft)
        const label = this.customFieldLabel(current, draft)

        if (this.isLocalizedValueArray(currentValue) || this.isLocalizedValueArray(draftValue)) {
          items.push(...this.buildLocalizedCustomFieldItems(
            prefix,
            key,
            label,
            currentValue,
            draftValue
          ))
          return items
        }

        if (!_.isEqual(currentValue, draftValue)) {
          items.push(this.createField(
            `${prefix}.${key}`,
            label,
            currentValue,
            draftValue
          ))
        }

        return items
      }, [])
    },

    buildLocalizedCustomFieldItems(prefix, key, label, currentValue, draftValue) {
      const currentByLocale = this.indexLocalizedValues(currentValue)
      const draftByLocale = this.indexLocalizedValues(draftValue)
      const locales = Array.from(new Set([
        ...Object.keys(currentByLocale),
        ...Object.keys(draftByLocale)
      ]))

      return locales.reduce((items, locale) => {
        const currentLocaleValue = currentByLocale[locale]
        const draftLocaleValue = draftByLocale[locale]

        if (!_.isEqual(currentLocaleValue, draftLocaleValue)) {
          items.push(this.createField(
            `${prefix}.${key}.${locale}`,
            label,
            currentLocaleValue,
            draftLocaleValue,
            `${label} (${this.localeLabel(locale)})`
          ))
        }

        return items
      }, [])
    },

    createField(key, labelKey, current, draft, displayLabel = null) {
      const isHtml = this.isHtmlField(labelKey) || this.isHtmlValue(current) || this.isHtmlValue(draft)
      const currentEmpty = this.isEmpty(current)
      const draftEmpty = this.isEmpty(draft)
      const currentHtmlText = isHtml ? normalizeEditorHtmlForDiff(current || '') : ''
      const draftHtmlText = isHtml ? normalizeEditorHtmlForDiff(draft || '') : ''

      // --- Split view sides ---
      let currentHtml, draftHtml

      if (isHtml) {
        if (currentEmpty && !draftEmpty) {
          currentHtml = UNSET_HTML
          draftHtml = injectSpan(draftHtmlText, 'diffadd', { tagWrapper: 'ins' })
        } else if (!currentEmpty && draftEmpty) {
          currentHtml = injectSpan(currentHtmlText, 'diffrem', { tagWrapper: 'del' })
          draftHtml = UNSET_HTML
        } else {
          ;({ currentHtml, draftHtml } = computeSplitSidesHtml(currentHtmlText, draftHtmlText))
        }
      } else {
        const currentText = this.formatValue(current)
        const draftText = this.formatValue(draft)
        if (currentEmpty && !draftEmpty) {
          currentHtml = UNSET_HTML
          draftHtml = `<span class="diffadd">${htmlEscape(draftText)}</span>`
        } else if (!currentEmpty && draftEmpty) {
          currentHtml = `<span class="diffrem">${htmlEscape(currentText)}</span>`
          draftHtml = UNSET_HTML
        } else {
          ;({ currentHtml, draftHtml } = computeSplitSidesText(currentText, draftText))
        }
      }

      // --- Unified view chunks ---
      const renderedHtml = isHtml
        ? buildRenderedHtmlDiff(currentEmpty ? '' : currentHtmlText, draftEmpty ? '' : draftHtmlText)
        : ''
      const chunks = isHtml
        ? []
        : computeUnifiedChunks(
            currentEmpty ? '' : this.formatValue(current),
            draftEmpty ? '' : this.formatValue(draft)
          )

      return {
        key,
        label: displayLabel || FIELD_LABELS[labelKey] || this.humanize(labelKey),
        isHtml,
        renderedHtml,
        currentHtml,
        draftHtml,
        chunks
      }
    },

    isEmpty(value) {
      return value === undefined || value === null || value === '' ||
        (Array.isArray(value) && value.length === 0)
    },

    sortedKeys(current = {}, draft = {}) {
      return Array.from(new Set([
        ...Object.keys(current || {}),
        ...Object.keys(draft || {})
      ])).sort((a, b) => this.fieldOrder(a) - this.fieldOrder(b) || a.localeCompare(b))
    },

    fieldOrder(key) {
      const order = [
        'title', 'name', 'auditType', 'category', 'vulnType',
        'description', 'observation', 'poc', 'scope', 'remediation',
        'references', 'cvssv3', 'cvssv4', 'priority', 'remediationComplexity',
        'status', 'retestStatus', 'retestDescription', 'customFields'
      ]
      const index = order.indexOf(key)
      return index === -1 ? order.length : index
    },

    indexDetails(details) {
      if (!Array.isArray(details))
        return {}

      return details.reduce((indexed, detail, index) => {
        const key = detail?.locale || detail?.language || detail?._id || `detail-${index + 1}`
        indexed[key] = detail || {}
        return indexed
      }, {})
    },

    detailLabel(current, draft, fallback) {
      const detail = draft?.locale || current?.locale || draft?.language || current?.language || fallback
      return FIELD_LABELS[detail] || detail
    },

    indexCustomFields(fields) {
      if (!Array.isArray(fields))
        return {}

      return fields.reduce((indexed, field, index) => {
        const key = field?.customField?._id || field?._id || field?.id || field?.label || field?.name || `field-${index + 1}`
        indexed[key] = field
        return indexed
      }, {})
    },

    customFieldLabel(current, draft) {
      const field = draft || current || {}
      return field?.customField?.label || field?.label || field?.name || FIELD_LABELS.customFields
    },

    customFieldValue(field) {
      if (!field)
        return undefined

      if (Object.prototype.hasOwnProperty.call(field, 'text'))
        return field.text
      if (Object.prototype.hasOwnProperty.call(field, 'value'))
        return field.value
      if (Object.prototype.hasOwnProperty.call(field, 'values'))
        return field.values
      if (Object.prototype.hasOwnProperty.call(field, 'checked'))
        return field.checked

      return field
    },

    isLocalizedValueArray(value) {
      return Array.isArray(value) && value.length > 0 && value.every(item =>
        item &&
        typeof item === 'object' &&
        Object.prototype.hasOwnProperty.call(item, 'locale') &&
        Object.prototype.hasOwnProperty.call(item, 'value')
      )
    },

    indexLocalizedValues(values) {
      if (!this.isLocalizedValueArray(values))
        return {}

      return values.reduce((indexed, item) => {
        indexed[item.locale] = item.value
        return indexed
      }, {})
    },

    localeLabel(locale) {
      const language = this.languages.find(item => item.locale === locale)
      return language?.language || locale
    },

    isHtmlField(path) {
      const lastPart = String(path).split('.').pop()
      return HTML_FIELDS.includes(lastPart)
    },

    isHtmlValue(value) {
      return typeof value === 'string' && /^\s*<[a-zA-Z]/.test(value)
    },

    formatValue(value) {
      if (value === undefined || value === null || value === '')
        return 'Not set'
      if (Array.isArray(value))
        return value.length ? value.map(item => this.formatListItem(item)).join('\n') : 'Empty'
      if (typeof value === 'object')
        return this.formatObject(value)
      if (typeof value === 'boolean')
        return value ? 'Yes' : 'No'
      return String(value)
    },

    formatListItem(item) {
      if (item === undefined || item === null || item === '')
        return 'Not set'
      if (typeof item === 'object')
        return this.formatObject(item)
      return String(item)
    },

    formatObject(value) {
      if (!value || typeof value !== 'object')
        return this.formatValue(value)

      if (value.firstname || value.lastname)
        return [value.firstname, value.lastname].filter(Boolean).join(' ')

      const preferredKey = ['title', 'name', 'label', 'username', 'email', 'value', 'text', 'locale', 'language']
        .find(key => value[key] !== undefined && value[key] !== null && value[key] !== '')

      if (preferredKey)
        return this.formatValue(value[preferredKey])

      return JSON.stringify(value, null, 2)
    },

    humanize(value) {
      return String(value || 'Value')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[-_.]/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase())
    }
  }
}
</script>

<style scoped>
.view-toggle {
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  overflow: hidden;
}

.draft-diff {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.draft-section {
  padding-top: 0;
}

.draft-section__title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

/* ---- Unified view ---- */

.diff-block {
  border: 1px solid var(--diff-block-border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
}

.diff-block:last-child {
  margin-bottom: 0;
}

.diff-block__header {
  background: var(--diff-block-header-bg);
  border-bottom: 1px solid var(--diff-block-border);
  padding: 4px 10px;
  color: var(--diff-block-header-color);
  font-size: 12px;
  font-family: inherit;
}

.diff-block__body {
  max-height: 300px;
  overflow: auto;
}

.diff-block__body--html {
  padding: 8px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}

.draft-rendered-diff {
  min-height: 32px;
}

.draft-rendered-diff :deep(.draft-image) {
  margin: 8px 0;
  text-align: center;
}

.draft-rendered-diff :deep(.draft-image img) {
  display: block;
  max-width: 100%;
  margin: 0 auto;
}

.draft-rendered-diff :deep(.draft-image figcaption) {
  margin-top: 4px;
  text-align: center;
  font-style: italic;
}

.draft-rendered-diff :deep(legend) {
  display: block;
  width: 100%;
  text-align: center;
  font-style: italic;
}

.diff-line {
  display: flex;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  min-height: 20px;
}

.diff-line--removed { background: var(--diff-removed-line-bg); }
.diff-line--added   { background: var(--diff-added-line-bg); }
.diff-line--context { background: var(--diff-context-line-bg); }

.diff-line__glyph {
  min-width: 20px;
  padding: 1px 6px;
  text-align: center;
  user-select: none;
  flex-shrink: 0;
  border-right: 1px solid var(--diff-block-border);
  font-weight: bold;
}

.diff-line--removed .diff-line__glyph { color: var(--diff-removed-glyph-color); background: var(--diff-removed-glyph-bg); }
.diff-line--added   .diff-line__glyph { color: var(--diff-added-glyph-color);   background: var(--diff-added-glyph-bg); }
.diff-line--context .diff-line__glyph { color: var(--diff-context-glyph-color); }

.diff-line--removed .diff-line__content :deep(mark.diff-word-rem) {
  background: var(--diff-word-rem-bg);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

.diff-line--added .diff-line__content :deep(mark.diff-word-add) {
  background: var(--diff-word-add-bg);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

.diff-line__content {
  flex: 1;
  padding: 1px 8px;
  overflow-wrap: anywhere;
}

/* ---- Split view ---- */

.draft-field {
  margin-bottom: 14px;
}

.draft-field:last-child {
  margin-bottom: 0;
}

.draft-field__label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.draft-preview {
  min-height: 42px;
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--diff-block-border);
  border-radius: 4px;
  padding: 8px;
  background: var(--diff-context-line-bg);
  word-break: break-word;
}

.draft-preview--html {
  font-size: 13px;
  line-height: 1.5;
}

.draft-preview :deep(.diff-unset) {
  color: var(--diff-unset-color);
  font-style: italic;
}

</style>
