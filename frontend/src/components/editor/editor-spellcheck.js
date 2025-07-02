// Base code from: https://github.com/sereneinserenade/tiptap-languagetool

import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'
import { debounce } from 'lodash'
import { v4 as uuidv4 } from 'uuid'

// *************** OVER: TYPES *****************
let editorView
let decorationSet
let extensionDocId
let apiUrl = ''
let textNodesWithPosition = []
let match = undefined
let proofReadInitially = false
export var LanguageToolHelpingWords
;(function (LanguageToolHelpingWords) {
  LanguageToolHelpingWords['LanguageToolTransactionName'] = 'languageToolTransaction'
  LanguageToolHelpingWords['MatchUpdatedTransactionName'] = 'matchUpdated'
  LanguageToolHelpingWords['LoadingTransactionName'] = 'languageToolLoading'
})(LanguageToolHelpingWords || (LanguageToolHelpingWords = {}))
const dispatch = (tr) => editorView.dispatch(tr)
const updateMatch = (m) => {
  if (m) match = m
  else match = undefined
  editorView.dispatch(editorView.state.tr.setMeta('matchUpdated', true))
}
const selectElementText = (el) => {
  const range = document.createRange()
  range.selectNode(el)
  const sel = window.getSelection()
  sel === null || sel === void 0 ? void 0 : sel.removeAllRanges()
  sel === null || sel === void 0 ? void 0 : sel.addRange(range)
}
const mouseEnterEventListener = (e) => {
  if (!e.target) return
  selectElementText(e.target)
  const matchString = e.target.getAttribute('match')
  if (matchString) updateMatch(JSON.parse(matchString))
  else updateMatch()
}
//const mouseLeaveEventListener = () => updateMatch()
const addEventListenersToDecorations = () => {
  const decos = document.querySelectorAll('span.lt')
  if (decos.length) {
    decos.forEach((el) => {
      el.addEventListener('click', mouseEnterEventListener)
      //el.addEventListener('mouseleave', mouseLeaveEventListener)
    })
  }
}
export function changedDescendants(old, cur, offset, f) {
  const oldSize = old.childCount,
    curSize = cur.childCount
  outer: for (let i = 0, j = 0; i < curSize; i++) {
    const child = cur.child(i)
    for (let scan = j, e = Math.min(oldSize, i + 3); scan < e; scan++) {
      if (old.child(scan) === child) {
        j = scan + 1
        offset += child.nodeSize
        continue outer
      }
    }
    f(child, offset, cur)
    if (j < oldSize && old.child(j).sameMarkup(child)) changedDescendants(old.child(j), child, offset + 1, f)
    else child.nodesBetween(0, child.content.size, f, offset + 1)
    offset += child.nodeSize
  }
}
const gimmeDecoration = (from, to, match) =>
  Decoration.inline(from, to, {
    class: `lt lt-${match.rule.issueType}`,
    nodeName: 'span',
    match: JSON.stringify(match),
    uuid: uuidv4(),
  })
