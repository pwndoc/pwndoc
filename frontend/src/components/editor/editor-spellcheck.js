// This plugin is based on the awesome work of https://github.com/sereneinserenade/tiptap-languagetool
import { Extension } from '@tiptap/core'
import { debounce } from 'lodash'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Notify } from 'quasar'

import SpellcheckService from '@/services/spellcheck'

const LanguageToolHelpingWords = {
  LanguageToolTransactionName: 'languageToolTransaction',
  MatchUpdatedTransactionName: 'matchUpdated',
  MatchRangeUpdatedTransactionName: 'matchRangeUpdated',
  LoadingTransactionName: 'languageToolLoading',
  WordIgnoredEventName: 'spellcheck-word-ignored',
}

const updateMatchAndRange = (storage, m, range) => {
  storage.match = m || undefined
  storage.matchRange = range || undefined

  const tr = storage.editorView.state.tr
  tr.setMeta(LanguageToolHelpingWords.MatchUpdatedTransactionName, true)
  tr.setMeta(LanguageToolHelpingWords.MatchRangeUpdatedTransactionName, true)
  storage.editorView.dispatch(tr)
}

const createMouseEventsListener = (storage) => (e) => {
  if (!e.target) return

  const matchString = e.target.getAttribute('match')?.trim()
  if (!matchString) return

  const { match: m, from, to } = JSON.parse(matchString)
  updateMatchAndRange(storage, m, { from, to })
}

const addEventListenersToDecorations = (storage) => {
  if (!storage.editorView || !storage.editorView.dom) return

  // Query only within this editor's DOM element
  const decorations = storage.editorView.dom.querySelectorAll('span.lt')
  decorations.forEach((el) => {
    // Remove old listeners to avoid duplicates
    if (el._ltMouseHandler) {
      el.removeEventListener('mouseover', el._ltMouseHandler)
      el.removeEventListener('mouseenter', el._ltMouseHandler)
    }
    // Create and store the handler on the element
    el._ltMouseHandler = debounce(createMouseEventsListener(storage), 50)
    el.addEventListener('mouseover', el._ltMouseHandler)
    el.addEventListener('mouseenter', el._ltMouseHandler)
  })
}

const gimmeDecoration = (from, to, match) =>
  Decoration.inline(from, to, {
    class: `lt lt-${match.rule.issueType}`,
    nodeName: 'span',
    match: JSON.stringify({ match, from, to }),
  })

const moreThan500Words = (s) => s.trim().split(/\s+/).length >= 500

// Convert a string offset (position in concatenated text) to editor document position
const stringOffsetToEditorPos = (stringOffset, offsetMap) => {
  // Find the segment that contains this offset (search from end for efficiency)
  for (let i = offsetMap.length - 1; i >= 0; i--) {
    if (stringOffset >= offsetMap[i].stringPos) {
      return offsetMap[i].editorPos + (stringOffset - offsetMap[i].stringPos)
    }
  }
  // Fallback to first segment
  return offsetMap[0]?.editorPos + stringOffset
}

const fetchMatchesForChunk = async (apiUrl, text) => {
  const postOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: `text=${encodeURIComponent(text)}&language=auto&enabledOnly=false`,
  }

  const ltRes = await (await fetch(apiUrl, postOptions)).json()
  return ltRes.datas?.matches || []
}

const getMatchAndSetDecorations = async (storage, doc, text, originalFrom, offsetMap = null) => {
  const matches = await fetchMatchesForChunk(storage.apiUrl, text)

  // If offsetMap is empty or not provided with no originalFrom, we can't place decorations
  const hasValidOffsetMap = offsetMap && offsetMap.length > 0
  if (!hasValidOffsetMap && originalFrom === null) {
    return
  }

  const decorations = []
  for (const match of matches) {
    let docFrom, docTo
    if (hasValidOffsetMap) {
      // Use offset map to convert string position to editor position
      docFrom = stringOffsetToEditorPos(match.offset, offsetMap)
      docTo = stringOffsetToEditorPos(match.offset + match.length, offsetMap)
    } else {
      // Legacy behavior: simple offset from originalFrom
      docFrom = match.offset + originalFrom
      docTo = docFrom + match.length
    }
    decorations.push(gimmeDecoration(docFrom, docTo, match))
  }

  // Calculate the range to clear decorations from
  const rangeFrom = hasValidOffsetMap ? offsetMap[0].editorPos : originalFrom
  const rangeTo = hasValidOffsetMap ? offsetMap[offsetMap.length - 1].editorPos + offsetMap[offsetMap.length - 1].length : originalFrom + text.length

  const toRemove = storage.decorationSet.find(rangeFrom, rangeTo)
  storage.decorationSet = storage.decorationSet.remove(toRemove)
  storage.decorationSet = storage.decorationSet.add(doc, decorations)

  if (storage.editorView)
    storage.editorView.dispatch(storage.editorView.state.tr.setMeta(LanguageToolHelpingWords.LanguageToolTransactionName, true))

  setTimeout(() => addEventListenersToDecorations(storage), 100)
}

