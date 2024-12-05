import { Node } from '@tiptap/core';

let isRecalculating = false; // Global flag to prevent recursion

const Footnote = Node.create({  
  name: 'footnote',

  group: 'inline',

  inline: true,

  atom: true, // Self-contained unit

  addAttributes() {
    return {
      id: {
        default: 0,
      },
      content: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'sup[data-footnote]', // Match superscript elements with the footnote data attribute
        getAttrs: (dom) => {
          const id = dom.getAttribute('data-footnote');
          const content = dom.getAttribute('title');
          return {id, content};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', { 'data-footnote': HTMLAttributes.id, title: HTMLAttributes.content }, `${HTMLAttributes.id}`];
  },

  addCommands() {
    return {
      addFootnote:
        (content) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { content }, // `id` will be recalculated automatically
            })
            .run();
        },
    };
  },

  onUpdate({ editor }) {
    if (isRecalculating) return; // Skip updates during recalculation
    isRecalculating = true;

    try {
      recalculateFootnoteIds(editor); // Recalculate IDs without triggering infinite updates
    } finally {
      isRecalculating = false; // Reset the flag
    }
  },

  onCreate({ editor }) {
    recalculateFootnoteIds(editor);
  },
});

// Helper function to recalculate IDs
function recalculateFootnoteIds(editor) {
  let counter = 1;

  // Traverse all nodes in the document and update footnote IDs
  editor.view.state.doc.descendants((node, pos) => {
    if (node.type.name === 'footnote') {
      // Use transaction to update node attributes
      const transaction = editor.view.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        id: counter.toString(), // Set the new sequential ID
      });

      editor.view.dispatch(transaction); // Apply the transaction to update the state
      counter += 1;
    }
  });
}

export default Footnote;