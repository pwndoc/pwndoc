import { describe, it, expect } from 'vitest'
import { createTestWrapper } from '../../test-utils'
import DraftDiff from '@/components/draft-diff.vue'

function createWrapper(props) {
  return createTestWrapper(DraftDiff, {
    props,
    messages: {
      'en-US': {
        draftRecovery: {
          currentVersion: 'Current version',
          draftVersion: 'Your draft',
          noDifferences: 'No differences found',
          unifiedView: 'Unified',
          splitView: 'Split'
        }
      }
    }
  })
}

function fieldLabels(wrapper) {
  // unified view uses .diff-block__header
  return wrapper.findAll('.diff-block__header').map(el =>
    el.text().replace(/^@@\s*/, '').replace(/\s*@@$/, '').trim()
  )
}

describe('DraftDiff', () => {
  it('shows only changed top-level fields in unified view', () => {
    const wrapper = createWrapper({
      current: {
        title: 'Server title',
        description: '<p>Same description</p>',
        observation: '<p>Server observation</p>',
        references: ['https://example.test']
      },
      draft: {
        title: 'Draft title',
        description: '<p>Same description</p>',
        observation: '<p>Draft observation</p>',
        references: ['https://example.test']
      }
    })

    const labels = fieldLabels(wrapper)

    expect(labels).toEqual(['Title', 'Observation'])
    expect(wrapper.text()).toContain('Server title')
    expect(wrapper.text()).toContain('Draft title')
    expect(wrapper.text()).not.toContain('Description')
    expect(wrapper.text()).not.toContain('References')
  })

  it('groups vulnerability detail changes by locale instead of array paths', () => {
    const wrapper = createWrapper({
      current: {
        details: [
          {
            locale: 'en',
            title: 'Server title',
            observation: '<p>Same observation</p>',
            references: ['https://example.test']
          }
        ]
      },
      draft: {
        details: [
          {
            locale: 'en',
            title: 'Draft title',
            observation: '<p>Same observation</p>',
            references: ['https://example.test']
          }
        ]
      }
    })

    expect(wrapper.vm.diffSections).toEqual([
      expect.objectContaining({
        key: 'details-en',
        label: 'Details (en)'
      })
    ])
    expect(fieldLabels(wrapper)).toEqual(['Title'])
    expect(wrapper.text()).not.toContain('details.0')
    expect(wrapper.text()).not.toContain('Observation')
    expect(wrapper.text()).not.toContain('References')
  })

  it('shows custom field changes by label', () => {
    const wrapper = createWrapper({
      current: {
        customFields: [
          {
            customField: { _id: 'field1', label: 'Impact' },
            text: 'Low'
          }
        ]
      },
      draft: {
        customFields: [
          {
            customField: { _id: 'field1', label: 'Impact' },
            text: 'High'
          }
        ]
      }
    })

    expect(fieldLabels(wrapper)).toEqual(['Impact'])
    expect(wrapper.text()).toContain('Low')
    expect(wrapper.text()).toContain('High')
  })

  it('shows localized custom field changes as separate language blocks', () => {
    const wrapper = createWrapper({
      current: {
        customFields: [
          {
            _id: 'field1',
            label: 'Impact',
            text: [
              { locale: 'en-US', value: '<p>Low</p>' },
              { locale: 'fr-FR', value: '<p>Faible</p>' }
            ]
          }
        ]
      },
      draft: {
        customFields: [
          {
            _id: 'field1',
            label: 'Impact',
            text: [
              { locale: 'en-US', value: '<p>High</p>' },
              { locale: 'fr-FR', value: '<p>Eleve</p>' }
            ]
          }
        ]
      },
      languages: [
        { locale: 'en-US', language: 'English' },
        { locale: 'fr-FR', language: 'French' }
      ]
    })

    expect(fieldLabels(wrapper)).toEqual(['Impact (English)', 'Impact (French)'])
    expect(wrapper.text()).toContain('Low')
    expect(wrapper.text()).toContain('High')
    expect(wrapper.text()).toContain('Faible')
    expect(wrapper.text()).toContain('Eleve')
  })

  it('omits unchanged localized custom field values', () => {
    const wrapper = createWrapper({
      current: {
        customFields: [
          {
            _id: 'field1',
            label: 'Impact',
            text: [
              { locale: 'en-US', value: '<p>Low</p>' },
              { locale: 'fr-FR', value: '<p>Faible</p>' }
            ]
          }
        ]
      },
      draft: {
        customFields: [
          {
            _id: 'field1',
            label: 'Impact',
            text: [
              { locale: 'en-US', value: '<p>High</p>' },
              { locale: 'fr-FR', value: '<p>Faible</p>' }
            ]
          }
        ]
      },
      languages: [
        { locale: 'en-US', language: 'English' },
        { locale: 'fr-FR', language: 'French' }
      ]
    })

    expect(fieldLabels(wrapper)).toEqual(['Impact (English)'])
    expect(wrapper.text()).not.toContain('Impact (French)')
  })

  it('shows added localized custom field values under their locale label', () => {
    const wrapper = createWrapper({
      current: {
        customFields: [
          {
            _id: 'field1',
            label: 'Impact',
            text: [
              { locale: 'en-US', value: '<p>Low</p>' }
            ]
          }
        ]
      },
      draft: {
        customFields: [
          {
            _id: 'field1',
            label: 'Impact',
            text: [
              { locale: 'en-US', value: '<p>Low</p>' },
              { locale: 'fr-FR', value: '<p>Eleve</p>' }
            ]
          }
        ]
      },
      languages: [
        { locale: 'en-US', language: 'English' },
        { locale: 'fr-FR', language: 'French' }
      ]
    })

    expect(fieldLabels(wrapper)).toEqual(['Impact (French)'])
    expect(wrapper.text()).toContain('Eleve')
  })

  it('falls back to locale when a localized custom field language is unknown', () => {
    const wrapper = createWrapper({
      current: {
        customFields: [
          {
            _id: 'field1',
            label: 'Impact',
            text: [{ locale: 'de-DE', value: '<p>Niedrig</p>' }]
          }
        ]
      },
      draft: {
        customFields: [
          {
            _id: 'field1',
            label: 'Impact',
            text: [{ locale: 'de-DE', value: '<p>Hoch</p>' }]
          }
        ]
      },
      languages: []
    })

    expect(fieldLabels(wrapper)).toEqual(['Impact (de-DE)'])
  })

  it('shows split view when toggled', async () => {
    const wrapper = createWrapper({
      current: { title: 'Old title' },
      draft: { title: 'New title' }
    })

    // default is unified
    expect(wrapper.find('.diff-block').exists()).toBe(true)
    expect(wrapper.find('.draft-field__label').exists()).toBe(false)

    // q-btn-toggle is stubbed in unit tests, so set the bound model directly.
    wrapper.vm.splitView = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.draft-field__label').exists()).toBe(true)
    expect(wrapper.find('.diff-block').exists()).toBe(false)
  })
})
