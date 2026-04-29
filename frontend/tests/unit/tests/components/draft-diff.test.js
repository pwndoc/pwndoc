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

    expect(wrapper.text()).toContain('Details (en)')
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

  it('shows split view when toggled', async () => {
    const wrapper = createWrapper({
      current: { title: 'Old title' },
      draft: { title: 'New title' }
    })

    // default is unified
    expect(wrapper.find('.diff-block').exists()).toBe(true)
    expect(wrapper.find('.draft-field__label').exists()).toBe(false)

    // toggle to split
    await wrapper.find('button').trigger('click')

    expect(wrapper.find('.draft-field__label').exists()).toBe(true)
    expect(wrapper.find('.diff-block').exists()).toBe(false)
  })
})