const createDebouncedGetMatchAndSetDecorations = (storage) => {
  return debounce((doc, text, originalFrom) => {
    getMatchAndSetDecorations(storage, doc, text, originalFrom)
  }, 300)
}

const proofreadAndDecorateWholeDoc = async (storage, doc) => {
  if (!doc || !storage.editorView) return

  let textNodesWithPosition = []
  let index = 0

  doc.descendants((node, pos, parent) => {
    if (node.isText && parent?.type.name !== 'codeBlock') {
      if (textNodesWithPosition[index]) {
        const text = textNodesWithPosition[index].text + node.text
        const from = textNodesWithPosition[index].from
        const to = from + text.length
        textNodesWithPosition[index] = { text, from, to }
      } else {
        const text = node.text
        const from = pos
        const to = pos + text.length
        textNodesWithPosition[index] = { text, from, to }
      }
    } else {
      index += 1
    }
  })

  storage.textNodesWithPosition = textNodesWithPosition.filter(Boolean)

  // If no text to check, exit
  if (storage.textNodesWithPosition.length === 0) return

  // Build finalText with single space separators and track offset mapping
  let finalText = ''
  let currentStringPos = 0
  let offsetMap = [] // Maps string positions to editor positions
  const chunksOf500Words = []

  for (const { text, from } of storage.textNodesWithPosition) {
    // Add single space separator between text nodes (except for the first one)
    if (finalText.length > 0) {
      finalText += ' '
      currentStringPos += 1
    }

    // Record the mapping: position in finalText → position in editor
    offsetMap.push({ stringPos: currentStringPos, editorPos: from, length: text.length })

    finalText += text
    currentStringPos += text.length

    if (moreThan500Words(finalText)) {
      chunksOf500Words.push({
        text: finalText,
        offsetMap: offsetMap,
      })
      // Reset for next chunk
      finalText = ''
      currentStringPos = 0
      offsetMap = []
    }
  }

  // Push remaining text as final chunk (only if we have valid offset mappings)
  if (offsetMap.length > 0) {
    chunksOf500Words.push({
      text: finalText,
      offsetMap: offsetMap,
    })
  }

  const requests = chunksOf500Words.map(({ text, offsetMap }) =>
    getMatchAndSetDecorations(storage, doc, text, null, offsetMap)
  )

  storage.editorView.dispatch(storage.editorView.state.tr.setMeta(LanguageToolHelpingWords.LoadingTransactionName, true))

  Promise.all(requests).then(() => {
    if (storage.editorView) storage.editorView.dispatch(storage.editorView.state.tr.setMeta(LanguageToolHelpingWords.LoadingTransactionName, false))
    storage.proofReadInitially = true
  })
}

