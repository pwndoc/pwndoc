import { NodeSelection, Plugin } from "tiptap";
import { Image as TipTapImage } from 'tiptap-extensions'

import ImageService from '@/services/image'
import Utils from '@/services/utils'

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
  
  commands({ type }) {
    return (attrs) => (state, dispatch) => dispatch(state.tr.replaceSelectionWith(type.create(attrs)))
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop(view,event){
              var isImage = false
              var file = event.dataTransfer.files[0]

              var auditId = null
              var path = window.location.pathname.split('/')
              if (path && path.length > 3 && path[1] === 'audits')
                auditId = path[2]

              if (file && file.type.startsWith("image")) {
                isImage = true
                var fileReader = new FileReader()

                fileReader.onloadend = (e) => {
                  console.log(fileReader.result)
                  Utils.resizeImg(fileReader.result)
                  .then(data => {
                    console.log(data)
                    return ImageService.createImage({value: data, name: file.name, auditId: auditId})
                  })
                  .then((data) => {
                    const node = view.state.schema.nodes.image.create({src: data.data.datas._id, alt: file.name})
                    const transaction = view.state.tr.replaceSelectionWith(node)
                    view.dispatch(transaction)
                  })
                  .catch(err => console.log(err))
                }
  
                fileReader.readAsDataURL(file);
              }
              
              if (isImage) {
                event.preventDefault()
                return true
              }
            },
            paste(view,event){
              var isImage = false
              var file = event.clipboardData.files[0]

              var auditId = null
              var path = window.location.pathname.split('/')
              if (path && path.length > 3 && path[1] === 'audits')
                auditId = path[2]

              if (file && file.type.startsWith("image")) {
                isImage = true
                var fileReader = new FileReader()

                fileReader.onloadend = (e) => {
                  console.log(fileReader.result)
                  Utils.resizeImg(fileReader.result)
                  .then(data => {
                    console.log(data)
                    return ImageService.createImage({value: data, name: file.name, auditId: auditId})
                  })
                  .then((data) => {
                    const node = view.state.schema.nodes.image.create({src: data.data.datas._id, alt: file.name})
                    const transaction = view.state.tr.replaceSelectionWith(node)
                    view.dispatch(transaction)
                  })
                  .catch(err => console.log(err))
                }
  
                fileReader.readAsDataURL(file);
              }
              
              if (isImage) {
                event.preventDefault()
                return true
              }
            }
          }
        },
      }),
    ]
  }
  
  
  get view() {
    return {
      props: ["node", "updateAttrs", "view", "getPos", "selected"],
      computed: {
        src: {
          get() {
            if (this.node.attrs.src.startsWith('data'))
              return this.node.attrs.src
            else
              return `api/images/download/${this.node.attrs.src}`
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