<template>
  <node-view-wrapper>
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
  </node-view-wrapper>
</template>

<script>
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

export default {
  components: {
    NodeViewWrapper
  },
  props: nodeViewProps,
  computed: {
    label: {
      get() {
        return this.node.attrs.label
      },
      set(label) {
        this.updateAttributes({
          label
        });
      }
    },
    alt: {
      get() {
        return this.node.attrs.alt
      },
      set(alt) {
        this.updateAttributes({
          alt
        });
      }
    }  
  }
}
</script>