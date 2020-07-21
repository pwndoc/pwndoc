import { Node, Plugin, TextSelection } from "tiptap";
import { Image as TipTapImage } from 'tiptap-extensions'

export default class CustomImage extends TipTapImage {
    get name() {
        return 'image'
      }

    get schema() {
        return {
            attrs: {
                src: {},
                alt: {
                    default: ""
                }
            },
            // inline: true,
            group: "block",
            draggable: true,
            parseDOM: [
                {
                    tag: "img[src]",
                    getAttrs: dom => ({
                        src: dom.getAttribute("src"),
                        alt: dom.getAttribute("alt")
                    })
                }
            ],
            toDOM: node => ["img", node.attrs]
        }
    }

    commands({ type }) {
        return (attrs) => (state, dispatch) => dispatch(state.tr.replaceSelectionWith(type.create(attrs)))
      }

    get plugins() {
        return [
            new Plugin({
                props: {
                    handleDOMEvents: {
                        drop(view, event) {
                            const hasFiles = event.dataTransfer
                            && event.dataTransfer.files
                            && event.dataTransfer.files.length
                
                            if (!hasFiles) {
                                return
                            }
                
                            const images = Array
                                .from(event.dataTransfer.files)
                                .filter(file => (/image/i).test(file.type))
                
                            if (images.length === 0) {
                                return
                            }
                
                            event.preventDefault()
                
                            const { schema } = view.state
                            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                
                            images.forEach(image => {
                                const reader = new FileReader()
                
                                reader.onload = readerEvent => {
                                const node = schema.nodes.image.create({
                                    src: readerEvent.target.result,
                                })
                                const transaction = view.state.tr.insert(coordinates.pos, node)
                                view.dispatch(transaction)
                                }
                                reader.readAsDataURL(image)
                            })
                        },
                    },
                },
            }),
        ]
    }

  get view() {
    return {
      props: ["node", "updateAttrs", "view", "getPos"],
      computed: {
        src: {
          get() {
            return this.node.attrs.src
          },
          set(src) {
            this.updateAttrs({
              src
            });
          }
        },
        alt: {
          get() {
            return this.node.attrs.alt
          },
          set(alt) {
            this.updateAttrs({
              alt
            });
          }
        }
      },
      methods: {
        handleKeyup(event) {
          let {
            state: { tr }
          } = this.view;
          const pos = this.getPos();
          if (event.key === "Enter") {
                let textSelection = TextSelection.create(tr.doc, pos + 1)
                this.view.dispatch(tr.setSelection(textSelection))
                this.view.focus()
          }
        }
      },
      template: `
          <figure class="q-py-md" style="margin: auto; display: table; width:600px">
            <q-img :src="src" style="max-width:600px" />
            <q-input input-class="text-center" v-model="alt" placeholder="Caption" @keyup="handleKeyup" />
          </figure>
        `
    };
  }
}