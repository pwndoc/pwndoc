// This plugin is based on the awesome work of https://github.com/sereneinserenade/tiptap-languagetool
import { Extension } from '@tiptap/core'
import { debounce } from 'lodash'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

import SpellcheckService from '@/services/spellcheck'

let editorView
let decorationSet

let apiUrl = ''
let textNodesWithPosition = []
let match = undefined
let matchRange
let proofReadInitially = false
let isLanguageToolActive = true

const LanguageToolHelpingWords = {
  LanguageToolTransactionName: 'languageToolTransaction',
  MatchUpdatedTransactionName: 'matchUpdated',
  MatchRangeUpdatedTransactionName: 'matchRangeUpdated',
  LoadingTransactionName: 'languageToolLoading',
}

const dispatch = (tr) => editorView.dispatch(tr)

const updateMatchAndRange = (m, range) => {
  match = m || undefined
  matchRange = range || undefined

  const tr = editorView.state.tr
  tr.setMeta(LanguageToolHelpingWords.MatchUpdatedTransactionName, true)
  tr.setMeta(LanguageToolHelpingWords.MatchRangeUpdatedTransactionName, true)
  editorView.dispatch(tr)
}

const mouseEventsListener = (e) => {
  if (!e.target) return

  const matchString = e.target.getAttribute('match')?.trim()
  if (!matchString) return

  const { match: m, from, to } = JSON.parse(matchString)
  updateMatchAndRange(m, { from, to })
}

const debouncedMouseEventsListener = debounce(mouseEventsListener, 50)

const addEventListenersToDecorations = () => {
  const decorations = document.querySelectorAll('span.lt')
  decorations.forEach((el) => {
    el.addEventListener('mouseover', debouncedMouseEventsListener)
    el.addEventListener('mouseenter', debouncedMouseEventsListener)
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

const getMatchAndSetDecorations = async (doc, text, originalFrom) => {
  const postOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: `text=${encodeURIComponent(text)}&language=en-US&enabledOnly=false`,
  }

  const ltRes = await (await fetch(apiUrl, postOptions)).json()

  const decorations = []

  for (const match of ltRes.matches) {
    const docFrom = match.offset + originalFrom
    const docTo = docFrom + match.length

    decorations.push(gimmeDecoration(docFrom, docTo, match))
  }

  const toRemove = decorationSet.find(originalFrom, originalFrom + text.length)
  decorationSet = decorationSet.remove(toRemove)
  decorationSet = decorationSet.add(doc, decorations)

  if (editorView)
    dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LanguageToolTransactionName, true))

  setTimeout(addEventListenersToDecorations, 100)
}

const debouncedGetMatchAndSetDecorations = debounce(getMatchAndSetDecorations, 300)

let lastOriginalFrom = 0

const onNodeChanged = (doc, text, originalFrom) => {
  if (originalFrom !== lastOriginalFrom)
    getMatchAndSetDecorations(doc, text, originalFrom)
  else
    debouncedGetMatchAndSetDecorations(doc, text, originalFrom)

  lastOriginalFrom = originalFrom
}

const proofreadAndDecorateWholeDoc = async (doc, nodePos = 0) => {
  textNodesWithPosition = []

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
    dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LoadingTransactionName, true))

  Promise.all(chunks.map(({ text, from }) => getMatchAndSetDecorations(doc, text, from))).then(() => {
    if (editorView)
      dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LoadingTransactionName, false))
  })

  proofReadInitially = true
}

const debouncedProofreadAndDecorate = debounce(proofreadAndDecorateWholeDoc, 500)

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
      match,
      loading: false,
      matchRange: { from: -1, to: -1 },
      active: isLanguageToolActive,
    }
  },

  addCommands() {
    return {
      proofread:
        () =>
        ({ tr }) => {
          apiUrl = this.options.apiUrl
          proofreadAndDecorateWholeDoc(tr.doc)
          return true
        },

      ignoreLanguageToolSuggestion:
        () =>
        ({ editor }) => {
          const { from, to } = matchRange
          decorationSet = decorationSet.remove(decorationSet.find(from, to))

          const word = editor.state.doc.textBetween(from, to)

          SpellcheckService.addWord(word)

          return false
        },

      resetLanguageToolMatch:
        () =>
        ({ editor }) => {
          const { dispatch, state } = editor.view
          const tr = state.tr

          match = null
          matchRange = null

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
          isLanguageToolActive = !isLanguageToolActive

          if (isLanguageToolActive) commands.proofread()
          else commands.resetLanguageToolMatch()

          this.storage.active = isLanguageToolActive

          return false
        },

      getLanguageToolState: () => () => isLanguageToolActive,
    }
  },

  addProseMirrorPlugins() {
    const { apiUrl: optionsApiUrl } = this.options
    apiUrl = optionsApiUrl

    return [
      new Plugin({
        key: new PluginKey('languagetoolPlugin'),

        props: {
          decorations(state) {
            return this.getState(state)
          },

          attributes: {
            spellcheck: 'false',
            isLanguageToolActive: `${isLanguageToolActive}`,
          },

          handlePaste(view) {
            if (view.state.tr.docChanged)
              debouncedProofreadAndDecorate(view.state.tr.doc)

            return false
          },
        },

        state: {
          init: (_, state) => {
            decorationSet = DecorationSet.create(state.doc, [])

            if (this.options.automaticMode)
              proofreadAndDecorateWholeDoc(state.doc)

            return decorationSet
          },

          apply: (tr) => {
            if (!isLanguageToolActive) return DecorationSet.empty

            const matchUpdated = tr.getMeta(
              LanguageToolHelpingWords.MatchUpdatedTransactionName,
            )
            const matchRangeUpdated = tr.getMeta(
              LanguageToolHelpingWords.MatchRangeUpdatedTransactionName,
            )
            const loading = tr.getMeta(
              LanguageToolHelpingWords.LoadingTransactionName,
            )

            this.storage.loading = !!loading
            if (matchUpdated) this.storage.match = match
            if (matchRangeUpdated) this.storage.matchRange = matchRange

            const ltDecorations = tr.getMeta(
              LanguageToolHelpingWords.LanguageToolTransactionName,
            )
            if (ltDecorations) return decorationSet

            if (tr.docChanged && this.options.automaticMode) {
              if (!proofReadInitially) {
                debouncedProofreadAndDecorate(tr.doc)
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

                if (selectedNode) {
                  onNodeChanged(
                    selectedNode.node,
                    selectedNode.node.textContent,
                    selectedNode.pos + 1,
                  )
                }
              }
            }

            decorationSet = decorationSet.map(tr.mapping, tr.doc)
            setTimeout(addEventListenersToDecorations, 100)
            return decorationSet
          },
        },

        view: () => ({
          update: (view) => {
            editorView = view
            setTimeout(addEventListenersToDecorations, 100)
          },
        }),
      }),
    ]
  },
})