const proofreadNodeAndUpdateItsDecorations = async (node, offset, cur) => {
  if (editorView === null || editorView === void 0 ? void 0 : editorView.state)
    dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LoadingTransactionName, true))
  const ltRes = await (
    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: `text=${encodeURIComponent(node.textContent)}&language=auto&enabledOnly=false`,
    })
  ).json()
  decorationSet = decorationSet.remove(decorationSet.find(offset, offset + node.nodeSize))
  const nodeSpecificDecorations = []
  for (const match of ltRes.matches) {
    const from = match.offset + offset
    const to = from + match.length
    if (extensionDocId) {
      const content = editorView.state.doc.textBetween(from, to)
      nodeSpecificDecorations.push(gimmeDecoration(from, to, match))
    } else {
      nodeSpecificDecorations.push(gimmeDecoration(from, to, match))
    }
  }
  decorationSet = decorationSet.add(cur, nodeSpecificDecorations)
  if (editorView) dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LanguageToolTransactionName, true))
}
const debouncedProofreadNodeAndUpdateItsDecorations = debounce(proofreadNodeAndUpdateItsDecorations, 500)
const moreThan500Words = (s) => s.trim().split(/\s+/).length >= 500
const getMatchAndSetDecorations = async (doc, text, originalFrom) => {
  const ltRes = await (
    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: `text=${encodeURIComponent(text)}&language=auto&enabledOnly=false`,
    })
  ).json()
  const { matches } = ltRes
  const decorations = []
  for (const match of matches) {
    const from = match.offset + originalFrom
    const to = from + match.length
    if (extensionDocId) {
      const content = doc.textBetween(from, to)
      decorations.push(gimmeDecoration(from, to, match))
    } else {
      decorations.push(gimmeDecoration(from, to, match))
    }
  }
  decorationSet = decorationSet.remove(decorationSet.find(originalFrom, originalFrom + text.length))
  decorationSet = decorationSet.add(doc, decorations)
  if (editorView) dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LanguageToolTransactionName, true))
  setTimeout(addEventListenersToDecorations)
}
const proofreadAndDecorateWholeDoc = async (doc, url) => {
  apiUrl = url
  textNodesWithPosition = []
  let index = 0
  doc === null || doc === void 0
    ? void 0
    : doc.descendants((node, pos) => {
        if (node.isText) {
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
  textNodesWithPosition = textNodesWithPosition.filter(Boolean)
  let finalText = ''
  const chunksOf500Words = []
  let upperFrom = 0
  let newDataSet = true
  let lastPos = 1
  for (const { text, from, to } of textNodesWithPosition) {
    if (!newDataSet) {
      upperFrom = from
      newDataSet = true
    } else {
      const diff = from - lastPos
      if (diff > 0) finalText += Array(diff + 1).join(' ')
    }
    lastPos = to
    finalText += text
    if (moreThan500Words(finalText)) {
      const updatedFrom = chunksOf500Words.length ? upperFrom : upperFrom + 1
      chunksOf500Words.push({
        from: updatedFrom,
        text: finalText,
      })
      finalText = ''
      newDataSet = false
    }
  }
  chunksOf500Words.push({
    from: chunksOf500Words.length ? upperFrom : 1,
    text: finalText,
  })
  const requests = chunksOf500Words.map(({ text, from }) => getMatchAndSetDecorations(doc, text, from))
  if (editorView) dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LoadingTransactionName, true))
  Promise.all(requests).then(() => {
    if (editorView) dispatch(editorView.state.tr.setMeta(LanguageToolHelpingWords.LoadingTransactionName, false))
  })
  proofReadInitially = true
}
const debouncedProofreadAndDecorate = debounce(proofreadAndDecorateWholeDoc, 1000)
export const LanguageTool = Extension.create({
  name: 'languagetool',
  addOptions() {
    var _a
    return {
      language: 'auto',
      apiUrl:
        ((_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0
          ? void 0
          : _a.VUE_APP_LANGUAGE_TOOL_URL) + 'check',
      automaticMode: true,
      documentId: undefined,
    }
  },
  addStorage() {
    return {
      match: match,
      loading: false,
    }
  },
  addCommands() {
    return {
      proofread:
        () =>
        ({ tr }) => {
          proofreadAndDecorateWholeDoc(tr.doc, this.options.apiUrl)
          return true
        },
      toggleProofreading: () => () => {
        // TODO: implement toggling proofreading
        return false
      }
    }
  },
  addProseMirrorPlugins() {
    const { apiUrl, documentId } = this.options
    return [
      new Plugin({
        key: new PluginKey('languagetool'),
        props: {
          decorations(state) {
            return this.getState(state)
          },
          attributes: {
            spellcheck: 'false',
          },
        },
        state: {
          init: (config, state) => {
            decorationSet = DecorationSet.create(state.doc, [])
            if (this.options.automaticMode) proofreadAndDecorateWholeDoc(state.doc, apiUrl)
            if (documentId) {
              extensionDocId = documentId
            }
            return decorationSet
          },
          apply: (tr, oldPluginState, oldEditorState) => {
            const matchUpdated = tr.getMeta(LanguageToolHelpingWords.MatchUpdatedTransactionName)
            const loading = tr.getMeta(LanguageToolHelpingWords.LoadingTransactionName)
            if (loading) this.storage.loading = true
            else this.storage.loading = false
            if (matchUpdated) this.storage.match = match
            const languageToolDecorations = tr.getMeta(LanguageToolHelpingWords.LanguageToolTransactionName)
            if (languageToolDecorations) return decorationSet
            if (tr.docChanged && this.options.automaticMode) {
              if (!proofReadInitially) debouncedProofreadAndDecorate(tr.doc, apiUrl)
              else changedDescendants(oldEditorState.doc, tr.doc, 0, debouncedProofreadNodeAndUpdateItsDecorations)
            }
            decorationSet = decorationSet.map(tr.mapping, tr.doc)
            setTimeout(addEventListenersToDecorations)
            return decorationSet
          },
        },
        view: (view) => {
          return {
            update(view) {
              editorView = view
            },
          }
        },
      }),
    ]
  }
})
//# sourceMappingURL=languagetool.js.map
