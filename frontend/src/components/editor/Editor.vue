<template>
<q-card flat bordered class="editor full-width" :class="affixRelativeElement" :style="(editable)?'':'border: 1px dashed lightgrey'">
    <affix :relative-element-selector="'.'+affixRelativeElement" :offset="affixOffset" :enabled="!noAffix && !diff" class="bg-grey-4 editor-toolbar" v-if="editable || diff">
            <q-toolbar class="editor-toolbar">
                <template v-if="editable">
                    <div v-if="toolbar.indexOf('format') !== -1">
                        <q-tooltip :delay="500" content-class="text-bold">Text Format (Ctrl+Alt+[0-6])</q-tooltip>
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
                            <q-tooltip :delay="500" content-class="text-bold">Bold (Ctrl+B)</q-tooltip>
                            <q-icon name="format_bold" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :class="{ 'is-active': editor.isActive('italic') }"
                        @click="editor.chain().focus().toggleItalic().run()"
                        >
                            <q-tooltip :delay="500" content-class="text-bold">Italic (Ctrl+I)</q-tooltip>
                            <q-icon name="format_italic" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :class="{ 'is-active': editor.isActive('underline') }"
                        @click="editor.chain().focus().toggleUnderline().run()"
                        >
                            <q-tooltip :delay="500" content-class="text-bold">Underline (Ctrl+U)</q-tooltip>
                            <q-icon name="format_underline" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :class="{ 'is-active': editor.isActive('strike') }"
                        @click="editor.chain().focus().toggleStrike().run()"
                        >
                            <q-tooltip :delay="500" content-class="text-bold">Strikethrough (Ctrl+Shift+S)</q-tooltip>
                            <q-icon name="format_strikethrough" />
                        </q-btn>

                        <q-btn-dropdown flat size="sm" dense split menu-self="top left" menu-anchor="bottom left"
                        :class="{'is-active-highlight': editor.isActive('highlight')}"
                        @click="editor.chain().focus().toggleHighlight({color: highlightColor}).run()"
                        >
                            <template v-slot:label>
                                <q-tooltip :delay="500" content-class="text-bold">Highlight (Ctrl+Shift+H)</q-tooltip>
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
                            <q-tooltip :delay="500" content-class="text-bold">Bullets (Ctrl+Shift+8)</q-tooltip>
                            <q-icon name="format_list_bulleted" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :class="{ 'is-active': editor.isActive('orderedList') }"
                        @click="editor.chain().focus().toggleOrderedList().run()"
                        >
                            <q-tooltip :delay="500" content-class="text-bold">Numbering (Ctrl+Shift+7)</q-tooltip>
                            <q-icon name="format_list_numbered" />
                        </q-btn>
                    </div>
                    <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('list') !== -1" />

                    <div v-if="toolbar.indexOf('code') !== -1">
                        <q-btn flat size="sm" dense
                        :class="{ 'is-active': editor.isActive('code') }"
                        @click="editor.chain().focus().toggleCode().run()"
                        >
                            <q-tooltip :delay="500" content-class="text-bold">Code (Ctrl+E)</q-tooltip>
                            <q-icon name="code" />
                        </q-btn>

                        <q-btn flat size="sm" dense
                        :class="{ 'is-active': editor.isActive('codeBlock') }"
                        @click="editor.chain().focus().toggleCodeBlock().run()"
                        >
                            <q-tooltip :delay="500" content-class="text-bold">Code Block (Ctrl+Alt+C)</q-tooltip>
                            <q-icon name="mdi-console" />
                        </q-btn>
                    </div>
                    <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('code') !== -1" />
                        
                    <div v-if="toolbar.indexOf('image') !== -1">
                        <q-tooltip :delay="500" content-class="text-bold">Insert Image</q-tooltip>
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
                        <q-tooltip :delay="500" content-class="text-bold">Insert Caption</q-tooltip>
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
                        <q-tooltip :delay="500" content-class="text-bold">Undo (Ctrl+Z)</q-tooltip>
                        <q-icon name="undo" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    @click="editor.commands.redo"
                    >
                        <q-tooltip :delay="500" content-class="text-bold">Redo (Ctrl+Shift+Z)</q-tooltip>
                        <q-icon name="redo" />
                    </q-btn>

                    <template v-if="commentMode">
                        <q-separator vertical class="q-mx-sm" />
                        <q-btn unelevated size="sm" dense color="deep-purple""
                        @click="editor.chain().focus().setComment(fieldName).run()"
                        >
                            <q-tooltip :delay="500" content-class="text-bold">Add Comment</q-tooltip>
                            <q-icon name="add_comment" />
                        </q-btn>
                    </template>

                </template>
                <div v-if="diff !== undefined && (diff || value) && value !== diff">
                    <q-btn flat size="sm" dense
                    :class="{'is-active': toggleDiff}"
                    label="toggle diff"
                    @click="toggleDiff = !toggleDiff"
                    />
                </div>

            </q-toolbar>
    </affix>
    <q-separator />
    <editor-content v-if="typeof diff === 'undefined' || !toggleDiff" class="editor__content q-pa-sm" :editor="editor"/>
    <div v-else class="editor__content q-pa-sm">
        <div class="ProseMirror" v-html="diffContent"></div>
    </div>
</q-card>
</template>

