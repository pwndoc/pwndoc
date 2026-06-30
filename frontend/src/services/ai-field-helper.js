import Utils from '@/services/utils'
import { useAiGenerationStore } from '@/stores/ai-generation'
import { $t } from '@/boot/i18n'

const FINDING_FIELD_OUTPUT_TYPES = {
  description: 'html',
  observation: 'html',
  remediation: 'html',
  poc: 'html',
  references: 'array'
}

const CUSTOM_FIELD_OUTPUT_TYPES = {
  text: 'html',
  input: 'text',
  date: 'text',
  select: 'text',
  radio: 'text',
  'select-multiple': 'array',
  checkbox: 'array'
}

const getFieldLabel = (field, customField, fieldKey) => {
  if (customField?.customField?.label)
    return customField.customField.label

  return {
    description: 'Description',
    observation: 'Observation',
    remediation: 'Remediation',
    references: 'References',
    poc: 'Proofs'
  }[field] || fieldKey
}

const getOutputType = (field, customField) => {
  if (customField)
    return CUSTOM_FIELD_OUTPUT_TYPES[customField?.customField?.fieldType] || 'text'

  return FINDING_FIELD_OUTPUT_TYPES[field] || 'html'
}

const normalizeContextValue = (value) => {
  if (value === null || value === undefined)
    return ''
  if (Array.isArray(value))
    return value.join(', ')
  if (typeof value === 'object')
    return JSON.stringify(value)
  return String(value)
}

const renderPromptTemplate = (template = '', context = {}) => {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return normalizeContextValue(context[key])
  }).trim()
}

const getDefaultPrompt = (fieldPrompts = [], fieldKey, context = {}) => {
  const mapping = (fieldPrompts || []).find((entry) => {
    return String(entry.fieldKey || '') === String(fieldKey)
  })
  return renderPromptTemplate(mapping?.prompt || '', context)
}

const normalizeDraftForApply = (draft, outputType) => {
  if (outputType === 'array') {
    const entries = Array.isArray(draft) ?
      draft :
      String(draft || '').split('\n')

    return entries
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  }

  const text = String(draft || '').trim()
  if (outputType === 'html')
    return Utils.htmlEncode(text)

  return text
}

const getInputSelection = (inputRef) => {
  const el = inputRef?.$el?.querySelector('textarea, input')
  if (!el)
    return null

  const start = el.selectionStart
  const end = el.selectionEnd
  if (start === end)
    return null

  const text = el.value.substring(start, end)
  return {
    start,
    end,
    text,
    html: text
  }
}

const replaceInputSelection = (inputRef, selection, content) => {
  const el = inputRef?.$el?.querySelector('textarea, input')
  if (!el || !selection)
    return

  const replacement = Array.isArray(content) ?
    content.join('\n') :
    String(content || '')
  const value = el.value
  const nextValue = value.substring(0, selection.start) + replacement + value.substring(selection.end)

  const inputComponent = inputRef
  if (inputComponent)
    inputComponent.$emit('update:modelValue', nextValue)
}

export default {
  getOutputType,
  getFieldLabel,
  getDefaultPrompt,
  getInputSelection,
  replaceInputSelection,

  validateDraft(draft, outputType) {
    if (outputType === 'array') {
      const entries = Array.isArray(draft) ?
        draft :
        String(draft || '').split('\n')

      const normalized = entries
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)

      if (normalized.length === 0)
        throw new Error($t('aiChat.emptyDraft'))

      return normalized
    }

    const text = String(draft || '').trim()
    if (!text)
      throw new Error($t('aiChat.emptyDraft'))

    return text
  },

  async runFieldAiChat({
    title,
    defaultPrompt,
    outputType,
    requestParams,
    lockKey = null,
    onCancel
  }) {
    try {
      return await useAiGenerationStore().openSession({
        title,
        defaultPrompt,
        outputType,
        requestParams,
        lockKey
      })
    } catch (err) {
      if (err?.message === 'cancelled') {
        if (typeof onCancel === 'function')
          onCancel()
        return null
      }
      throw err
    }
  },

  applyFieldDraft({
    draft,
    outputType,
    setValue
  }) {
    setValue(normalizeDraftForApply(draft, outputType))
  },

  async runSelectionAiChat({
    title,
    selectedText,
    outputType,
    requestParams,
    lockKey = null,
    onCancel
  }) {
    try {
      return await useAiGenerationStore().openSession({
        title,
        selectedText,
        outputType,
        requestParams,
        lockKey
      })
    } catch (err) {
      if (err?.message === 'cancelled') {
        if (typeof onCancel === 'function')
          onCancel()
        return null
      }
      throw err
    }
  },

  applySelectionDraft({
    selectionTarget,
    selection,
    draft,
    outputType
  }) {
    const normalizedDraft = normalizeDraftForApply(draft, outputType)

    if (selectionTarget?.applyReplacement) {
      selectionTarget.applyReplacement(selection, normalizedDraft, outputType)
      return
    }

    if (selectionTarget?.replaceTextSelection) {
      selectionTarget.replaceTextSelection(normalizedDraft, selection)
      return
    }

    if (selectionTarget?.editor?.replaceTextSelection) {
      selectionTarget.editor.replaceTextSelection(normalizedDraft, selection)
    }
  },

  buildFindingAiContext(finding, customField) {
    const customFieldContext = {}
    if (finding.customFields && finding.customFields.length > 0) {
      finding.customFields.forEach((entry) => {
        if (entry?.customField?.label)
          customFieldContext[entry.customField.label] = entry.text
      })
    }

    return {
      title: finding.title || '',
      vulnType: finding.vulnType || '',
      observation: finding.observation || '',
      description: finding.description || '',
      remediation: finding.remediation || '',
      references: finding.references || [],
      poc: finding.poc || '',
      scope: finding.scope || '',
      customFieldLabel: customField?.customField?.label || '',
      customFieldValue: customField?.text || '',
      customFields: customFieldContext
    }
  },

  buildSectionAiContext(section, customField) {
    const customFieldContext = {}
    if (section.customFields && section.customFields.length > 0) {
      section.customFields.forEach((entry) => {
        if (entry?.customField?.label)
          customFieldContext[entry.customField.label] = entry.text
      })
    }

    return {
      sectionField: section.field || '',
      sectionName: section.name || '',
      sectionText: section.text || '',
      customFieldLabel: customField?.customField?.label || '',
      customFieldValue: customField?.text || '',
      customFields: customFieldContext
    }
  },

  buildVulnerabilityAiContext(vulnerability, detail, customField) {
    const customFieldContext = {}
    if (detail?.customFields && detail.customFields.length > 0) {
      detail.customFields.forEach((entry) => {
        if (entry?.customField?.label)
          customFieldContext[entry.customField.label] = entry.text
      })
    }

    return {
      title: detail?.title || '',
      vulnType: detail?.vulnType || '',
      category: vulnerability?.category || '',
      observation: detail?.observation || '',
      description: detail?.description || '',
      remediation: detail?.remediation || '',
      references: detail?.references || [],
      customFieldLabel: customField?.customField?.label || '',
      customFieldValue: customField?.text || '',
      customFields: customFieldContext
    }
  },

  appliedMessage() {
    return $t('aiChat.applied')
  },

  appliedFieldMessage() {
    return $t('aiChat.appliedField')
  }
}
