<template>
<div>
    <component :is="customElement" v-for="field of displayFields" :key="field.label">
        <q-field 
        v-if="field.fieldType === 'Text'" 
        :label="field.label" 
        stack-label 
        borderless
        >
            <template v-slot:control>
                <basic-editor 
                ref="basiceditor_custom" 
                v-model="field.text" 
                :noSync="noSyncEditor"
                /> 
            </template>
        </q-field>

        <q-input
        v-if="field.fieldType === 'Input'"
        :label='field.label'
        stack-label
        v-model="field.text"
        />

        <q-select 
        v-if="field.fieldType === 'List'" 
        :label="field.label" 
        v-model="field.text"
        :options="optionsForCustomField(field.label)" 
        stack-label map-options options-sanitize />

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
        category: String,
        customElement: {
            type: String,
            default: 'div'
        },
        noSyncEditor: {
            type: Boolean,
            default: false
        },
        display: { // value should be 'vuln' or 'finding'
            type: String,
            default: ''
        },
        customFields: Array
    },

    data: function() {
        return {
            
        }
    },

    components: {
        BasicEditor
    },

    computed: {
        displayFields() {
            return this.value.filter(field =>
                (field.displayFinding && this.display === "finding") || 
                (field.displayVuln && this.display === "vuln") || 
                (field.displayCategory && field.displayCategory.includes(this.category))
            )
        }
    },

    methods: {
        // find a custom field by its label name
        optionsForCustomField: function(label){
            return this.customFields.find(f => f.label === label).values
        },
    }
}

</script>

<style>
</style>