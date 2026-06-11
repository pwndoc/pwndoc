<template>
<div>
    <component :is="customElement" v-for="(computedField,idx) of computedFields" :key="idx">
        <div class="row q-col-gutter-md">
            <div v-for="(field,idx2) of computedField" :key="idx2" :class="`col-12 col-md-${field.customField.size||12} offset-md-${field.customField.offset||0}`">
                <q-field
                :id="`field-${field.customField.label}`"
                :ref="`field-${idx}-${idx2}`"
                v-if="field.customField.fieldType === 'text'" 
                label-slot 
                stack-label 
                borderless
                :class="{
                    'bg-diffbackground': isTextInCustomFields(field),
                    'highlighted-border': fieldHighlighted == `field-${field.customField.label}` && commentMode
                }"
                class="basic-editor"
                :hint="field.customField.description"
                hide-bottom-space
                :rules="(field.customField.required)? [val => !!val || 'Field is required']: []"
                lazy-rules="ondemand"
                :model-value="field.text"
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
                        :ref="(el) => registerEditorRef(field.customField._id, el)"
                        v-model="field.text" 
                        :noSync="noSyncEditor"
                        :editable="!readonly"
                        :fieldName="`field-${field.customField.label}`"
                        :commentMode="commentMode && canCreateComment"
                        :focusedComment="focusedComment"
                        :commentIdList="commentIdList"
                        :showAiButton="showAiButton(field)"
                        :aiLoading="isAiLoading(field)"
                        @ai-click="triggerGenerateAi(field)"
                        /> 
                    </template>

                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                </q-field>

                <q-input
                :ref="`field-${idx}-${idx2}`"
                :for="`field-${field.customField.label}`"
                v-if="field.customField.fieldType === 'input'"
                :label='field.customField.label'
                stack-label
                v-model="field.text"
                :class="{'highlighted-border': fieldHighlighted == `field-${field.customField.label}` && commentMode}"
                :readonly="readonly"
                :bg-color="(isTextInCustomFields(field))?'diffbackground':null"
                :hint="field.customField.description"
                hide-bottom-space
                :rules="(field.customField.required)? [val => !!val || 'Field is required']: []"
                lazy-rules="ondemand"
                outlined
                >
                    <template v-slot:append>
                        <q-btn
                        v-if="showAiButton(field)"
                        class="all-pointer-events"
                        flat
                        size="sm"
                        dense
                        :loading="isAiLoading(field)"
                        :disable="readonly || isAiLoading(field)"
                        @click.stop="triggerGenerateAi(field)"
                        >
                            <q-tooltip :delay="500" class="text-bold">{{$t('aiChat.tooltip')}}</q-tooltip>
                            <q-icon name="smart_toy" />
                        </q-btn>
                    </template>
                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                    <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment(`field-${field.customField.label}`)">
                        <q-icon name="add_comment" size="xs" />
                    </q-badge>
                </q-input>

                <q-input
                :ref="`field-${idx}-${idx2}`"
                :for="`field-${field.customField.label}`"
                v-if="field.customField.fieldType === 'date'"
                :label='field.customField.label'
                stack-label
                v-model="field.text"
                :class="{'highlighted-border': fieldHighlighted == `field-${field.customField.label}` && commentMode}"
                :readonly="readonly"
                :bg-color="(isTextInCustomFields(field))?'diffbackground':null"
                :hint="field.customField.description"
                hide-bottom-space
                :rules="(field.customField.required)? [val => !!val || 'Field is required']: []"
                lazy-rules="ondemand"
                outlined
                >
                    <template v-slot:append>
                        <q-btn
                        v-if="showAiButton(field)"
                        class="all-pointer-events"
                        flat
                        size="sm"
                        dense
                        :loading="isAiLoading(field)"
                        :disable="readonly || isAiLoading(field)"
                        @click.stop="triggerGenerateAi(field)"
                        >
                            <q-tooltip :delay="500" class="text-bold">{{$t('aiChat.tooltip')}}</q-tooltip>
                            <q-icon name="smart_toy" />
                        </q-btn>
                        <q-icon name="event" class="cursor-pointer">
                        <q-popup-proxy ref="qDateProxyField" transition-show="scale" transition-hide="scale">
                            <q-date :readonly="readonly" first-day-of-week="1" mask="YYYY-MM-DD" v-model="field.text" @update:model-value="$refs.qDateProxyField.forEach(e => e.hide())" />
                        </q-popup-proxy>
                        </q-icon>
                    </template>
                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                    <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment(`field-${field.customField.label}`)">
                        <q-icon name="add_comment" size="xs" />
                    </q-badge>
                </q-input>

                <q-select
                :ref="`field-${idx}-${idx2}`"
                :id="`field-${field.customField.label}`"
                v-if="field.customField.fieldType === 'select'"
                :label="field.customField.label"
                stack-label
                :class="{'highlighted-border': fieldHighlighted == `field-${field.customField.label}` && commentMode}"
                v-model="field.text"
                :options="field.customField.options.filter(e => e.locale === locale)"
                option-value="value"
                option-label="value"
                emit-value
                clearable
                @clear="field.text = ''"
                options-sanitize
                outlined 
                :readonly="readonly"
                :bg-color="(isTextInCustomFields(field))?'diffbackground':null"
                :hint="field.customField.description"
                hide-bottom-space
                :rules="(field.customField.required)? [val => !!val || 'Field is required']: []"
                lazy-rules="ondemand"
                >
                     <template v-slot:append>
                        <q-btn
                        v-if="showAiButton(field)"
                        class="all-pointer-events"
                        flat
                        size="sm"
                        dense
                        :loading="isAiLoading(field)"
                        :disable="readonly || isAiLoading(field)"
                        @click.stop="triggerGenerateAi(field)"
                        >
                            <q-tooltip :delay="500" class="text-bold">{{$t('aiChat.tooltip')}}</q-tooltip>
                            <q-icon name="smart_toy" />
                        </q-btn>
                    </template>
                     <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                    <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment(`field-${field.customField.label}`)">
                        <q-icon name="add_comment" size="xs" />
                    </q-badge>
                </q-select>

                <q-select
                :ref="`field-${idx}-${idx2}`"
                :id="`field-${field.customField.label}`"
                v-if="field.customField.fieldType === 'select-multiple'"
                :label="field.customField.label"
                stack-label
                :class="{'highlighted-border': fieldHighlighted == `field-${field.customField.label}` && commentMode}"
                v-model="field.text"
                :options="field.customField.options.filter(e => e.locale === locale)"
                option-value="value"
                option-label="value"
                emit-value
                multiple
                use-chips
                clearable
                @clear="field.text = []"
                options-sanitize
                outlined 
                :readonly="readonly"
                :bg-color="(isTextInCustomFields(field))?'diffbackground':null"
                :hint="field.customField.description"
                hide-bottom-space
                :rules="(field.customField.required)? [val => !!val || 'Field is required', val => val && val.length > 0 || 'Field is required']: []"
                lazy-rules="ondemand"
                >
                     <template v-slot:append>
                        <q-btn
                        v-if="showAiButton(field)"
                        class="all-pointer-events"
                        flat
                        size="sm"
                        dense
                        :loading="isAiLoading(field)"
                        :disable="readonly || isAiLoading(field)"
                        @click.stop="triggerGenerateAi(field)"
                        >
                            <q-tooltip :delay="500" class="text-bold">{{$t('aiChat.tooltip')}}</q-tooltip>
                            <q-icon name="smart_toy" />
                        </q-btn>
                    </template>
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
                        :disable="readonly"
                        >
                            {{scope.opt}}
                        </q-chip>
                    </template>
                    <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment(`field-${field.customField.label}`)">
                        <q-icon name="add_comment" size="xs" />
                    </q-badge>
                </q-select>

                <q-field
                :id="`field-${field.customField.label}`"
                :ref="`field-${idx}-${idx2}`"
                v-if="field.customField.fieldType === 'checkbox'"
                :label="field.customField.label"
                stack-label
                :class="{'highlighted-border': fieldHighlighted == `field-${field.customField.label}` && commentMode}"
                :model-value="field.text"
                :hint="field.description"
                hide-bottom-space
                outlined
                :readonly="readonly"
                :bg-color="(isTextInCustomFields(field))?'diffbackground':null"
                :rules="(field.customField.required)? [val => !!val || 'Field is required', val => val && val.length > 0 || 'Field is required']: []"
                lazy-rules="ondemand"
                >
                    <template v-slot:append>
                        <q-btn
                        v-if="showAiButton(field)"
                        class="all-pointer-events"
                        flat
                        size="sm"
                        dense
                        :loading="isAiLoading(field)"
                        :disable="readonly || isAiLoading(field)"
                        @click.stop="triggerGenerateAi(field)"
                        >
                            <q-tooltip :delay="500" class="text-bold">{{$t('aiChat.tooltip')}}</q-tooltip>
                            <q-icon name="smart_toy" />
                        </q-btn>
                    </template>
                    <template v-slot:control>
                        <q-option-group
                        type="checkbox"
                        v-model="field.text"
                        :options="getOptionsGroup(field.customField.options)"
                        :disable="readonly"
                        :inline="field.customField.inline"
                        />
                    </template>
                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                    <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment(`field-${field.customField.label}`)">
                        <q-icon name="add_comment" size="xs" />
                    </q-badge>
                </q-field>

                
                <q-field
                :id="`field-${field.customField.label}`"
                :ref="`field-${idx}-${idx2}`"
                v-if="field.customField.fieldType === 'radio'"
                :label="field.customField.label"
                stack-label
                :class="{'highlighted-border': fieldHighlighted == `field-${field.customField.label}` && commentMode}"
                :model-value="field.text"
                :hint="field.description"
                hide-bottom-space
                outlined
                :readonly="readonly"
                :bg-color="(isTextInCustomFields(field))?'diffbackground':null"
                :rules="(field.customField.required)? [val => !!val || 'Field is required']: []"
                lazy-rules="ondemand"
                >
                    <template v-slot:append>
                        <q-btn
                        v-if="showAiButton(field)"
                        class="all-pointer-events"
                        flat
                        size="sm"
                        dense
                        :loading="isAiLoading(field)"
                        :disable="readonly || isAiLoading(field)"
                        @click.stop="triggerGenerateAi(field)"
                        >
                            <q-tooltip :delay="500" class="text-bold">{{$t('aiChat.tooltip')}}</q-tooltip>
                            <q-icon name="smart_toy" />
                        </q-btn>
                    </template>
                    <template v-slot:control>
                        <q-option-group
                        type="radio"
                        v-model="field.text"
                        :options="getOptionsGroup(field.customField.options)"
                        :disable="readonly"
                        :inline="field.customField.inline"
                        />
                    </template>
                    <template v-slot:label>
                        {{field.customField.label}} <span v-if="field.customField.required" class="text-red">*</span>
                    </template>
                    <q-badge v-if="commentMode && canCreateComment" color="deep-purple" floating class="cursor-pointer" @click="createComment(`field-${field.customField.label}`)">
                        <q-icon name="add_comment" size="xs" />
                    </q-badge>
                </q-field>
            </div>
        </div>
    </component>
