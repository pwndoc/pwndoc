import { describe, expect, it } from 'vitest'
import {
  parseIssueLocation,
  buildIssueRoute,
  issueNavigationType,
  isGeneralInformationLocation
} from '@/services/audit-qa-navigation'

describe('audit-qa-navigation', () => {
  it('parses finding locations with field suffixes', () => {
    expect(parseIssueLocation('finding:SQL Injection/description')).toEqual({
      type: 'finding',
      findingTitle: 'SQL Injection',
      fieldKey: 'description'
    })
  })

  it('builds finding routes and field highlights', () => {
    const parsed = parseIssueLocation('finding:SQL Injection/description')
    const route = buildIssueRoute('audit-1', parsed, {
      findings: [{ _id: 'finding-1', title: 'SQL Injection' }]
    })

    expect(route).toEqual({
      path: '/audits/audit-1/findings/finding-1',
      fieldName: 'descriptionField'
    })
  })

  it('builds section routes from section names', () => {
    const parsed = parseIssueLocation('section:Executive Summary')
    const route = buildIssueRoute('audit-1', parsed, {
      sections: [{ _id: 'section-1', name: 'Executive Summary' }]
    })

    expect(route).toEqual({
      path: '/audits/audit-1/sections/section-1'
    })
  })

  it('classifies navigation targets', () => {
    expect(issueNavigationType('general')).toBe('section')
    expect(issueNavigationType('finding:Test/description')).toBe('field')
  })

  it('groups general information field paths together', () => {
    expect(isGeneralInformationLocation('general')).toBe(true)
    expect(isGeneralInformationLocation('general/Business Impact')).toBe(true)
    expect(isGeneralInformationLocation('field:client')).toBe(true)
    expect(isGeneralInformationLocation('field path: client')).toBe(true)
    expect(isGeneralInformationLocation('field path: finding.references')).toBe(false)
    expect(isGeneralInformationLocation('field:category')).toBe(false)
    expect(isGeneralInformationLocation('section:Executive Summary')).toBe(false)
    expect(parseIssueLocation('field:client')).toEqual({
      type: 'page',
      page: 'general',
      fieldKey: null
    })
  })
})
