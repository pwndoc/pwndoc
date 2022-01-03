import { Node, NodeSelection } from "tiptap";


export default class Caption extends Node {
  get name() {
    return 'caption'
  }

  get schema() {
    return {
      attrs: {
        label: {
          default: "Figure"
        },
        alt: {
          default: ""
        }
      },
      group: "block",
      draggable: true,
      parseDOM: [
        {
          tag: "legend[alt]",
          getAttrs: dom => ({
            label: dom.getAttribute("label"),
            alt: dom.getAttribute("alt")
          })
        }
      ],
      toDOM: node => ["legend", node.attrs]
    }
  }
  
  commands({ type }) {
    return (attrs) => (state, dispatch) => dispatch(state.tr.replaceSelectionWith(type.create(attrs)))
  }
  
  get view() {
    return {
      props: ["node", "updateAttrs"],
      computed: {
        label: {
          get() {
            return this.node.attrs.label
          },
          set(label) {
            this.updateAttrs({
              label
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
      template: `
      <div style="margin: 0px auto 16px auto; display: table">
        <div style="max-width:600px" class="cursor-pointer">
          <span>{{label}} - </span>
          <span v-if="alt" class="text-italic">{{alt}}</span>
          <span v-else class="text-italic text-grey-7">Caption</span>
        </div>
        <q-popup-edit v-model="alt" auto-save>
          <q-input style="width:600px" autofocus :prefix="label+' - '" v-model="alt" placeholder="Caption" />
        </q-popup-edit>
      </div>
      `
    };
  }
}