</div>
</template>

<script>
import BasicEditor from 'components/editor/Editor.vue';
import AiFieldHelper from '@/services/ai-field-helper';

export default {
    name: 'custom-fields',
    props: {
        modelValue: Array,
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
            default: false
        },
        locale: {
            type: String,
            default: ''
        },
        commentMode: {
            type: Boolean,
            default: false
        },
        focusedComment: {
            type: String,
            default: ""
        },
        commentIdList: {
            type: Array,
            default: () => []
        },
        fieldHighlighted: {
            type: String,
            default: ""
        },
        createComment: {
            type: Function,
            default: () => {}
        },
        canCreateComment: {
            type: Boolean,
            default: false
        },
        aiEnabled: {
            type: Boolean,
            default: false
        },
        canGenerateAiForField: {
            type: Function,
            default: () => false
        },
        isAiGeneratingField: {
            type: Function,
            default: () => false
        },
        generateAiForField: {
            type: Function,
            default: () => {}
        }
    },

    data: function() {
        return {
            editorRefs: {}
        }
    },

    components: {
        BasicEditor
    },

    computed: {
         computedFields: function() {
            var result = []
            var tmpArray = []
            this.modelValue.forEach(e => {
                if (e.customField.fieldType === 'space' && e.customField.size === 12) { // full size space creates an empty component as separator
                    result.push(tmpArray)
                    result.push([])
                    tmpArray = []
                }
                else {
                    tmpArray.push(e)
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

        getAiFieldKey: function(field) {
            return `custom-field:${field.customField._id}`
        },

        showAiButton: function(field) {
            return this.aiEnabled && this.canGenerateAiForField(this.getAiFieldKey(field))
        },

        isAiLoading: function(field) {
            return this.isAiGeneratingField(this.getAiFieldKey(field))
        },

        triggerGenerateAi: function(field) {
            this.generateAiForField(field)
        },

        registerEditorRef: function(customFieldId, el) {
            if (!customFieldId)
                return
            if (el)
                this.editorRefs[customFieldId] = el
            else
                delete this.editorRefs[customFieldId]
        },

        getAiSelectionTarget: function(field) {
            const fieldType = field?.customField?.fieldType
            const customFieldId = field?.customField?._id

            if (fieldType === 'text') {
                const editor = this.editorRefs[customFieldId]
                return editor || null
            }

            if (fieldType === 'input') {
                const fieldRef = this.getFieldRef(field)
                if (!fieldRef)
                    return null

                return {
                    getTextSelection: () => AiFieldHelper.getInputSelection(fieldRef),
                    replaceTextSelection: (content, selection) => {
                        const el = fieldRef.$el?.querySelector('textarea, input')
                        if (!el || !selection)
                            return

                        const replacement = Array.isArray(content) ?
                            content.join('\n') :
                            String(content || '')
                        const value = el.value
                        field.text = value.substring(0, selection.start) + replacement + value.substring(selection.end)
                    }
                }
            }

            return null
        },

        getFieldRef: function(field) {
            const refs = Object.keys(this.$refs)
            .filter((key) => key.startsWith('field-'))
            .map((key) => this.$refs[key]?.[0])
            .filter(Boolean)

            return refs.find((ref) => {
                const el = ref.$el
                if (!el)
                    return false
                const label = el.getAttribute('for') || el.id || el.querySelector('[for]')?.getAttribute('for')
                return label === `field-${field.customField.label}`
            }) || null
        },

        validate: function() {
            Object.keys(this.$refs).forEach(key => key.startsWith('field') && this.$refs[key][0].validate())
        },

        requiredFieldsEmpty: function() {
            this.validate()
            return this.modelValue.some(e => e.customField.fieldType !== 'space' && e.customField.required && (!e.text || e.text.length === 0))
        },

        getOptionsGroup: function(options) {
            return options
            .filter(e => e.locale === this.locale)
            .map(e => {return {label: e.value, value: e.value}})
        }
    }
}

</script>

