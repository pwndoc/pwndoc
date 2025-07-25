import { Node } from "@tiptap/core";
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import Component from './editor-caption-template.vue'

export default Node.create({
  name: "caption",

  group: 'block',
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      label: {
        default: "Figure"
      },
      alt: {
        default: ""
      },
      commentId: {
        default: null
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
        tag: "legend[alt]",
        getAttrs: dom => ({
          label: dom.getAttribute("label"),
          alt: dom.getAttribute("alt"),
          commentId: dom.getAttribute("commentid")
        })
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['legend', HTMLAttributes]
  },

  addCommands() {
    return {
      setCaption: (attributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes
        })
      },
    }
  },
  
  addNodeView() {
    return VueNodeViewRenderer(Component)
  }   
})