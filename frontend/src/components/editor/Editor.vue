<template>
<q-card flat bordered class="editor full-width" :style="(editable)?'':'border: 1px dashed lightgrey'">
    <div v-sticky="!noAffix && !diff && editable" sticky-offset="affixOffset" class="bg-grey-4">
        <template v-if="editable">
            <q-toolbar data-testid="editor-toolbar" class="editor-toolbar">
                <div v-if="toolbar.indexOf('format') !== -1">
                    <q-tooltip :delay="500" class="text-bold">Text Format (Ctrl+Alt+[0-6])</q-tooltip>
                    <q-btn-dropdown size="sm" unelevated dense :icon="formatIcon" :label="formatLabel" style="width:42px" class="text-bold">
                        <q-list dense>
                            <q-item 
                            clickable 
                            :class="{ 'is-active': editor.isActive('paragraph') }" 
                            @click="editor.chain().focus().setParagraph().run()">
                                <q-item-section>
                                    <q-icon name="fa fa-paragraph" />
                                </q-item-section>
                            </q-item>
                            <q-item 
                            clickable 
                            :class="{ 'is-active': editor.isActive('heading', {level: 1}) }" 
                            @click="editor.chain().focus().setHeading({level: 1}).run()">
                                <q-item-section>H1</q-item-section>
                            </q-item>
                            <q-item 
                            clickable
                            :class="{ 'is-active': editor.isActive('heading', {level: 2}) }"
                            @click="editor.chain().focus().setHeading({level: 2}).run()">
                                <q-item-section>H2</q-item-section>
                            </q-item>
                            <q-item 
                            clickable
                            :class="{ 'is-active': editor.isActive('heading', {level: 3}) }"
                            @click="editor.chain().focus().setHeading({level: 3}).run()">
                                <q-item-section>H3</q-item-section>
                            </q-item>
                            <q-item 
                            clickable
                            :class="{ 'is-active': editor.isActive('heading', {level: 4}) }"
                            @click="editor.chain().focus().setHeading({level: 4}).run()">
                                <q-item-section>H4</q-item-section>
                            </q-item>
                            <q-item 
                            clickable
                            :class="{ 'is-active': editor.isActive('heading', {level: 5}) }"
                            @click="editor.chain().focus().setHeading({level: 5}).run()">
                                <q-item-section>H5</q-item-section>
                            </q-item>
                            <q-item 
                            clickable
                            :class="{ 'is-active': editor.isActive('heading', {level: 6}) }"
                            @click="editor.chain().focus().setHeading({level: 6}).run()">
                                <q-item-section>H6</q-item-section>
                            </q-item>
                        </q-list>
                    </q-btn-dropdown>
                </div>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('format') !== -1" />
                
                <div v-if="toolbar.indexOf('marks') !== -1">
                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': editor.isActive('bold') }"
                    @click="editor.chain().focus().toggleBold().run()"
                    >
                        <q-tooltip :delay="500" class="text-bold">Bold (Ctrl+B)</q-tooltip>
                        <q-icon name="format_bold" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': editor.isActive('italic') }"
                    @click="editor.chain().focus().toggleItalic().run()"
                    >
                        <q-tooltip :delay="500" class="text-bold">Italic (Ctrl+I)</q-tooltip>
                        <q-icon name="format_italic" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': editor.isActive('underline') }"
                    @click="editor.chain().focus().toggleUnderline().run()"
                    >
                        <q-tooltip :delay="500" class="text-bold">Underline (Ctrl+U)</q-tooltip>
                        <q-icon name="format_underline" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': editor.isActive('strike') }"
                    @click="editor.chain().focus().toggleStrike().run()"
                    >
                        <q-tooltip :delay="500" class="text-bold">Strikethrough (Ctrl+Shift+S)</q-tooltip>
                        <q-icon name="format_strikethrough" />
                    </q-btn>

                    <q-btn-dropdown flat size="sm" dense split menu-self="top left" menu-anchor="bottom left"
                    :class="{'is-active-highlight': editor.isActive('highlight')}"
                    @click="editor.chain().focus().toggleHighlight({color: highlightColor}).run()"
                    >
                        <template v-slot:label>
                            <q-tooltip :delay="500" class="text-bold">Highlight (Ctrl+Shift+H)</q-tooltip>
                            <i class="material-symbols-outlined q-icon" :style="{ 'color': highlightColor }">format_ink_highlighter</i>
                        </template>

                        <div class="row q-pa-xs" style="width: 144px; overflow: hidden">
                            <div class="q-gutter-xs">
                                <q-btn 
                                v-close-popup
                                v-for="color of highlightPalette" :key="color" 
                                square
                                :style="{'background-color': color, 'width': '24px', 'height': '24px'}"
                                @click="highlightColor = color; editor.chain().focus().setHighlight({color: highlightColor}).run()"
                                >
                                </q-btn>
                            </div>
                        </div>
                    </q-btn-dropdown>
                </div>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('marks') !== -1" />

                <div v-if="toolbar.indexOf('list') !== -1">
                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': editor.isActive('bulletList') }"
                    @click="editor.chain().focus().toggleBulletList().run()"
                    >
                        <q-tooltip :delay="500" class="text-bold">Bullets (Ctrl+Shift+8)</q-tooltip>
                        <q-icon name="format_list_bulleted" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': editor.isActive('orderedList') }"
                    @click="editor.chain().focus().toggleOrderedList().run()"
                    >
                        <q-tooltip :delay="500" class="text-bold">Numbering (Ctrl+Shift+7)</q-tooltip>
                        <q-icon name="format_list_numbered" />
                    </q-btn>
                </div>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('list') !== -1" />

                <div v-if="toolbar.indexOf('code') !== -1">
                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': editor.isActive('code') }"
                    @click="editor.chain().focus().toggleCode().run()"
                    >
                        <q-tooltip :delay="500" class="text-bold">Code (Ctrl+E)</q-tooltip>
                        <q-icon name="code" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': editor.isActive('codeBlock') }"
                    @click="editor.chain().focus().toggleCodeBlock().run()"
                    >
                        <q-tooltip :delay="500" class="text-bold">Code Block (Ctrl+Alt+C)</q-tooltip>
                        <q-icon name="mdi-console" />
                    </q-btn>
                </div>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('code') !== -1" />

                <template v-if="toolbar.indexOf('table') !== -1">
                    <q-separator vertical class="q-mx-sm" />
                    <div>
                        <q-btn flat size="sm" dense
                        @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
                        >
                            <q-tooltip :delay="500" class="text-bold">Insert Table</q-tooltip>
                            <q-icon name="mdi-table" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :disabled="!editor.can().addColumnAfter()"
                        @click="editor.chain().focus().addColumnAfter().run()"
                        >
                            <q-tooltip :delay="500" class="text-bold">Add Column</q-tooltip>
                            <q-icon name="mdi-table-column-plus-after" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :disabled="!editor.can().addRowAfter()"
                        @click="editor.chain().focus().addRowAfter().run()"
                        >
                            <q-tooltip :delay="500" class="text-bold">Add Row</q-tooltip>
                            <q-icon name="mdi-table-row-plus-after" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :disabled="!editor.can().mergeCells()"
                        @click="editor.chain().focus().mergeCells().run()"
                        >
                            <q-tooltip :delay="500" class="text-bold">Merge Cells</q-tooltip>
                            <q-icon name="mdi-call-merge" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :disabled="!editor.can().splitCell()"
                        @click="editor.chain().focus().splitCell().run()"
                        >
                            <q-tooltip :delay="500" class="text-bold">Split Cell</q-tooltip>
                            <q-icon name="mdi-call-split" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :disabled="!editor.can().deleteRow()"
                        @click="editor.chain().focus().deleteRow().run()"
                        >
                            <q-tooltip :delay="500" class="text-bold">Delete Row</q-tooltip>
                            <q-icon name="mdi-table-row-remove" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :disabled="!editor.can().deleteColumn()"
                        @click="editor.chain().focus().deleteColumn().run()"
                        >
                            <q-tooltip :delay="500" class="text-bold">Delete Column</q-tooltip>
                            <q-icon name="mdi-table-column-remove" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :disabled="!editor.can().deleteTable()"
                        @click="editor.chain().focus().deleteTable().run()"
                        >
                            <q-tooltip :delay="500" class="text-bold">Delete Table</q-tooltip>
                            <q-icon name="mdi-delete-table" />
                        </q-btn>
                    </div>
                </template>
                    
                <div v-if="toolbar.indexOf('image') !== -1">
                    <q-tooltip :delay="500" class="text-bold">Insert Image</q-tooltip>
                    <q-btn flat size="sm" dense>
                        <label class="cursor-pointer">
                            <input
                            type="file"
                            accept="image/*"
                            class="hidden"
                            @change="importImage($event.target.files)"
                            :disabled="!editable"
                            />
                            <q-icon name="image" />
                        </label>
                    </q-btn>
                </div>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('image') !== -1" />

                <div v-if="toolbar.indexOf('caption') !== -1">
                    <q-tooltip :delay="500" class="text-bold">Insert Caption</q-tooltip>
                    <q-btn-dropdown flat size="sm" dense icon="subtitles">
                        <q-list dense>
                            <q-item v-for="caption of $settings.report.public.captions" :key="caption" clickable v-close-popup @click="editor.chain().focus().setCaption({label: caption, alt: ''}).run()">
                                <q-item-section>{{caption}}</q-item-section>
                            </q-item>
                        </q-list>
                    </q-btn-dropdown>
                </div>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('caption') !== -1" />

                <q-btn flat size="sm" dense
                @click="editor.commands.undo"
                >
                    <q-tooltip :delay="500" class="text-bold">Undo (Ctrl+Z)</q-tooltip>
                    <q-icon name="undo" />
                </q-btn>

                <q-btn flat size="sm" dense
                @click="editor.commands.redo"
                >
                    <q-tooltip :delay="500" class="text-bold">Redo (Ctrl+Shift+Z)</q-tooltip>
                    <q-icon name="redo" />
                </q-btn>

                <template v-if="$settings?.report?.public?.enableSpellCheck">
                    <q-separator vertical class="q-mx-sm" />
                    <q-btn-dropdown flat size="sm" dense no-caps
                        :class="{'is-active': spellcheckStore.isActive(!!$settings?.report?.public?.enableSpellCheck)}"
                        @hide="onSpellcheckDropdownHide"
                    >
                        <template v-slot:label>
                            <q-tooltip :delay="500" class="text-bold">{{$t('spellcheck')}}</q-tooltip>
                            <q-icon name="spellcheck" />
                        </template>
                        <q-list dense style="min-width: 260px">
                            <q-item tag="label" dense>
                                <q-item-section avatar>
                                    <q-checkbox
                                        :model-value="spellcheckStore.isActive(!!$settings?.report?.public?.enableSpellCheck)"
                                        @update:model-value="toggleSpellcheck"
                                    />
                                </q-item-section>
                                <q-item-section>{{$t('enableSpellcheck')}}</q-item-section>
                            </q-item>
                            <template v-if="spellcheckStore.isActive(!!$settings?.report?.public?.enableSpellCheck)">
                                <q-separator />
                                <q-item-label header class="text-weight-bold">{{$t('spellcheckCategories')}}</q-item-label>
                                <q-item v-for="cat in spellcheckCategories" :key="cat.id" tag="label" dense>
                                    <q-item-section avatar>
                                        <q-checkbox
                                            :model-value="spellcheckStore.isCategoryEnabled(cat.id)"
                                            @update:model-value="toggleSpellcheckCategory(cat.id)"
                                        />
                                    </q-item-section>
                                    <q-item-section>
                                        <q-item-label>{{$t('spellcheckCategory.' + cat.id + '.label')}}</q-item-label>
                                        <q-item-label caption>{{$t('spellcheckCategory.' + cat.id + '.description')}}</q-item-label>
                                    </q-item-section>
                                </q-item>
                            </template>
                        </q-list>
                    </q-btn-dropdown>
                </template>

                <template v-if="commentMode">
                    <q-separator vertical class="q-mx-sm" />
                    <q-btn unelevated size="sm" dense color="deep-purple"
                    @click="editor.chain().focus().setComment(fieldName).run()"
                    >
                        <q-tooltip :delay="500" class="text-bold">Add Comment</q-tooltip>
                        <q-icon name="add_comment" />
                    </q-btn>
                </template>
            </q-toolbar>
        </template>
        <template v-if="diff !== undefined && (diff || modelValue) && modelValue !== diff">
            <q-toolbar data-testid="editor-toolbar" class="editor-toolbar">
                <q-btn flat size="sm" dense
                :class="{'is-active': toggleDiff}"
                label="toggle diff"
                @click="toggleDiff = !toggleDiff"
                />
            </q-toolbar>
        </template>
    </div>
    <q-separator />
    <bubble-menu
        class="bubble-menu"
        v-if="editor"
        :editor="editor"
        :tippy-options="{ placement: 'bottom', animation: 'fade' }"
        :should-show="({ editor }) => shouldShowSpellcheck({ editor })"
        >
        <section :class="['bubble-menu-section-container', matchIssueType ? 'lt-' + matchIssueType : '']">
            <section class="message-section">
                {{ matchMessage }}
            </section>
            <section class="suggestions-section">
                <article
                v-for="(replacement, i) in replacements"
                @click="() => acceptSuggestion(replacement)"
                :key="i + replacement.value"
                :class="['suggestion', i === 0 ? 'suggestion--primary' : 'suggestion--secondary']"
                >
                {{ replacement.value }}
                </article>
            </section>
            <section class="bubble-footer">
                <q-btn text-color="blue-grey" outline dense no-caps size="sm" icon="star" :label="$t('tooltip.addToDict')" @click="ignoreSuggestion" />
                <span v-if="matchCategory" class="category-section">{{ matchCategory }}</span>
            </section>
        </section>
    </bubble-menu>
    <editor-content v-if="typeof diff === 'undefined' || !toggleDiff" class="editor__content q-pa-sm" :editor="editor"/>
    <div v-else class="editor__content q-pa-sm">
        <div class="ProseMirror" v-html="diffContent"></div>
    </div>