export const LanguageTool = Extension.create({
  name: 'languagetool',

  addOptions() {
    return {
      language: 'auto',
      apiUrl: '/api/spellcheck',
      automaticMode: true,
    }
  },

  addStorage() {
    return {
      match: undefined,
      loading: false,
      matchRange: { from: -1, to: -1 },
      active: true,
      // Per-instance state
      apiUrl: null,
      editorView: null,
      decorationSet: null,
      proofReadInitially: false,
      lastOriginalFrom: 0,
      debouncedGetMatchAndSetDecorations: null,
      debouncedProofreadAndDecorate: null,
    }
  },

  addCommands() {
    return {
      proofread:
        () =>
        ({ tr }) => {
          proofreadAndDecorateWholeDoc(this.storage, tr.doc)
          return true
        },

      ignoreLanguageToolSuggestion:
        () =>
        ({ editor }) => {
          const { from, to } = this.storage.matchRange
          const word = editor.state.doc.textBetween(from, to)

          SpellcheckService.addWord(word)
            .then(() => {
              // Notify editors to remove decorations for this word
              document.dispatchEvent(new CustomEvent(LanguageToolHelpingWords.WordIgnoredEventName, {
                detail: { word: word.toLowerCase() }
              }))
            })
            .catch((err) => {
              Notify.create({
                message: err.response.data.datas || "Failed to add word to dictionary",
                color: 'negative',
                textColor: 'white',
                position: 'top-right'
              })
            })

          return false
        },

      resetLanguageToolMatch:
        () =>
        ({ editor }) => {
          const { dispatch, state } = editor.view
          const tr = state.tr

          this.storage.match = null
          this.storage.matchRange = null

          dispatch(
            tr
              .setMeta(LanguageToolHelpingWords.MatchRangeUpdatedTransactionName, true)
              .setMeta(LanguageToolHelpingWords.MatchUpdatedTransactionName, true),
          )

          return false
        },

      toggleLanguageTool:
        () =>
        ({ commands }) => {
          this.storage.active = !this.storage.active

          if (this.storage.active) commands.proofread()
          else commands.resetLanguageToolMatch()

          return false
        },

      getLanguageToolState: () => () => this.storage.active,
    }
  },

  addProseMirrorPlugins() {
    // Store apiUrl in storage for access by helper functions
    this.storage.apiUrl = this.options.apiUrl

    return [
      new Plugin({
        key: new PluginKey('languagetoolPlugin'),

        props: {
          decorations(state) {
            return this.getState(state)
          },

          attributes: {
            spellcheck: 'false',
          },

          handlePaste: (view) => {
            console.log('ici', view)
            if (this.storage.debouncedProofreadAndDecorate) {
              this.storage.debouncedProofreadAndDecorate(view.state.tr.doc)
            }

            return false
          },
        },

        state: {
          init: (_, state) => {
            this.storage.decorationSet = DecorationSet.create(state.doc, [])

            // Defer initial proofread until we have editorView
            return this.storage.decorationSet
          },

          apply: (tr, oldEditorState) => {
            if (!this.storage.active) return DecorationSet.empty

            const loading = tr.getMeta(LanguageToolHelpingWords.LoadingTransactionName)
            this.storage.loading = !!loading

            const ltDecorations = tr.getMeta(LanguageToolHelpingWords.LanguageToolTransactionName)
            if (ltDecorations) return this.storage.decorationSet

            if (tr.docChanged && this.options.automaticMode) {
              if (!this.storage.proofReadInitially) {
                if (this.storage.debouncedProofreadAndDecorate) {
                  this.storage.debouncedProofreadAndDecorate(tr.doc)
                }
              } else {
                let selectedNode
                const { from, to } = tr.selection

                tr.doc.descendants((node, pos) => {
                  if (!node.isBlock) return false
                  if (node.type.name === 'codeBlock') return false

                  const nodeFrom = pos
                  const nodeTo = pos + node.nodeSize

                  if (nodeFrom <= from && to <= nodeTo)
                    selectedNode = { node, pos }
                })

                if (selectedNode && this.storage.editorView) {
                  const originalFrom = selectedNode.pos + 1
                  if (originalFrom !== this.storage.lastOriginalFrom) {
                    getMatchAndSetDecorations(
                      this.storage,
                      selectedNode.node,
                      selectedNode.node.textContent,
                      originalFrom
                    )
                  } else if (this.storage.debouncedGetMatchAndSetDecorations) {
                    this.storage.debouncedGetMatchAndSetDecorations(
                      selectedNode.node,
                      selectedNode.node.textContent,
                      originalFrom
                    )
                  }
                  this.storage.lastOriginalFrom = originalFrom
                }
              }
            }

            this.storage.decorationSet = this.storage.decorationSet.map(tr.mapping, tr.doc)
            if (this.storage.editorView) {
              setTimeout(() => addEventListenersToDecorations(this.storage), 100)
            }
            return this.storage.decorationSet
          },
        },

        view: (view) => {
          // Handler for when another editor ignores a word
          const handleWordIgnored = (event) => {
            const ignoredWord = event.detail.word
            const allDecorations = this.storage.decorationSet.find()
            const decorationsToRemove = allDecorations.filter((deco) => {
              const decoText = view.state.doc.textBetween(deco.from, deco.to)
              return decoText.toLowerCase() === ignoredWord
            })

            if (decorationsToRemove.length > 0) {
              this.storage.decorationSet = this.storage.decorationSet.remove(decorationsToRemove)
              view.dispatch(view.state.tr.setMeta(LanguageToolHelpingWords.LanguageToolTransactionName, true))
            }
          }

          document.addEventListener(LanguageToolHelpingWords.WordIgnoredEventName, handleWordIgnored)

          // Initialize debounced functions now that we have editorView
          if (!this.storage.debouncedGetMatchAndSetDecorations) {
            this.storage.debouncedGetMatchAndSetDecorations = createDebouncedGetMatchAndSetDecorations(
              this.storage
            )
          }

          if (!this.storage.debouncedProofreadAndDecorate) {
            this.storage.debouncedProofreadAndDecorate = debounce((doc) => {
              proofreadAndDecorateWholeDoc(this.storage, doc)
            }, 500)

            // Trigger initial proofread if automatic mode is enabled
            if (this.options.automaticMode && !this.storage.proofReadInitially) {
              proofreadAndDecorateWholeDoc(this.storage, view.state.doc)
            }
          }

          setTimeout(() => addEventListenersToDecorations(this.storage), 100)

          return {
            update: (view) => {
              this.storage.editorView = view
            },
            destroy: () => {
              document.removeEventListener(LanguageToolHelpingWords.WordIgnoredEventName, handleWordIgnored)
            },
          }
        },
      }),
    ]
  },
})
