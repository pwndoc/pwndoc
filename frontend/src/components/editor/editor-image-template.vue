<template>
  <node-view-wrapper :class="{'comment-focused': focused, 'comment-enabled': enabled}">
    <figure style="margin: auto; display: table; width:600px" data-drag-handle>
      <q-img :src="src" :class="{'selected': selected}" style="max-width:600px;margin-bottom:4px" />
      <div>
        <q-input input-class="text-center cursor-pointer" readonly borderless dense v-model="alt" placeholder="Caption" />
        <q-popup-edit v-model="alt" auto-save>
          <q-input input-class="text-center" autofocus v-model="alt" placeholder="Caption" />
        </q-popup-edit>
      </div>
    </figure>
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
    src: {
      get() {
        if (this.node.attrs.src.startsWith('data'))
          return this.node.attrs.src
        else
          return `api/images/download/${this.node.attrs.src}`
      },
      set(src) {
        this.updateAttributes({
          src
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
    },
    focused: {
      get() {
        return this.node.attrs.focused
      },
      set(focused) {
        this.updateAttributes({
          focused
        });
      }
    },
    enabled: {
      get() {
        return this.node.attrs.enabled
      },
      set(enabled) {
        this.updateAttributes({
          enabled
        });
      }
    }
  }
}
</script>