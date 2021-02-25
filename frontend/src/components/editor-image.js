import { NodeSelection } from "tiptap";
import { Image as TipTapImage } from 'tiptap-extensions'

export default class CustomImage extends TipTapImage {
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

  get view() {
    return {
      props: ["node", "updateAttrs", "view", "getPos", "selected"],
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
        selectImage() {
          const { state } = this.view
          let { tr } = state
          const selection = NodeSelection.create(state.doc, this.getPos())
          tr = tr.setSelection(selection)
          this.view.dispatch(tr)
        }
      },
      template: `
          <figure style="margin: auto; display: table; width:600px">
            <q-img :src="src" :class="{'selected': selected}" style="max-width:600px" @click="selectImage" />
            <div>
              <q-input input-class="text-center cursor-pointer" readonly borderless dense v-model="alt" placeholder="Caption" />
              <q-popup-edit v-model="alt" auto-save>
                <q-input input-class="text-center" autofocus v-model="alt" placeholder="Caption" />
              </q-popup-edit>
            </div>
          </figure>
        `
    };
  }
}