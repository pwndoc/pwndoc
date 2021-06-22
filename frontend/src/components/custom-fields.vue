<template>
<div>
    <component :is="customElement" v-for="(computedField,idx) of computedFields" :key="idx">
        <div class="row q-col-gutter-md">
            <div v-for="(field,idx2) of computedField" :key="idx2" :class="`col-12 col-md-${field.customField.size||12} offset-md-${field.customField.offset||0}`">
                <q-field 
                :ref="`field-${idx}-${idx2}`"
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
                        :editable="!readonly"
                        /> 
                    </template>

                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                </q-field>

                <q-input
                :ref="`field-${idx}-${idx2}`"
                v-if="field.customField.fieldType === 'input'"
                :label='field.customField.label'
                stack-label
                v-model="field.text"
                :readonly="diff !== null || readonly"
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

                <q-input
                :ref="`field-${idx}-${idx2}`"
                v-if="field.customField.fieldType === 'date'"
                :label='field.customField.label'
                stack-label
                v-model="field.text"
                :readonly="diff !== null || readonly"
                :bg-color="(isTextInCustomFields(field))?'red-1':'white'"
                :hint="field.customField.description"
                hide-bottom-space
                :rules="(field.customField.required)? [val => !!val || 'Field is required']: []"
                lazy-rules="ondemand"
                outlined
                >
                    <template v-slot:append>
                        <q-icon name="event" class="cursor-pointer">
                        <q-popup-proxy ref="qDateProxyField" transition-show="scale" transition-hide="scale">
                            <q-date :readonly="readonly" first-day-of-week="1" mask="YYYY-MM-DD" v-model="field.text" @input="$refs.qDateProxyField.forEach(e => e.hide())" />
                        </q-popup-proxy>
                        </q-icon>
                    </template>
                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                </q-input>

                <q-select
                :ref="`field-${idx}-${idx2}`"
                v-if="field.customField.fieldType === 'select'"
                :label="field.customField.label"
                stack-label
                v-model="field.text"
                :options="field.customField.options.filter(e => e.locale === locale)"
                option-value="value"
                option-label="value"
                emit-value
                clearable
                options-sanitize
                outlined 
                :readonly="diff !== null || readonly"
                :bg-color="(isTextInCustomFields(field))?'red-1':'white'"
                :hint="field.customField.description"
                hide-bottom-space
                :rules="(field.customField.required)? [val => !!val || 'Field is required']: []"
                lazy-rules="ondemand"
                >
                     <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                </q-select>

                <q-select
                :ref="`field-${idx}-${idx2}`"
                v-if="field.customField.fieldType === 'select-multiple'"
                :label="field.customField.label"
                stack-label
                v-model="field.text"
                :options="field.customField.options.filter(e => e.locale === locale)"
                option-value="value"
                option-label="value"
                emit-value
                multiple
                use-chips
                clearable
                options-sanitize
                outlined 
                :readonly="diff !== null || readonly"
                :bg-color="(isTextInCustomFields(field))?'red-1':'white'"
                :hint="field.customField.description"
                hide-bottom-space
                :rules="(field.customField.required)? [val => !!val || 'Field is required', val => val && val.length > 0 || 'Field is required']: []"
                lazy-rules="ondemand"
                >
                     <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                     <template v-slot:selected-item="scope">
                        <q-chip
                        dense
                        removable
                        @remove="scope.removeAtIndex(scope.index)"
                        :tabindex="scope.tabindex"
                        color="blue-grey-5"
                        text-color="white"
                        >
                            {{scope.opt}}
                        </q-chip>
                    </template>
                </q-select>

                <q-field
                :ref="`field-${idx}-${idx2}`"
                v-if="field.customField.fieldType === 'checkbox'"
                :label="field.customField.label"
                stack-label
                :value="field.text"
                :hint="field.description"
                hide-bottom-space
                outlined
                :readonly="diff !== null || readonly"
                :bg-color="(isTextInCustomFields(field))?'red-1':'white'"
                :rules="(field.customField.required)? [val => !!val || 'Field is required', val => val && val.length > 0 || 'Field is required']: []"
                lazy-rules="ondemand"
                >
                    <template v-slot:control>
                        <q-option-group
                        type="checkbox"
                        v-model="field.text"
                        :options="getOptionsGroup(field.customField.options)"
                        />
                    </template>
                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                </q-field>

                
                <q-field
                :ref="`field-${idx}-${idx2}`"
                v-if="field.customField.fieldType === 'radio'"
                :label="field.customField.label"
                stack-label
                :value="field.text"
                :hint="field.description"
                hide-bottom-space
                outlined
                :readonly="diff !== null || readonly"
                :bg-color="(isTextInCustomFields(field))?'red-1':'white'"
                :rules="(field.customField.required)? [val => !!val || 'Field is required']: []"
                lazy-rules="ondemand"
                >
                    <template v-slot:control>
                        <q-option-group
                        type="radio"
                        v-model="field.text"
                        :options="getOptionsGroup(field.customField.options)"
                        />
                    </template>
                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                </q-field>
            </div>
        </div>
    </component>
</div>
</template>

<script>
import BasicEditor from 'components/editor';

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
        },
        readonly: {
            type: Boolean,
            default: true
        },
        locale: {
            type: String,
            default: ''
        }
    },

    data: function() {
        return {
            
        }
    },

    components: {
        BasicEditor
    },

    watch: { 
        readonly: function(readonly, readonlyOld) {
            if(!this.value) return;

            for(var i = 0; i < this.value.length; ++i) {
                this.setOptionsReadonly(this.value[i]);
            }
        }
    },

    computed: {
         computedFields: function() {
            var result = []
            var tmpArray = []
            this.value.forEach(e => {
                if (e.customField.fieldType === 'space' && e.customField.size === 12) { // full size space creates an empty component as separator
                    result.push(tmpArray)
                    result.push([])
                    tmpArray = []
                }
                else {
                    this.setOptionsReadonly(e);
                    tmpArray.push(e)
                }
            })
            if (tmpArray.length > 0)
                result.push(tmpArray)
            return result
        }
    },

    methods: {
        setOptionsReadonly: function(field) {
            if (field.customField.fieldType === "checkbox" || field.customField.fieldType === "radio" || field.customField.fieldType === "select-multiple")  {
                if(!field.customField.options) return;
                for(var j = 0; j < field.customField.options.length; ++j) {
                    field.customField.options[j]["disable"] = this.readonly;
                } 
            }
            
        },

        isTextInCustomFields: function(field) {
            if (this.diff) {
                return typeof this.diff.find(f => {
                    return f.customField._id === field.customField._id && this.$_.isEqual(f.text, field.text)
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
            return this.value.some(e => e.customField.fieldType !== 'space' && e.customField.required && (!e.text || e.text.length === 0))
        },

        getOptionsGroup: function(options) {
            return options
            .filter(e => e.locale === this.locale)
            .map(e => {return {label: e.value, value: e.value, disable: e.disable}})
        },

        test: function(val) {
            console.log(val)
        }
    }
}

</script>

<style>
</style>