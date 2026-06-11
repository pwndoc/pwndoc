<template>
    <div>
    <div v-if="showAiButton" class="bg-grey-4 row items-center q-px-sm q-py-xs">
        <q-btn flat size="sm" dense
        :loading="aiLoading"
        :disable="aiLoading || readonly"
        @click="$emit('ai-click')"
        >
            <q-tooltip :delay="500" class="text-bold">{{$t('aiChat.tooltip')}}</q-tooltip>
            <q-icon name="smart_toy" />
        </q-btn>
    </div>
    <q-input
    ref="textareaField"
    label-slot
    stack-label
    v-model="dataString"
    type="textarea"
    @update:model-value="updateParent"
    outlined
    :rules="rules"
    lazy-rules="ondemand"
    :readonly="readonly"
    >
    <template v-slot:label>
        {{label}} <span v-if="rules && rules[0] !== ''" class="text-red">*</span>
    </template>
    </q-input>
    </div>
</template>

<script>

export default {
    name: 'textarea-array',
    props: {
        label: String,
        modelValue: Array,
        noEmptyLine: {
            type: Boolean,
            default: false
        },
        readonly: {
            type: Boolean,
            default: false
        },
        rules: Array,
        showAiButton: {
            type: Boolean,
            default: false
        },
        aiLoading: {
            type: Boolean,
            default: false
        }
    },

    emits: ['update:modelValue', 'ai-click'],

    data: function() {
        return {
            dataString: "",
            hasError: false
        }
    },

    mounted: function() {
        if (this.modelValue)
            this.dataString = this.modelValue.join('\n')
    },

    watch: {
        modelValue (val) {
            var str = (val)? val.join('\n'): ""
            if (str === this.dataString)
                return
            this.dataString = str
        }
    },

    methods: {
        updateParent: function() {
            if (this.noEmptyLine)
                this.$emit('update:modelValue', this.dataString.split('\n').filter(e => e !== ''))
            else
                this.$emit('update:modelValue', this.dataString.split('\n'))
        },

        validate: function() {
            this.$refs.textareaField.validate()
            this.hasError = this.$refs.textareaField.hasError
        },

        getTextSelection: function() {
            const el = this.$refs.textareaField?.$el?.querySelector('textarea')
            if (!el)
                return null

            const start = el.selectionStart
            const end = el.selectionEnd
            if (start === end)
                return null

            const text = el.value.substring(start, end)
            return {
                start,
                end,
                text,
                html: text
            }
        },

        replaceTextSelection: function(content, range) {
            if (!range)
                return

            const el = this.$refs.textareaField?.$el?.querySelector('textarea')
            if (!el)
                return

            const replacement = Array.isArray(content) ?
                content.join('\n') :
                String(content || '')
            const value = el.value
            this.dataString = value.substring(0, range.start) + replacement + value.substring(range.end)
            this.updateParent()
        }
    }
}

</script>

<style>
</style>