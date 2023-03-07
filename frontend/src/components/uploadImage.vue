<template>
  <node-view-wrapper>
    <figure style="margin: auto; display: table; width: 600px">
      <q-img
        :src="src"
        :class="{ selected: selected }"
        style="max-width: 600px"
      />
      <div>
        <q-input
          input-class="text-center cursor-pointer"
          readonly
          borderless
          dense
          v-model="alt"
          placeholder="Caption"
        />
        <q-popup-edit v-model="alt" auto-save>
          <q-input
            input-class="text-center"
            autofocus
            v-model="alt"
            placeholder="Caption"
          />
        </q-popup-edit>
      </div>
    </figure>
  </node-view-wrapper>
</template>
<script>
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-2";
export default {
  components: {
    NodeViewWrapper,
  },
  props: nodeViewProps, //["node", "updateAttrs", "view", "getPos", "selected"],
  computed: {
    src: {
      get() {
        console.log("UploadImage.vue src");
        //console.log(this.editor.node);
        //console.log(this);
        console.log(`this.node.attrs.src :${this.node.attrs.src}`);
        if (this.node.attrs.src.startsWith("data")) return this.node.attrs.src;
        else return `api/images/download/${this.node.attrs.src}`;
      },
      set(src) {
        console.log(`set src : ${src}`);
        this.updateAttributes({
          src,
        });
      },
    },
    alt: {
      get() {
        console.log("UploadImage.vue alt");
        console.log(`this.node.attrs.alt :${this.node.attrs.alt}`);
        return this.node.attrs.alt;
      },
      set(alt) {
        this.updateAttributes({
          alt,
        });
      },
    },
  },
  methods: {
    selectImage() {
      console.log("selectImage");
      //console.log(this.editor);
      const { state } = this.editor.view;
      let { tr } = state;
      console.log(this.getPos());
      console.log(state.doc);

      const selection = tr.setNodeMarkup(this.getPos(), undefined, state.doc); //NodeSelection.create(state.doc, this.getPos());

      //tr = tr.setSelection(selection);
      this.editor.view.dispatch(selection); //tr);
    },
  },
};
</script>
