import { Node } from '@tiptap/core'

export default Node.create({
    name: 'codeBlock',
    group: 'block',
    content: 'text*', // Allows text content inside the code block
    code: true, // Treats the node as a code block
    defining: true,
    
    addAttributes() {
        return {
            backgroundColor: {
                default: null,
            },
            textColor: {
                default: null,
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'pre',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['pre', HTMLAttributes, 0];
    },

    addCommands() {
        return {
            setCodeBlock:
                (options) =>
                    ({ commands }) => {
                        return commands.setNode(this.name, options)
                    },
            toggleCodeBlock:
                (options) =>
                    ({ commands }) => {
                        return commands.toggleNode(this.name, 'paragraph', options)
                    },
        }
    },
})