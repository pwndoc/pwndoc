<template>
<div>
    <component :is="customElement" v-for="(computedField,idx) of computedFields" :key="idx">
        <div class="row q-col-gutter-md">
            <div v-for="(field,idx) of computedField" :key="idx" :class="`col-12 col-md-${field.customField.size||12} offset-md-${field.customField.offset||0}`">
                <q-field 
                :ref="`field-${idx}`"
                v-if="field.customField.fieldType === 'text'" 
                label-slot 
                stack-label 
                borderless
                :class="(isTextInCustomFields(field))?'bg-red-1':'white'"
                :hint="field.customField.description"
                hide-bottom-space
                :rules="(field.customField.required)? [val => !!val || 'Field is required']: []"
                lazy-rules="ondemand"
                :value="field.text"
                >
                    <template v-slot:control>
                        <basic-editor 
                        v-if="diff"
                        v-model="field.text"
                        :diff="getTextDiffInCustomFields(field)"
                        :editable=false
                        /> 
                        <basic-editor 
                        v-else
                        ref="basiceditor_custom" 
                        v-model="field.text" 
                        :noSync="noSyncEditor"
                        /> 
                    </template>

                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                </q-field>

                <q-input
                :ref="`field-${idx}`"
                v-if="field.customField.fieldType === 'input'"
                :label='field.customField.label'
                stack-label
                v-model="field.text"
                :readonly="diff !== null"
                :bg-color="(isTextInCustomFields(field))?'red-1':'white'"
                :hint="field.customField.description"
                hide-bottom-space
                :rules="(field.customField.required)? [val => !!val || 'Field is required']: []"
                lazy-rules="ondemand"
                outlined
                >
                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                </q-input>
            </div>
        </div>
    </component>
</div>
</template>

<script>
import BasicEditor from 'components/editor';

import Utils from '@/services/utils';

export default {
    name: 'custom-fields',
    props: {
        value: Array,
        customElement: {
            type: String,
            default: 'div'
        },
        noSyncEditor: {
            type: Boolean,
            default: false
        },
        diff: {
            type: Array,
            default: null
        }
    },

    data: function() {
        return {
            
        }
    },

    components: {
        BasicEditor
    },

    computed: {
        computedFields: function() {
            var result = []
            var tmpArray = []
            this.value.forEach(e => {
                if (e.customField.fieldType !== 'space')
                    tmpArray.push(e)
                else {
                    result.push(tmpArray)
                    result.push([])
                    tmpArray = []
                }
            })
            if (tmpArray.length > 0)
                result.push(tmpArray)
            return result
        }
    },

    methods: {
        isTextInCustomFields: function(field) {
            if (this.diff) {
                return typeof this.diff.find(f => {
                    return f.customField._id === field.customField._id && f.text === field.text
                }) === 'undefined'
            }
            return false
        },

        getTextDiffInCustomFields: function(field) {
            var result = ''
            if (this.diff) {
                this.diff.find(f => {
                    if (f.customField._id === field.customField._id)
                        result = f.text
                })
            }
            return result
        },

        validate: function() {
            Object.keys(this.$refs).forEach(key => key.startsWith('field') && this.$refs[key][0].validate())
        },

        requiredFieldsEmpty: function() {
            this.validate()
            return this.value.some(e => e.customField.required && !e.text)
        }
    }
}

</script>

<style>
</style>