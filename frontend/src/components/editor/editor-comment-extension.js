import { Extension } from '@tiptap/core'
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

const nodesWithComment = ['caption', 'image']

export default Extension.create({
    name: 'CommentExtension',
  
    addCommands() {
      return {
        setComment: (fieldName) => ({ state, tr, dispatch }) => {
            const schema = state.schema
            const { from, to } = state.selection
            const selectedText = from !== to
            const newId = generateObjectId()
            const commentMark = schema.marks.comment
  
            if (!selectedText) {
                document.dispatchEvent(new CustomEvent('comment-added', {
                    detail: {
                      id: newId,
                      fieldName: fieldName,
                      warning: "commentNoSelectedText"
                    },
                }))
                return false
            }
            else {
                const before = tr.steps.length
                tr.addMark(from, to, commentMark.create({id: newId, enabled: true, focused: true}))
                tr.doc.nodesBetween(from, to, (node, pos) => {
                    if (nodesWithComment.includes(node.type.name)) {
                        tr.setNodeMarkup(pos, null, {...node.attrs, commentId: newId})
                    }
                })
                const after = tr.steps.length

                if (after > before) { // Transactions were successfully made
                    dispatch(tr)
                
                    document.dispatchEvent(new CustomEvent('comment-added', {
                      detail: { id: newId, fieldName: fieldName },
                    }))
                }
                else {
                    document.dispatchEvent(new CustomEvent('comment-added', {
                        detail: {
                            id: newId,
                            fieldName: fieldName,
                            warning: "commentCannotSetMark"
                        }
                    }))
                }
                return (after > before)
            }
        },

        unsetComment: (commentId) => ({ state, tr, dispatch }) => {
            const schema = state.schema

            const commentMark = schema.marks.comment
            const before = tr.steps.length

            // Iterate through the entire document
            tr.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
                if (node.isText) {
                    const existingMark = node.marks.find(mark => mark.type === commentMark)
                    // If the mark exists and the commentId matches, remove the mark
                    if (existingMark && existingMark.attrs.id === commentId) {
                        tr.removeMark(pos, pos + node.nodeSize, commentMark)
                    }
                }
                else if (nodesWithComment.includes(node.type.name) && node.attrs.commentId === commentId) {
                    tr.setNodeMarkup(pos, null, {...node.attrs, enabled: false, focused: false, commentId: null})
                }
            })

            const after = tr.steps.length
            if (after > before) {
                dispatch(tr)
                return true
            }

            return false
        }
      }
    },

    addProseMirrorPlugins() {
        return [
          new Plugin({
            key: new PluginKey('eventHandler'),
            props: {
              handleClick(view, pos, event) {
                const $pos = view.state.doc.resolve(pos)
                const nodeBefore = $pos.nodeBefore
                const nodeAfter = $pos.nodeAfter
                let node = nodeBefore // Default to nodeBefore
                if (nodesWithComment.includes(nodeAfter?.type.name)) // Change node if nodeAfter is a node with comments
                  node = nodeAfter
                if (node && node.isText) {
                  for (let mark of node.marks) {
                    if (mark.type.name === 'comment' && mark.attrs.enabled) {
                      document.dispatchEvent(new CustomEvent(
                        'comment-clicked', 
                        { detail: { id: mark.attrs.id } }))
                        return true
                    }
                  }
                }
                else if (node && node.attrs.enabled && nodesWithComment.includes(node.type.name)) {
                  document.dispatchEvent(new CustomEvent(
                    'comment-clicked', 
                    { detail: { id: node.attrs.commentId } }))
                    return true
                }
                return false // Let Prosemirror handle click
              }
            }
          })
        ]
    }
  })
  
