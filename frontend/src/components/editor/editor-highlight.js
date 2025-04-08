import { Highlight } from '@tiptap/extension-highlight'

import Utils from '@/services/utils'

// Extend Highlight to handle black or white text color depending on the background
export default Highlight.extend({
  addAttributes() {
    if (!this.options.multicolor) {
      return {}
    }

    return {
      color: {
        default: "#ffff25",
        parseHTML: element => element.getAttribute('data-color') || element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.color) {
            return {}
          }

          return {
            'data-color': attributes.color,
            style: `background-color: ${attributes.color}; color: ${Utils.getTextColor(attributes.color)}`,
          }
        },
      },
    }
  },

  addStorage() {
    return {
      color: "#ffff25",
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-h': () => this.editor.commands.toggleHighlight({color: this.storage.color}),
    }
  }
})