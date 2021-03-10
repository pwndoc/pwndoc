<template>
    <q-input
    :label="label"
    stack-label
    v-model="dataString"
    type="textarea"
    @input="updateParent"
    outlined 
    bg-color="white"
    />
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
        }
    },

    data: function() {
        return {
            dataString: ""
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
                this.$emit('input', this.dataString.split('\n').filter(e => e !== '').map(e => e.trim()))
            else
                this.$emit('input', this.dataString.split('\n').map(e => e.trim()))
        }
    }
}

</script>

<style>
</style>