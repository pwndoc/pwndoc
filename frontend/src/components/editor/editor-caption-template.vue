<template>
  <node-view-wrapper :class="{'comment-focused': focused, 'comment-enabled': enabled}" :draggable="!editing">
    <div :data-drag-handle="!editing" class="editor-caption" style="margin: 0px auto 16px auto; display: table; width:600px">
      <div style="max-width:600px; text-align:center">
        <div v-if="!editing" class="caption-display" @click="startEdit">
          <span v-if="alt" class="text-italic"><b>{{label}}</b> - {{alt}}</span>
          <span v-else class="text-italic text-grey-7">{{label}} - Caption</span>
          <q-icon name="edit" class="caption-edit-icon" />
        </div>
        <template v-else>
          <div class="caption-edit-active">
            <span class="caption-label text-bold">{{label}} -</span>
            <textarea
              ref="input"
              v-model="draftAlt"
              class="caption-input"
              rows="1"
              placeholder="Caption"
              @input="autoResize"
              @keydown.enter.prevent="saveEdit"
              @keyup.esc="cancelEdit"
              @blur="saveEdit"
            />
          </div>
          <div class="caption-edit-hint">Editing… press Esc to cancel</div>
        </template>
      </div>
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
  data() {
    return { editing: false, draftAlt: '' }
  },
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
    saveEdit() {
      if (!this.editing) return
      this.alt = this.draftAlt.trim()
      this.editing = false
    },
    autoResize() {
      const el = this.$refs.input
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    },
    cancelEdit() {
      this.editing = false
    }
  }
}
</script>

<style lang="scss" scoped>
.caption-label {
  white-space: nowrap;
  flex-shrink: 0;
}

.caption-display {
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
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

.caption-edit-active {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 2px 6px;
}

.caption-edit-hint {
  font-size: 11px;
  opacity: 0.45;
  margin-top: 2px;
}

.caption-input {
  flex: 1;
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
</style>
