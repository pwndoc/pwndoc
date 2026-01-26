// This plugin is based on the awesome work of https://github.com/sereneinserenade/tiptap-languagetool
import { Extension } from '@tiptap/core'
import { debounce } from 'lodash'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

import SpellcheckService from '@/services/spellcheck'

const LanguageToolHelpingWords = {
  LanguageToolTransactionName: 'languageToolTransaction',
  MatchUpdatedTransactionName: 'matchUpdated',
  MatchRangeUpdatedTransactionName: 'matchRangeUpdated',
  LoadingTransactionName: 'languageToolLoading',
}

const updateMatchAndRange = (storage, editorView, m, range) => {
  storage.match = m || undefined
  storage.matchRange = range || undefined

  const tr = editorView.state.tr
  tr.setMeta(LanguageToolHelpingWords.MatchUpdatedTransactionName, true)
  tr.setMeta(LanguageToolHelpingWords.MatchRangeUpdatedTransactionName, true)
  editorView.dispatch(tr)
}

const createMouseEventsListener = (storage, editorView) => (e) => {
  if (!e.target) return

  const matchString = e.target.getAttribute('match')?.trim()
  if (!matchString) return

  const { match: m, from, to } = JSON.parse(matchString)
  updateMatchAndRange(storage, editorView, m, { from, to })
}

const addEventListenersToDecorations = (storage, editorView) => {
  if (!editorView || !editorView.dom) return

  // Query only within this editor's DOM element
  const decorations = editorView.dom.querySelectorAll('span.lt')
  decorations.forEach((el) => {
    // Remove old listeners to avoid duplicates
    if (el._ltMouseHandler) {
      el.removeEventListener('mouseover', el._ltMouseHandler)
      el.removeEventListener('mouseenter', el._ltMouseHandler)
    }
    // Create and store the handler on the element
    el._ltMouseHandler = debounce(createMouseEventsListener(storage, editorView), 50)
    el.addEventListener('mouseover', el._ltMouseHandler)
    el.addEventListener('mouseenter', el._ltMouseHandler)
  })
}

export function changedDescendants(oldNode, curNode, offset, fn) {
  const oldSize = oldNode.childCount
  const curSize = curNode.childCount

  outer: for (let i = 0, j = 0; i < curSize; i++) {
    const child = curNode.child(i)

    for (let scan = j, e = Math.min(oldSize, i + 3); scan < e; scan++) {
      if (oldNode.child(scan) === child) {
        j = scan + 1
        offset += child.nodeSize
        continue outer
      }
    }

    fn(child, offset, curNode)

    if (j < oldSize && oldNode.child(j).sameMarkup(child)) {
      changedDescendants(oldNode.child(j), child, offset + 1, fn)
    } else {
      child.nodesBetween(0, child.content.size, fn, offset + 1)
    }

    offset += child.nodeSize
  }
}

const gimmeDecoration = (from, to, match) =>
  Decoration.inline(from, to, {
    class: `lt lt-${match.rule.issueType}`,
    nodeName: 'span',
    match: JSON.stringify({ match, from, to }),
  })

const moreThan500Words = (s) => s.trim().split(/\s+/).length >= 500

const getMatchAndSetDecorations = async (storage, editorView, doc, text, originalFrom) => {
  const postOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: `text=${encodeURIComponent(text)}&language=auto&enabledOnly=false`,
  }

  const ltRes = await (await fetch(storage.apiUrl, postOptions)).json()

  const decorations = []

  for (const match of ltRes.matches) {
    const docFrom = match.offset + originalFrom
    const docTo = docFrom + match.length

    decorations.push(gimmeDecoration(docFrom, docTo, match))
  }

  const toRemove = storage.decorationSet.find(originalFrom, originalFrom + text.length)
  storage.decorationSet = storage.decorationSet.remove(toRemove)
  storage.decorationSet = storage.decorationSet.add(doc, decorations)

  if (editorView)
    editorView.dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LanguageToolTransactionName, true))

  setTimeout(() => addEventListenersToDecorations(storage, editorView), 100)
}

const createDebouncedGetMatchAndSetDecorations = (storage, editorView) => {
  return debounce((doc, text, originalFrom) => {
    getMatchAndSetDecorations(storage, editorView, doc, text, originalFrom)
  }, 300)
}

