import Image from "@tiptap/extension-image";
import { Plugin, PluginKey } from "prosemirror-state";
import { VueNodeViewRenderer } from "@tiptap/vue-2";

import uploadImage from "./uploadImage.vue";
import ImageService from "@/services/image";
import Utils from "@/services/utils";

export default Image.extend({
  name: "custom_image",

  addOptions() {
    return {
      ...Image.options,
    };
  },
  group: "block",
  draggable: true,

  addAttributes() {
    return {
      ...Image.config.addAttributes(),
      attrs: {
        src: {},
        alt: {
          default: "",
        },
      },
      group: "block",
      draggable: true,
      parseDOM: [
        {
          tag: "img[src]",
          getAttrs: (dom) => ({
            src: dom.getAttribute("src"),
            alt: dom.getAttribute("alt"),
          }),
        },
      ],
      toDOM: (node) => ["img", node.attrs],
    };
  },
  addCommands() {
    return {
      setImage:
        (options) =>
        ({ tr, dispatch }) => {
          console.log("editor-image setImage");
          const { selection } = tr;
          console.log(options);
          const node = this.type.create(options);

          if (dispatch) {
            tr.replaceRangeWith(selection.from, selection.to, node);
          }

          return true;
        },
      setImageAttrs:
        (attrs) =>
        ({ tr, dispatch }) => {
          const { selection } = tr;
          const options = {
            ...selection.node.attrs,
            ...attributes,
          };
          const node = this.type.create(options);
          if (dispatch) {
            console.log(selection.to);
            tr.replaceRangeWith(node);
          }
        },
    };
  },
  addProseMirrorPlugins() {
    //https://github.com/ueberdosis/tiptap/issues/1057
    return [
      new Plugin({
        key: new PluginKey("eventHandler"),
        props: {
          handleDOMEvents: {
            drop(view, event) {
              var isImage = false;
              var file = event.dataTransfer.files[0];

              var auditId = null;
              var path = window.location.pathname.split("/");
              if (path && path.length > 3 && path[1] === "audits")
                auditId = path[2];

              if (file && file.type.startsWith("image")) {
                isImage = true;
                const { schema } = view.state;

                var fileReader = new FileReader();

                fileReader.onloadend = (e) => {
                  Utils.resizeImg(fileReader.result)
                    .then((data) => {
                      return ImageService.createImage({
                        value: data,
                        name: file.name,
                        auditId: auditId,
                      });
                    })
                    .then((data) => {
                      console.log(`drop src: ${data.data.datas._id},
                      alt: ${file.name},`);
                      const node = schema.nodes.custom_image.create({
                        src: data.data.datas._id,
                        alt: file.name,
                      });
                      const { selection } = view.state.tr;
                      const transaction = view.state.tr.replaceRangeWith(
                        selection.from,
                        selection.to,
                        node
                      );
                      view.dispatch(transaction);
                    })
                    .catch((err) => console.log(err));
                };

                fileReader.readAsDataURL(file);
              }

              if (isImage) {
                event.preventDefault();
                return true;
              }
            },
            paste(view, event) {
              var isImage = false;
              var file = event.clipboardData.files[0];

              var auditId = null;
              var path = window.location.pathname.split("/");
              if (path && path.length > 3 && path[1] === "audits")
                auditId = path[2];

              if (file && file.type.startsWith("image")) {
                isImage = true;
                const { schema } = view.state;
                var fileReader = new FileReader();

                fileReader.onloadend = (e) => {
                  Utils.resizeImg(fileReader.result)
                    .then((data) => {
                      return ImageService.createImage({
                        value: data,
                        name: file.name,
                        auditId: auditId,
                      });
                    })
                    .then((data) => {
                      console.log(`paste src: ${data.data.datas._id},
                      alt: ${file.name},`);
                      const node = schema.nodes.custom_image.create({
                        src: data.data.datas._id,
                        alt: file.name,
                      });
                      const { selection } = view.state.tr;
                      const transaction = view.state.tr.replaceRangeWith(
                        selection.from,
                        selection.to,
                        node
                      );

                      view.dispatch(transaction);
                    })
                    .catch((err) => console.log(err));
                };

                fileReader.readAsDataURL(file);
              }

              if (isImage) {
                event.preventDefault();
                return true;
              }
            },
          },
        },
      }),
    ];
  },
  addNodeView() {
    return VueNodeViewRenderer(uploadImage);
  },
});
