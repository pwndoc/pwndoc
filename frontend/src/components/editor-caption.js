import { Node, NodeSelection } from "tiptap";


export default class Caption extends Node {
  get name() {
    return 'caption'
  }

  get schema() {
    return {
      attrs: {
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
      <div style="margin: 0px auto 16px auto; display: table; width:600px">
      <q-input input-class="text-center text-italic cursor-pointer" readonly borderless dense v-model="alt" placeholder="Caption"  />
      <q-popup-edit v-model="alt" auto-save>
      <q-input input-class="text-center" autofocus v-model="alt" placeholder="Caption" />
      </q-popup-edit>
      </div>
      `
    };
  }
}