import { Mark } from "@tiptap/core"
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export default Mark.create({
  name: "comment",

  addAttributes() {
    return {
      id: {
        default: ""
      },
      enabled: {
        default: false,
        rendered: false
      },
      focused: {
        default: false,
        rendered: false
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: "comment[id]",
        getAttrs: dom => ({
          id: dom.getAttribute("id")
        })
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['comment', HTMLAttributes]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('eventHandler'),
        props: {
          decorations(state) {
            const { doc } = state
            let decorations = []

            state.doc.descendants((node, pos) => {
              node.marks.forEach((mark) => {
                  let decoClass = ""
                  if (mark.attrs.enabled && mark.attrs.focused)
                    decoClass = 'comment-enabled comment-focused'
                  else if (mark.attrs.enabled)
                    decoClass = 'comment-enabled'

                  if (decoClass)
                    decorations.push(Decoration.inline(pos, pos + node.nodeSize, {class: decoClass}))
                })
            })
            return DecorationSet.create(doc, decorations)
          }
        }
      })
    ]
  },
})