const proofreadAndDecorateWholeDoc = async (storage, editorView, doc, nodePos = 0) => {
  let textNodesWithPosition = []

  let index = 0
  doc.descendants((node, pos) => {
    if (!node.isText) {
      index += 1
      return
    }

    let item = textNodesWithPosition[index] || { text: '', from: -1, to: -1 }

    item.text += node.text
    item.from = item.from === -1 ? pos + nodePos : item.from
    item.to = pos + nodePos + item.text.length

    textNodesWithPosition[index] = item
  })

  textNodesWithPosition = textNodesWithPosition.filter(Boolean)

  let finalText = ''
  const chunks = []

  let upperFrom = nodePos
  let newDataSet = true
  let lastPos = 1 + nodePos

  for (const { text, from, to } of textNodesWithPosition) {
    if (!newDataSet) {
      upperFrom = from
      newDataSet = true
    } else {
      const diff = from - lastPos
      if (diff > 0) finalText += ' '.repeat(diff + 1)
    }

    lastPos = to
    finalText += text

    if (moreThan500Words(finalText)) {
      const updatedFrom = chunks.length ? upperFrom : upperFrom + 1
      chunks.push({ from: updatedFrom, text: finalText })
      finalText = ''
      newDataSet = false
    }
  }

  chunks.push({
    from: chunks.length ? upperFrom : 1,
    text: finalText,
  })

  if (editorView)
    editorView.dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LoadingTransactionName, true))

  Promise.all(chunks.map(({ text, from }) => getMatchAndSetDecorations(storage, editorView, doc, text, from))).then(() => {
    if (editorView)
      editorView.dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LoadingTransactionName, false))
  })

  storage.proofReadInitially = true
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
          proofreadAndDecorateWholeDoc(this.storage, this.storage.editorView, tr.doc)
          return true
        },

      ignoreLanguageToolSuggestion:
        () =>
        ({ editor }) => {
          const { from, to } = this.storage.matchRange
          this.storage.decorationSet = this.storage.decorationSet.remove(this.storage.decorationSet.find(from, to))

          const word = editor.state.doc.textBetween(from, to)

          SpellcheckService.addWord(word)

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
    const extensionThis = this

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
            get isLanguageToolActive() {
              return `${extensionThis.storage.active}`
            },
          },

          handlePaste(view) {
            if (view.state.tr.docChanged) {
              if (extensionThis.storage.debouncedProofreadAndDecorate) {
                extensionThis.storage.debouncedProofreadAndDecorate(view.state.tr.doc)
              }
            }

            return false
          },
        },

        state: {
          init: (_, state) => {
            extensionThis.storage.decorationSet = DecorationSet.create(state.doc, [])

            // Defer initial proofread until we have editorView
            return extensionThis.storage.decorationSet
          },

          apply: (tr) => {
            if (!extensionThis.storage.active) return DecorationSet.empty

            const matchUpdated = tr.getMeta(
              LanguageToolHelpingWords.MatchUpdatedTransactionName,
            )
            const matchRangeUpdated = tr.getMeta(
              LanguageToolHelpingWords.MatchRangeUpdatedTransactionName,
            )
            const loading = tr.getMeta(
              LanguageToolHelpingWords.LoadingTransactionName,
            )

            extensionThis.storage.loading = !!loading
            if (matchUpdated) extensionThis.storage.match = extensionThis.storage.match
            if (matchRangeUpdated) extensionThis.storage.matchRange = extensionThis.storage.matchRange

            const ltDecorations = tr.getMeta(
              LanguageToolHelpingWords.LanguageToolTransactionName,
            )
            if (ltDecorations) return extensionThis.storage.decorationSet

            if (tr.docChanged && extensionThis.options.automaticMode) {
              if (!extensionThis.storage.proofReadInitially) {
                if (extensionThis.storage.debouncedProofreadAndDecorate) {
                  extensionThis.storage.debouncedProofreadAndDecorate(tr.doc)
                }
              } else {
                let selectedNode
                const { from, to } = tr.selection

                tr.doc.descendants((node, pos) => {
                  if (!node.isBlock) return false
                  const nodeFrom = pos
                  const nodeTo = pos + node.nodeSize

                  if (nodeFrom <= from && to <= nodeTo)
                    selectedNode = { node, pos }
                })

                if (selectedNode && extensionThis.storage.editorView) {
                  const originalFrom = selectedNode.pos + 1
                  if (originalFrom !== extensionThis.storage.lastOriginalFrom) {
                    getMatchAndSetDecorations(
                      extensionThis.storage,
                      extensionThis.storage.editorView,
                      selectedNode.node,
                      selectedNode.node.textContent,
                      originalFrom
                    )
                  } else if (extensionThis.storage.debouncedGetMatchAndSetDecorations) {
                    extensionThis.storage.debouncedGetMatchAndSetDecorations(
                      selectedNode.node,
                      selectedNode.node.textContent,
                      originalFrom
                    )
                  }
                  extensionThis.storage.lastOriginalFrom = originalFrom
                }
              }
            }

            extensionThis.storage.decorationSet = extensionThis.storage.decorationSet.map(tr.mapping, tr.doc)
            if (extensionThis.storage.editorView) {
              setTimeout(() => addEventListenersToDecorations(extensionThis.storage, extensionThis.storage.editorView), 100)
            }
            return extensionThis.storage.decorationSet
          },
        },

        view: () => ({
          update: (view) => {
            extensionThis.storage.editorView = view

            // Initialize debounced functions now that we have editorView
            if (!extensionThis.storage.debouncedGetMatchAndSetDecorations) {
              extensionThis.storage.debouncedGetMatchAndSetDecorations = createDebouncedGetMatchAndSetDecorations(
                extensionThis.storage,
                view
              )
            }

            if (!extensionThis.storage.debouncedProofreadAndDecorate) {
              extensionThis.storage.debouncedProofreadAndDecorate = debounce((doc, nodePos = 0) => {
                proofreadAndDecorateWholeDoc(extensionThis.storage, view, doc, nodePos)
              }, 500)

              // Trigger initial proofread if automatic mode is enabled
              if (extensionThis.options.automaticMode && !extensionThis.storage.proofReadInitially) {
                proofreadAndDecorateWholeDoc(extensionThis.storage, view, view.state.doc)
              }
            }

            setTimeout(() => addEventListenersToDecorations(extensionThis.storage, view), 100)
          },
        }),
      }),
    ]
  },
})