</q-card>
</template>

<script>
// Import the editor
import { Editor, EditorContent, BubbleMenu, VueNodeViewRenderer } from '@tiptap/vue-3'

// Import Extensions
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Code from '@tiptap/extension-code'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import Underline from '@tiptap/extension-underline'
import CustomImage from './editor-image'
import Caption from './editor-caption'
import Comment from './editor-comment'
import CustomHighlight from './editor-highlight'
import TrailingNode from './editor-trailing-node'
import CodeBlockComponent from './editor-code-block'
import CommentExtension from './editor-comment-extension'

import { ref, computed } from 'vue'
import { LanguageTool } from './editor-spellcheck'
import { useSpellcheckStore, ALL_CATEGORIES } from '@/stores/spellcheck'

import {Diff} from 'diff';

import Utils from '@/services/utils'
import ImageService from '@/services/image'

import {common, createLowlight} from 'lowlight'
const lowlight = createLowlight(common)
lowlight.registerAlias('xml', ['html'])

export default {
    name: 'BasicEditor',
    props: {
        modelValue: String,
        editable: {
            type: Boolean,
            default: true
        },
        toolbar: {
            type: Array,
            default: function() {
                return ['format', 'marks', 'list', 'code', 'table', 'image', 'caption']
            }
        },
        noAffix: {
            type: Boolean,
            default: false
        },
        diff: String,
        disableDrop: {
            type: Boolean,
            default: false
        },
        noSync: {
            type: Boolean,
            default: false
        },
        fieldName: {
            type: String,
            default: ''
        },
        commentMode: {
            type: Boolean,
            default: false
        },
        commentIdList: {
            type: Array,
            default: function() {
                return []
            }
        },
        focusedComment: {
            type: String,
            default: ''
        }
    },
    components: {
        EditorContent,
        BubbleMenu
    },
    data() {
        const spellcheckStore = useSpellcheckStore()
        spellcheckStore.loadFromStorage()
        const globalSpellcheck = !!this.$settings?.report?.public?.enableSpellCheck
        const spellcheckActive = spellcheckStore.isActive(globalSpellcheck)

        return {
            spellcheckStore,
            spellcheckCategories: ALL_CATEGORIES,
            editor: new Editor({
                extensions: [
                    StarterKit.configure({
                        heading: {
                            levels: [1, 2, 3, 4, 5, 6]
                        },
                        codeBlock: false,
                        code: false
                    }),
                    Underline,
                    Table.configure({
                        resizable: true
                    }),
                    TableRow,
                    TableHeader,
                    TableCell,
                    CustomImage,
                    Caption,
                    Comment,
                    CustomHighlight.configure({
                        multicolor: true,
                    }),
                    TrailingNode.configure({
                        node: 'paragraph',
                        notAfter: ['paragraph', 'heading', 'bullet_list', 'ordered_list', 'code_block']
                    }),
                    CodeBlockLowlight.extend({
                        addNodeView() {
                            return VueNodeViewRenderer(CodeBlockComponent)
                        },
                        marks: "comment"
                    })
                    .configure({
                        lowlight,
                        defaultLanguage: 'plaintext',
                    }),
                    Code.extend({
                        excludes: "bold italic strike underline"
                    }),
                    CommentExtension,

                    LanguageTool.configure({
                        language: 'auto',
                        apiUrl: '/api/spellcheck',
                        automaticMode: spellcheckActive,
                        active: spellcheckActive,
                    })
                ],
                onUpdate: ({ getJSON, getHTML }) => {
                    if (this.noSync)
                        return
                    this.updateHTML()
                },
                enableInputRules: false,
                enablePasteRules: false
            }),
            json: '',
            html: '',
            toggleDiff: true,

            htmlEncode: Utils.htmlEncode,
            highlightColor: '#ffff25',
            highlightPalette: [
                '#ffff25', '#00ff41', '#00ffff', '#ff00f9', '#0005fd',
                '#ff0000', '#000177', '#00807a', '#008021', '#8e0075',
                '#8f0000', '#817d0c', '#807d78', '#c4c1bb', '#000000'
            ]
        }
    },

    watch: {
        modelValue (value) {
            if (value === this.editor.getHTML()) {
                return;
            }
            var content = this.htmlEncode(this.modelValue)
            this.editor.commands.setContent(content);

            if (this.commentMode)
                setTimeout(() => { 
                    this.handleFocusComment({detail: {id: this.focusedComment}})
                }, 200)
       },

        editable (value) {
            this.editor.setEditable(this.editable, false)
       },

        highlightColor (value) {
            this.editor.storage.highlight.color = value
       },

        focusedComment (value) {
            if (value && this.commentMode)
                setTimeout(() => { 
                    this.handleFocusComment({detail: {id: value}})
                }, 200)
        },

        commentMode (value) {
            this.handleFocusComment({detail: {id: this.focusedComment}})
        }
    },

    mounted: async function() {
        document.addEventListener('comment-deleted', this.handleDeleteComment)
        
        this.editor.setEditable(this.editable, false)

        if (typeof this.modelValue === "undefined" || this.modelValue === this.editor.getHTML()) {
            return;
        }
        var content = this.htmlEncode(this.modelValue)
        this.editor.commands.setContent(content)
        
        // Handle comments styling when initialized
        if (this.commentMode)
            this.handleFocusComment({detail: {id: this.focusedComment}})
    },

    beforeUnmount() {
        document.removeEventListener('comment-deleted', this.handleDeleteComment)
        this.editor.destroy()
    },

    computed: {
        affixOffset: function() {
            if (this.$route.name === "editFinding") {
                // Classic edit has tabs bar (.top-fixed) adding ~48px; retest does not
                const hasTabs = !!document.querySelector('.top-fixed')
                return {top: hasTabs ? 148 : 100, bottom: 40}
            }
            else if (this.$route.name === "editSection") {
                return {top: 100, bottom: 40}
            }
            else {
                return {top: 50, bottom: 40}
            }
        },

        matchMessage() {
            return this.editor.storage.languagetool.match?.message || 'No Message';
        },

        matchCategory() {
            const match = this.editor.storage.languagetool.match
            if (!match?.rule?.category) return null
            const id = match.rule.category.id
            const key = `spellcheckCategory.${id}.label`
            const translated = this.$t(key)
            return translated !== key ? translated : match.rule.category.name
        },

        matchIssueType() {
            return this.editor.storage.languagetool.match?.rule?.issueType || null
        },

        replacements() {
            return this.editor.storage.languagetool.match?.replacements || [];
        },

        formatIcon: function () {
            if (this.editor.isActive('paragraph')) 
                return 'fa fa-paragraph'
            else
                return null
        },

        formatLabel: function() {
            if (this.editor.isActive('heading', {level: 1})) return 'H1'
            else if (this.editor.isActive('heading', {level: 2})) return 'H2'
            else if (this.editor.isActive('heading', {level: 3})) return 'H3'
            else if (this.editor.isActive('heading', {level: 4})) return 'H4'
            else if (this.editor.isActive('heading', {level: 5})) return 'H5'
            else if (this.editor.isActive('heading', {level: 6})) return 'H6'
        },

        diffContent: function() {
            var content = ''
            if (typeof this.diff !== "undefined") {
                var HtmlDiff = new Diff(true);
                HtmlDiff.tokenize = function(value) {
                    return value.replace(/<code[^>]*>/g, "<code>").split(/([{}:;,.]|<p>|<\/p>|<pre><code>|<\/code><\/pre>|<[uo]l><li>.*<\/li><\/[uo]l>|\s+)/);
                }
                var value = this.modelValue || ""
                var diff = HtmlDiff.diff(this.diff, value)
                diff.forEach(part => {
                    const diffclass = part.added ? 'diffadd' : part.removed ? 'diffrem' : 'diffeq'
                    var value = part.value.replace(/<p><\/p>/g, '<p><br></p>')
                    if (part.added || part.removed) {
                        value = value
                        .replace(/(<p>)(.+?)(<\/p>|$)/g, `$1<span class="${diffclass}">$2</span>$3`) // Insert span diffclass in paragraphs
                        .replace(/(<pre><code>)(.+?)(<\/code><\/pre>|$)/g, `$1<span class="${diffclass}">$2</span>$3`) // Insert span diffclass in codeblocks
                        .replace(/(^[^<].*?)(<|$)/g, `<span class="${diffclass}">$1</span>$2`) // Insert span diffclass if text only
                    }
                    content += value
                })
            }
            return content
        }
    },

    methods: {
        importImage(files) {
            var file = files[0];
            var fileReader = new FileReader();

            var auditId = null
              var path = window.location.pathname.split('/')
              if (path && path.length > 3 && path[1] === 'audits')
                auditId = path[2]

            fileReader.onloadend = (e) => {
                Utils.resizeImg(fileReader.result)
                .then(data => {
                    return ImageService.createImage({value: data, name: file.name, auditId: auditId})
                })
                .then((data) => {
                    this.editor.chain().focus().setImage({src: data.data.datas._id, alt: file.name }).run()
                })
                .catch(err => console.log(err))
            }

            fileReader.readAsDataURL(file);
        },

        updateHTML() {
            this.json = this.editor.getJSON()
            this.html = this.editor.getHTML()
            if (Array.isArray(this.json.content) && this.json.content.length === 1 && !this.json.content[0].hasOwnProperty("content")) {
                this.html = ""
            }
            this.$emit('update:modelValue', this.html)
        },

        handleDeleteComment(event) {
            const commentId = event.detail.id
            this.editor.commands.unsetComment(commentId)
        },

        handleFocusComment(event) {
            const commentId = event.detail.id
            const { state } = this.editor

            let startPos = 0
            let nodeType = "" // or node to handle selection on focus

            state.doc.descendants((node, pos) => {
                if (!this.commentMode) {
                    if (node.marks.some(mark => mark.type.name === 'comment')) {
                        this.editor.chain().setTextSelection({from: pos, to: pos + node.nodeSize}).run()
                        this.editor.commands.updateAttributes('comment', {enabled: false, focused: false})
                    }
                    else if (node.attrs.commentId) {
                        this.editor.chain().setTextSelection({from: pos, to: pos + node.nodeSize}).run()
                        this.editor.commands.updateAttributes(node.type.name, {enabled: false, focused: false})
                    }
                }
                else if (node.isText) {
                    if (node.marks.some(mark => mark.type.name === 'comment' && mark.attrs.id === commentId)) {
                        nodeType = "text"
                        if (startPos === 0)
                            startPos = pos
                        this.editor.chain().setTextSelection({from: pos, to: pos + node.nodeSize}).run()
                        this.editor.commands.updateAttributes('comment', {enabled: true, focused: true})
                    }
                    else if (node.marks.some(mark => mark.type.name === 'comment' && this.commentIdList.includes(mark.attrs.id))) {
                        this.editor.chain().setTextSelection({from: pos, to: pos + node.nodeSize}).run()
                        this.editor.commands.updateAttributes('comment', {enabled: true, focused: false})
                    }
                    else if (node.marks.some(mark => mark.type.name === 'comment')) {
                        this.editor.chain().setTextSelection({from: pos, to: pos + node.nodeSize}).run()
                        this.editor.commands.updateAttributes('comment', {enabled: false, focused: false})
                    }
                }
                else if (node.attrs.commentId) {
                    this.editor.chain().setTextSelection({from: pos, to: pos + node.nodeSize}).run()
                    if (node.attrs.commentId === commentId) {
                        nodeType = "node"
                        if (startPos === 0)
                            startPos = pos
                        this.editor.commands.updateAttributes(node.type.name, {enabled: true, focused: true})
                    }
                    else if (this.commentIdList.includes(node.attrs.commentId)) {
                        this.editor.commands.updateAttributes(node.type.name, {enabled: true, focused: false})
                    }
                    else {
                        this.editor.commands.updateAttributes(node.type.name, {enabled: false, focused: false})
                    }
                    
                }
            })   
            
            if (nodeType) {
                if (nodeType === "text")
                    this.editor.chain().setTextSelection(startPos).run()
                else
                    this.editor.chain().setNodeSelection(startPos).run()
            }
        },

        shouldShowSpellcheck({ editor }) {
            const match = editor.storage.languagetool.match
            const matchRange = editor.storage.languagetool.matchRange

            if (!match || !matchRange) return false
            if (!editor.storage.languagetool.matchActivated) return false

            // Verify the decoration still exists — if it was removed (word accepted/ignored),
            // storage.match may be stale and the popup must not appear
            const decos = editor.storage.languagetool.decorationSet?.find(matchRange.from, matchRange.to)
            return !!decos && decos.length > 0
        },

        acceptSuggestion(sug) {
            const from = this.editor.storage.languagetool.matchRange.from
            this.editor.commands.removeCurrentMatchDecoration()
            this.editor.commands.insertContentAt(this.editor.storage.languagetool.matchRange, sug.value)
            this.editor.commands.resetLanguageToolMatch()
            this.editor.commands.setTextSelection(from)
        },

        ignoreSuggestion() {
            const from = this.editor.storage.languagetool.matchRange.from
            this.editor.commands.ignoreLanguageToolSuggestion()
            this.editor.commands.resetLanguageToolMatch()
            this.editor.commands.setTextSelection(from)
        },

        toggleSpellcheck() {
            const globalEnabled = !!this.$settings?.report?.public?.enableSpellCheck
            const currentlyActive = this.spellcheckStore.isActive(globalEnabled)
            this.spellcheckStore.setEnabled(!currentlyActive)
            this.editor.commands.toggleLanguageTool()
        },

        toggleSpellcheckCategory(categoryId) {
            this.spellcheckStore.toggleCategory(categoryId)
            this._spellcheckCategoryDirty = true
        },

        onSpellcheckDropdownHide() {
            if (this._spellcheckCategoryDirty) {
                this._spellcheckCategoryDirty = false
                this.editor.commands.proofread()
            }
        }
    }
}
</script>

