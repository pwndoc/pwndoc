import { Mark, mergeAttributes } from "@tiptap/core"
import { Plugin, PluginKey } from '@tiptap/pm/state'

function generateObjectId() {
  // 1. Generate a 4-byte timestamp (seconds since Unix epoch)
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  
  // 2. Generate a 5-byte random value
  const randomValue = Array.from({ length: 5 })
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
    .join('');
  
  // 3. Generate a 3-byte incrementing counter (in a real-world application, this would be unique per process or request)
  let counter = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'); // Max 3-byte value
  
  // Combine all parts to form the ObjectId-like string
  return timestamp + randomValue + counter;
}

export default Mark.create({
  name: "comment",

  addAttributes() {
    return {
      id: {
        default: ""
      },
      focused: {
        default: false
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
    let classObj = {}
      if (this.options.commentMode)
        classObj.class = "enabled"
      if (HTMLAttributes.focused)
        classObj.class += " focused"
    return ['comment', mergeAttributes(HTMLAttributes, classObj)]
  },

  addCommands() {
    return {
      setComment: (fieldName) => ({ commands }) => {
        const newId = generateObjectId()
        document.dispatchEvent(new CustomEvent('comment-added', { detail: { id: newId, fieldName: fieldName } }))
        return commands.setMark(this.name, { id: newId, focused: true })
      },
      unsetComment: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('eventHandler'),
        props: {
          handleClick(view, pos, event) {
            let node = view.state.doc.nodeAt(pos)
            if (node && node.marks) {
              for (let mark of node.marks) {
                if (mark.type.name === 'comment') {
                  document.dispatchEvent(new CustomEvent(
                    'comment-clicked', 
                    { detail: { id: mark.attrs.id } }))
                    break
                }
              }
            }
          }
        }
      })
    ]
  },
})