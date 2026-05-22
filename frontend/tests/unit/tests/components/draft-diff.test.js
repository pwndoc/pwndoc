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

  it('renders HTML code block diffs without stripping editor structure', () => {
    const wrapper = createWrapper({
      current: {
        description: '<p>Intro</p><pre><code class="language-js">const value = 1</code></pre>'
      },
      draft: {
        description: '<p>Intro</p><pre><code class="language-js">const value = 2</code></pre>'
      }
    })

    const rendered = wrapper.find('.draft-rendered-diff')

    expect(rendered.find('pre').exists()).toBe(true)
    expect(rendered.find('code').exists()).toBe(true)
    expect(rendered.html()).toContain('language-js')
    expect(rendered.find('.diffrem').text()).toContain('1')
    expect(rendered.find('.diffadd').text()).toContain('2')
  })

  it('keeps inline code as a code element when diffing changed code text', () => {
    const wrapper = createWrapper({
      current: {
        description: '<p>If unsupported, return <code>unsigned answer</code>.</p>'
      },
      draft: {
        description: '<p>If unsupported, return <code>unsigned answeer</code>.</p>'
      }
    })

    const code = wrapper.find('.draft-rendered-diff code')

    expect(code.exists()).toBe(true)
    expect(code.text()).toContain('unsigned')
    expect(code.find('.diffrem').text()).toContain('answer')
    expect(code.find('.diffadd').text()).toContain('answeer')
  })

  it('shows inline formatting-only changes as visible diffs', () => {
    const wrapper = createWrapper({
      current: {
        description: '<p>Format this word</p>'
      },
      draft: {
        description: '<p>Format this <strong>word</strong></p>'
      }
    })

    const rendered = wrapper.find('.draft-rendered-diff')

    expect(rendered.find('.diffrem').text()).toContain('word')
    expect(rendered.find('strong .diffadd').text()).toContain('word')
  })

  it('keeps changed images in rendered HTML diffs', () => {
    const oldImage = '0123456789abcdef01234567'
    const newImage = 'abcdef0123456789abcdef01'
    const wrapper = createWrapper({
      current: {
        description: `<p>Before</p><img src="${oldImage}" alt="old image">`
      },
      draft: {
        description: `<p>Before</p><img src="${newImage}" alt="new image">`
      }
    })

    const rendered = wrapper.find('.draft-rendered-diff')
    const images = rendered.findAll('img')

    expect(images).toHaveLength(2)
    expect(rendered.html()).toContain(`src="/api/images/download/${oldImage}"`)
    expect(rendered.html()).toContain(`src="/api/images/download/${newImage}"`)
    expect(rendered.find('del.diffrem img').exists()).toBe(true)
    expect(rendered.find('ins.diffadd img').exists()).toBe(true)
  })

  it('renders image alt text as a visible caption without swallowing following content', () => {
    const image = '0123456789abcdef01234567'
    const wrapper = createWrapper({
      current: {
        description: `<p>Before</p><img src="${image}" alt="Old image caption"><p>After image</p>`
      },
      draft: {
        description: `<p>Before</p><img src="${image}" alt="New image caption"><p>After image</p>`
      }
    })

    const rendered = wrapper.find('.draft-rendered-diff')
    const figure = rendered.find('figure.draft-image')

    expect(figure.exists()).toBe(true)
    expect(figure.find('img').attributes('src')).toBe(`/api/images/download/${image}`)
    expect(figure.find('figcaption').exists()).toBe(true)
    expect(figure.find('figcaption').text()).toContain('image caption')
    expect(figure.find('figcaption').text()).not.toContain('After image')
    expect(rendered.findAll('p').at(1).text()).toBe('After image')
    expect(rendered.find('.diffrem').text()).toContain('Old')
    expect(rendered.find('.diffadd').text()).toContain('New')
  })

  it('shows caption changes from legend attributes in rendered HTML diffs', () => {
    const wrapper = createWrapper({
      current: {
        description: '<legend label="Figure" alt="Old caption"></legend>'
      },
      draft: {
        description: '<legend label="Figure" alt="New caption"></legend>'
      }
    })

    const rendered = wrapper.find('.draft-rendered-diff')

    expect(rendered.find('legend').exists()).toBe(true)
    expect(rendered.text()).toContain('Figure - ')
    expect(rendered.text()).toContain('caption')
    expect(rendered.find('.diffrem').text()).toContain('Old')
    expect(rendered.find('.diffadd').text()).toContain('New')
  })

  it('does not render content after a changed caption inside the legend', () => {
    const wrapper = createWrapper({
      current: {
        description: '<legend label="Figure" alt="Old caption"></legend><p>Paragraph after caption</p><ul><li>List after caption</li></ul>'
      },
      draft: {
        description: '<legend label="Figure" alt="New caption"></legend><p>Paragraph after caption</p><ul><li>List after caption</li></ul>'
      }
    })

    const rendered = wrapper.find('.draft-rendered-diff')
    const legend = rendered.find('legend')

    expect(legend.exists()).toBe(true)
    expect(legend.text()).toContain('caption')
    expect(legend.text()).not.toContain('Paragraph after caption')
    expect(legend.text()).not.toContain('List after caption')
    expect(rendered.find('p').text()).toBe('Paragraph after caption')
    expect(rendered.find('li').text()).toBe('List after caption')
  })

  it('sanitizes HTML before rendering draft diffs', () => {
    const wrapper = createWrapper({
      current: {
        description: '<p>Safe</p>'
      },
      draft: {
        description: '<p onclick="alert(1)">Safe</p><script>alert(1)</script><img src="javascript:alert(1)" alt="bad">'
      }
    })

    const html = wrapper.find('.draft-rendered-diff').html()

    expect(html).toContain('<p>Safe</p>')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('javascript:alert')
  })

  it('uses the rendered editor-style HTML wrapper in split view', async () => {
    const image = '0123456789abcdef01234567'
    const wrapper = createWrapper({
      current: {
        description: `<pre><code class="language-js">const value = 1</code></pre><img src="${image}" alt="Old image caption">`
      },
      draft: {
        description: `<pre><code class="language-js">const value = 2</code></pre><img src="${image}" alt="New image caption">`
      }
    })

    wrapper.vm.splitView = true
    await wrapper.vm.$nextTick()

    const previews = wrapper.findAll('.draft-preview--html .draft-rendered-diff')

    expect(previews).toHaveLength(2)
    expect(previews[0].find('pre code.language-js').exists()).toBe(true)
    expect(previews[1].find('pre code.language-js').exists()).toBe(true)
    expect(previews[0].find('figure.draft-image figcaption').text()).toContain('Old')
    expect(previews[1].find('figure.draft-image figcaption').text()).toContain('New')
    expect(previews[0].find('img').attributes('src')).toBe(`/api/images/download/${image}`)
    expect(previews[1].find('img').attributes('src')).toBe(`/api/images/download/${image}`)
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