<script>
// Import the editor
import { Editor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-2'

// Import Extensions
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Code from '@tiptap/extension-code'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import CustomImage from './editor-image'
import Caption from './editor-caption'
import Comment from './editor-comment'
import CustomHighlight from './editor-highlight'
import TrailingNode from './editor-trailing-node'
import CodeBlockComponent from './editor-code-block'

const Diff = require('diff')

import Utils from '@/services/utils'
import ImageService from '@/services/image'

import { lowlight } from 'lowlight'
lowlight.registerAlias('xml', ['html'])

export default {
    name: 'BasicEditor',
    props: {
        value: String,
        editable: {
            type: Boolean,
            default: true
        },
        toolbar: {
            type: Array,
            default: function() {
                return ['format', 'marks', 'list', 'code', 'image', 'caption']
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
        EditorContent
    },
    data() {
        return {
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
                    CustomImage.configure({inline: true}),
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
            affixRelativeElement: 'affix-relative-element',

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
        value (value) {
            if (value === this.editor.getHTML()) {
                return;
            }
            var content = this.htmlEncode(this.value)
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
            if (this.commentMode)
                this.handleFocusComment({detail: {id: this.focusedComment}})
        }
    },

    mounted: async function() {
        document.addEventListener('comment-deleted', this.handleDeleteComment)
        
        this.affixRelativeElement += '-'+Math.floor((Math.random()*1000000) + 1)
        this.editor.setEditable(this.editable, false)

        if (typeof this.value === "undefined" || this.value === this.editor.getHTML()) {
            return;
        }
        var content = this.htmlEncode(this.value)
        this.editor.commands.setContent(content)

        // Handle editor toolbar affix width and top position
        await this.$nextTick()
        // Width
        let editorElement = document.querySelector('.editor')
        if (editorElement) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    if (entry.target === editorElement && entry.contentRect.width !== 0) {
                        document.documentElement.style.setProperty("--affix-element-width", entry.contentRect.width+"px")
                    }
                }
            })
            resizeObserver.observe(editorElement)
        }
        // Top position
        if (this.$route.name === "editFinding") {
            document.documentElement.style.setProperty("--affix-top", "148px");
        }
        else if (this.$route.name === "editSection") {
            document.documentElement.style.setProperty("--affix-top", "98px");
        }
        else {
            document.documentElement.style.setProperty("--affix-top", "48px");
        }
        
        // Handle comments styling when initialized
        if (this.commentMode)
            this.handleFocusComment({detail: {id: this.focusedComment}})
    },

    beforeDestroy() {
        document.removeEventListener('comment-deleted', this.handleDeleteComment)
        this.editor.destroy()
    },

    computed: {
        affixOffset: function() {
            if (this.$route.name === "editFinding") {
                return {top: 150, bottom: 40}
            }
            else if (this.$route.name === "editSection") {
                return {top: 100, bottom: 40}
            }
            else {
                return {top: 50, bottom: 40}
            }
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
                var HtmlDiff = new Diff.Diff(true)
                HtmlDiff.tokenize = function(value) {
                    return value.replace(/<code[^>]*>/g, "<code>").split(/([{}:;,.]|<p>|<\/p>|<pre><code>|<\/code><\/pre>|<[uo]l><li>.*<\/li><\/[uo]l>|\s+)/);
                }
                var value = this.value || ""
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
            this.$emit('input', this.html)
        },

        handleDeleteComment(event) {
            const commentId = event.detail.id
            const { state } = this.editor

            state.doc.descendants((node, pos) => {
                if (node.marks.some(mark => mark.type.name === 'comment' && mark.attrs.id === commentId)) {
                    this.editor.chain().focus().setTextSelection({from: pos, to: pos + node.nodeSize}).run()
                    this.editor.commands.unsetComment()
                }
            })   
        },

        handleFocusComment(event) {
            const commentId = event.detail.id
            const { state } = this.editor

            let startPos = 0
            let endPos = 0
            let nodeType = "text" // or node to handle selection on focus

            state.doc.descendants((node, pos) => {
                if (!this.commentMode) {
                    this.editor.chain().setTextSelection({from: pos, to: pos + node.nodeSize}).run()
                    this.editor.commands.updateAttributes('comment', {enabled: false, focused: false})
                }
                else if (node.marks.some(mark => mark.type.name === 'comment' && mark.attrs.id === commentId)) {
                    startPos = pos
                    endPos = pos + node.nodeSize
                    if (node.type.name === 'image')
                        nodeType = "node"
                    this.editor.chain().setTextSelection({from: startPos, to: endPos}).run()
                    this.editor.commands.updateAttributes('comment', {enabled: true, focused: true})
                }
                else if (node.marks.some(mark => mark.type.name === 'comment' && this.commentIdList.includes(mark.attrs.id))) {
                    this.editor.chain().setTextSelection({from: pos, to: pos + node.nodeSize}).run()
                    this.editor.commands.updateAttributes('comment', {enabled: true, focused: false})
                }
                else {
                    this.editor.chain().setTextSelection({from: pos, to: pos + node.nodeSize}).run()
                    this.editor.commands.updateAttributes('comment', {enabled: false, focused: false})
                }
            })   
            
            if (startPos > 0 && endPos > 0) {
                if (nodeType === "text")
                    this.editor.chain().setTextSelection(startPos).run()
                else
                    this.editor.chain().setNodeSelection(startPos).run()
            }
        }
    }
}
</script>

<style lang="styl">
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

    .affix {
        width: var(--affix-element-width, "auto");
        border-bottom: 1px solid rgba(0,0,0,0.12);
        border-right: 1px solid rgba(0,0,0,0.12);
        top: var(--affix-top, 100px)!important;
        z-index: 1000;
        position: fixed;
    }

    .affix-top {
        top: unset!important;
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

comment .comment-enabled {
    background-color: $bg-comment-enabled;
    color: $text-comment-enabled;
    opacity: 0.8;

    .editor-caption {
        background-color: $bg-comment-enabled;
    }
}

comment .comment-enabled.comment-focused{
    background-color: $bg-comment-focused!important;
    color: $text-comment-focused!important;

    .editor-caption {
        background-color: $bg-comment-focused;
    }
}

</style>