const FIELD_KEYS = [
  'description',
  'observation',
  'remediation',
  'references',
  'poc',
  'affected',
  'cvssv3',
  'cvssv4',
  'retestDescription'
]

export const QA_FIELD_HIGHLIGHT_MAP = {
  description: 'descriptionField',
  observation: 'observationField',
  remediation: 'remediationField',
  references: 'referencesField',
  poc: 'pocField',
  affected: 'affectedField',
  cvssv3: 'cvss3Field',
  cvssv4: 'cvss4Field',
  retestDescription: 'retestDescriptionField'
}

const FINDING_FIELD_KEYS = new Set([
  'description',
  'observation',
  'remediation',
  'references',
  'poc',
  'affected',
  'cvssv3',
  'cvssv4',
  'retestDescription',
  'category',
  'vulnType',
  'title'
])

export const isGeneralInformationLocation = (location = '') => {
  const value = String(location || '').trim().toLowerCase()
  if (value === 'general')
    return true
  if (value.startsWith('general/'))
    return true

  if (value.startsWith('field:')) {
    const field = value.slice('field:'.length)
    return !FINDING_FIELD_KEYS.has(field)
  }

  const fieldPathMatch = value.match(/^field path:\s*(.+)$/)
  if (!fieldPathMatch)
    return false

  return !/^finding\./.test(fieldPathMatch[1].trim())
}

export const parseIssueLocation = (location = '') => {
  const value = String(location || '').trim() || 'report'

  if (value === 'general' || value === 'network' || value === 'report')
    return { type: 'page', page: value, fieldKey: null }

  if (isGeneralInformationLocation(value))
    return { type: 'page', page: 'general', fieldKey: null }

  const sectionMatch = value.match(/^section:(.+)$/)
  if (sectionMatch)
    return { type: 'section', sectionName: sectionMatch[1], fieldKey: null }

  if (value.startsWith('finding:')) {
    let rest = value.slice('finding:'.length)
    let fieldKey = null

    FIELD_KEYS.forEach((key) => {
      const suffix = `/${key}`
      if (rest.endsWith(suffix)) {
        fieldKey = key
        rest = rest.slice(0, -suffix.length)
      }
    })

    return { type: 'finding', findingTitle: rest, fieldKey }
  }

  return { type: 'unknown', raw: value }
}

export const buildIssueRoute = (auditId, parsed, { findings = [], sections = [] } = {}) => {
  if (!auditId)
    return null

  if (parsed.type === 'page') {
    if (parsed.page === 'network')
      return { path: `/audits/${auditId}/network` }
    return { path: `/audits/${auditId}/general` }
  }

  if (parsed.type === 'section') {
    const section = sections.find((entry) => {
      const name = String(entry?.name || '').trim()
      const field = String(entry?.field || '').trim()
      return name === parsed.sectionName || field === parsed.sectionName
    })

    if (section?._id)
      return { path: `/audits/${auditId}/sections/${section._id}` }

    return { path: `/audits/${auditId}/general` }
  }

  if (parsed.type === 'finding') {
    const title = String(parsed.findingTitle || '').trim()
    const finding = findings.find((entry) => String(entry?.title || '').trim() === title)

    if (finding?._id) {
      return {
        path: `/audits/${auditId}/findings/${finding._id}`,
        fieldName: parsed.fieldKey ? QA_FIELD_HIGHLIGHT_MAP[parsed.fieldKey] : null
      }
    }
  }

  return { path: `/audits/${auditId}/general` }
}

export const issueNavigationType = (location = '') => {
  const parsed = parseIssueLocation(location)

  if (parsed.type === 'finding')
    return 'field'

  if (parsed.type === 'section' || parsed.type === 'page')
    return 'section'

  return 'section'
}
