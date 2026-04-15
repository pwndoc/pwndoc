<template>
  <node-view-wrapper :class="{'comment-focused': focused, 'comment-enabled': enabled}">
    <figure style="margin: 0px auto 16px auto; display: table; width:600px" data-drag-handle>
      <q-img :src="src" :class="{'selected': selected}" style="max-width:600px;margin-bottom:16px" />
      <div style="text-align:center">
        <div v-if="!editing" class="caption-display" style="justify-content:center" @click="startEdit">
          <span v-if="alt" class="text-italic">{{alt}}</span>
          <span v-else class="text-italic text-grey-7">Caption</span>
          <q-icon name="edit" class="caption-edit-icon" />
        </div>
        <template v-else>
          <textarea
            ref="input"
            v-model="draftAlt"
            class="caption-input"
            rows="1"
            placeholder="Caption"
            @input="autoResize"
            @keyup.enter.prevent="saveEdit"
            @keyup.esc="cancelEdit"
            @blur="saveEdit"
          />
          <div class="caption-edit-hint">Editing… press Esc to cancel</div>
        </template>
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
  data() {
    return { editing: false, draftAlt: '' }
  },
  computed: {
    src: {
      get() {
        if (this.node.attrs.src.startsWith('data'))
          return this.node.attrs.src
        else
          return `/api/images/download/${this.node.attrs.src}`
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
  },
  methods: {
    startEdit() {
      this.draftAlt = this.alt || ''
      this.editing = true
      this.$nextTick(() => {
        this.$refs.input.focus()
        this.autoResize()
      })
    },
    autoResize() {
      const el = this.$refs.input
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    },
    saveEdit() {
      if (!this.editing) return
      this.alt = this.draftAlt.trim()
      this.editing = false
    },
    cancelEdit() {
      this.editing = false
    }
  }
}
</script>

<style lang="scss" scoped>
.caption-display {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 6px;

  .caption-edit-icon {
    opacity: 0;
    font-size: 12px;
  }

  &:hover .caption-edit-icon {
    opacity: 0.6;
  }
}

.caption-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid $primary;
  outline: none;
  font-style: italic;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  padding: 2px 4px;
  resize: none;
  overflow: hidden;
  text-align: center;
}

.caption-edit-hint {
  font-size: 11px;
  opacity: 0.45;
  margin-top: 2px;
}
</style>
