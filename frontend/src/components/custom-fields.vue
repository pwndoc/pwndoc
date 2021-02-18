<template>
<div>
    <component :is="customElement" v-for="field of displayFields" :key="field.label">
        <q-field 
        v-if="field.fieldType === 'text'" 
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
        v-if="field.fieldType === 'input'"
        :label='field.label'
        stack-label
        v-model="field.text"
        />
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
        displayFields() {
            return this.value.filter(field =>
                (field.displayFinding && this.display === "finding") || 
                (field.displayVuln && this.display === "vuln") || 
                (field.displayCategory && field.displayCategory.includes(this.category))
            )
        }
    },

    methods: {
       
    }
}

</script>

<style>
</style>