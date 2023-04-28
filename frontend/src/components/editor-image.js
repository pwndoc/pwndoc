import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Image as TipTapImage } from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-2'
import Component from './editor-image-template.vue'

import ImageService from '@/services/image'
import Utils from '@/services/utils'

export default TipTapImage.extend({
  parseHTML: [
    {
      tag: "img[src]",
      getAttrs: dom => ({
        src: dom.getAttribute("src"),
        alt: dom.getAttribute("alt")
      })
    }
  ],

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('eventHandler'),
        props: {
          handleDrop(view,event){
            var isImage = false
            var file = event.dataTransfer.files[0]

            var auditId = null
            var path = window.location.pathname.split('/')
            if (path && path.length > 3 && path[1] === 'audits')
              auditId = path[2]

            if (file && file.type.startsWith("image")) {
              isImage = true
              var fileReader = new FileReader()

              fileReader.onloadend = (e) => {
                Utils.resizeImg(fileReader.result)
                .then(data => {
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
          handlePaste(view,event){
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
                Utils.resizeImg(fileReader.result)
                .then(data => {
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
        },
      }),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(Component)
  }   
})