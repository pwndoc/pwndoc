<template>
    <q-input
    ref="textareaField"
    label-slot
    stack-label
    v-model="dataString"
    type="textarea"
    @input="updateParent"
    outlined
    :rules="rules"
    lazy-rules="ondemand"
    :readonly="readonly"
    >
    <template v-slot:label>
        {{label}} <span v-if="rules && rules[0] !== ''" class="text-red">*</span>
    </template>
    </q-input>
</template>

<script>

export default {
    name: 'textarea-array',
    props: {
        label: String,
        value: Array,
        noEmptyLine: {
            type: Boolean,
            default: false
        },
        readonly: {
            type: Boolean,
            default: false
        },
        rules: Array
    },

    data: function() {
        return {
            dataString: "",
            hasError: false
        }
    },

    mounted: function() {
        if (this.value)
            this.dataString = this.value.join('\n')
    },

    watch: {
        value (val) {
            var str = (val)? val.join('\n'): ""
            if (str === this.dataString)
                return
            this.dataString = str
        }
    },

    methods: {
        updateParent: function() {
            if (this.noEmptyLine)
                this.$emit('input', this.dataString.split('\n').filter(e => e !== ''))
            else
                this.$emit('input', this.dataString.split('\n'))
        },

        validate: function() {
            this.$refs.textareaField.validate()
            this.hasError = this.$refs.textareaField.hasError
        }
    }
}

</script>

<style>
</style>