<style lang="scss">
.editor {
    :focus {
        outline: none;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    p,
    ul,
    ol,
    pre,
    blockquote {
        &:first-child {
            margin-top: 0;
        }

        &:last-child {
            margin-bottom: 0;
        }
    }
}

.editor {
  &__content {

    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;

    .ProseMirror {
        min-height: 200px;
        cursor: auto;

        .lt {
            text-decoration-line: underline;
            text-decoration-style: wavy;
            text-decoration-color: #e86a69;

            transition: background 0.25s ease-in-out;

            &:hover {
                background: rgba( #e86a69, $alpha: 0.2);
            }

            &-style {
                text-decoration-color: #9d8eff;

                &:hover {
                    background: rgba( #9d8eff, $alpha: 0.2) !important;
                }
            }

            &-typographical,
            &-grammar {
                text-decoration-color: #eeb55c;

                &:hover {
                    background: rgba( #eeb55c, $alpha: 0.2) !important;
                }
            }

            &-misspelling {
                text-decoration-color: #e86a69;

                &:hover {
                    background: rgba( #e86a69, $alpha: 0.2) !important;
                }
            }
        }

        &-focused {
            outline: none !important;
        }
    }

    h1 {
        font-size: 4.25rem;
    }

    ul,
    ol {
      padding-left: 1rem;
    }

    li > p,
    li > ol,
    li > ul {
      margin: 0;
    }

    a {
      color: inherit;
    }

    blockquote {
      border-left: 3px solid rgba(black, 0.1);
      color: rgba(black, 0.8);
      padding-left: 0.8rem;
      font-style: italic;

      p {
        margin: 0;
      }
    }

    img {
      max-width: 100%;
      border-radius: 3px;
    }

    .selected {
        outline-style: solid;
        outline-color: $blue-4;
    }

    table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
      margin: 0;
      overflow: hidden;

      td, th {
        min-width: 1em;
        border: 2px solid grey;
        padding: 3px 5px;
        vertical-align: top;
        box-sizing: border-box;
        position: relative;
        > * {
          margin-bottom: 0;
        }
      }

      th {
        font-weight: bold;
        text-align: left;
      }

      .selectedCell:after {
        z-index: 2;
        position: absolute;
        content: "";
        left: 0; right: 0; top: 0; bottom: 0;
        background: rgba(200, 200, 255, 0.4);
        pointer-events: none;
      }

      .column-resize-handle {
        position: absolute;
        right: -2px; top: 0; bottom: 0;
        width: 4px;
        z-index: 20;
        background-color: #adf;
        pointer-events: none;
      }
    }

    .tableWrapper {
      margin: 1em 0;
      overflow-x: auto;
    }

    .resize-cursor {
      cursor: ew-resize;
      cursor: col-resize;
    }

    p code {
      padding: 0.2rem 0.4rem;
      /* border-radius: 5px; */
      font-size: 0.8rem;
      font-weight: bold;
      background: rgba(black, 0.1);
      color: rgba(black, 0.8);
    }

    pre {
        background: black;
        border-radius: 0.5rem;
        color: white;
        font-family: 'JetBrainsMono', monospace;
        margin: 1rem 0;
        padding: 0.75rem 1rem;

        &:last-child {
            margin-bottom: 1rem;
        }

        code {
            background: none;
            color: inherit;
            font-size: 0.8rem;
            padding: 0;
        }

        /* CodeBlock styling (atom-one-dark) */
        .hljs {
            color: #abb2bf;
            background: #282c34;
        }

        .hljs-comment,
        .hljs-quote {
            color: #5c6370;
            font-style: italic;
        }

        .hljs-doctag,
        .hljs-keyword,
        .hljs-formula {
            color: #c678dd;
        }

        .hljs-section,
        .hljs-name,
        .hljs-selector-tag,
        .hljs-deletion,
        .hljs-subst {
            color: #e06c75;
        }

        .hljs-literal {
            color: #56b6c2;
        }

        .hljs-string,
        .hljs-regexp,
        .hljs-addition,
        .hljs-attribute,
        .hljs-meta .hljs-string {
            color: #98c379;
        }

        .hljs-attr,
        .hljs-variable,
        .hljs-template-variable,
        .hljs-type,
        .hljs-selector-class,
        .hljs-selector-attr,
        .hljs-selector-pseudo,
        .hljs-number {
            color: #d19a66;
        }

        .hljs-symbol,
        .hljs-bullet,
        .hljs-link,
        .hljs-meta,
        .hljs-selector-id,
        .hljs-title {
            color: #61aeee;
        }

        .hljs-built_in,
        .hljs-title.class_,
        .hljs-class .hljs-title {
            color: #e6c07b;
        }

        .hljs-emphasis {
            font-style: italic;
        }

        .hljs-strong {
            font-weight: bold;
        }

        .hljs-link {
            text-decoration: underline;
        }
    }
  }
}
.is-active {
    color: green;
}
.is-active-highlight {
    background-color: grey;
}

.editor-toolbar {
    min-height: 32px;
}

.diffrem {
    background-color: #fdb8c0;
}
pre .diffrem {
    background-color: $red-6;
}

.diffadd {
    background-color: #acf2bd;
}
pre .diffadd {
    background-color: $green-6;
}

.text-negative .editor:not(.q-dark) {
    color:var(--q-color-primary)!important;
}

.comment-enabled {
    background-color: $bg-comment-enabled;
    color: $text-comment-enabled;
    opacity: 0.8;
    cursor: pointer;

    .editor-caption {
        background-color: $bg-comment-enabled;
    }
}

.comment-enabled.comment-focused{
    background-color: $bg-comment-focused!important;
    color: $text-comment-focused!important;
    cursor: unset;

    .editor-caption {
        background-color: $bg-comment-focused;
    }
}

.bubble-menu {
    visibility: visible !important;
}

.bubble-menu > .bubble-menu-section-container {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  border-radius: 8px;
  max-width: 380px;
  min-width: 200px;
  border-left: 3px solid transparent;

  &.lt-misspelling   { border-left-color: #e86a69; }
  &.lt-style         { border-left-color: #9d8eff; }
  &.lt-grammar,
  &.lt-typographical { border-left-color: #eeb55c; }

  .message-section {
    font-size: 0.9em;
    line-height: 1.45;
  }

  .suggestions-section {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;

    .suggestion {
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      padding: 3px 10px;
      font-size: 0.9em;
      transition: background-color 0.15s, color 0.15s;

      &--primary {
        background-color: #229afe;
        color: white;
        &:hover { background-color: #0d8ef0; }
      }
    }
  }

  .bubble-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 8px;
    padding-top: 6px;
  }

  .category-section {
    font-size: 0.8em;
  }
}

.body--light .bubble-menu > .bubble-menu-section-container {
  background-color: #ffffff;
  color: #212121;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);

  .suggestions-section .suggestion--secondary {
    background-color: #ddeeff;
    color: #1565c0;
    &:hover { background-color: #c5e0ff; }
  }

  .bubble-footer {
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }

  .category-section {
    color: rgba(0, 0, 0, 0.45);
  }
}

.body--dark .bubble-menu > .bubble-menu-section-container {
  background-color: #484848;
  color: #f0f0f0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.65);

  .suggestions-section .suggestion--secondary {
    background-color: rgba(34, 154, 254, 0.2);
    color: #90caf9;
    &:hover { background-color: rgba(34, 154, 254, 0.33); }
  }

  .bubble-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .category-section {
    color: rgba(255, 255, 255, 0.45);
  }
}

</style>
