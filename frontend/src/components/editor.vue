<template>
<q-card flat bordered class="editor full-width" :class="affixRelativeElement">
    <affix :relative-element-selector="'.'+affixRelativeElement" :enabled="!noAffix">
        <editor-menu-bar :editor="editor" v-slot="{ commands, isActive }">
            <q-toolbar class="editor-toolbar">
                <div v-if="toolbar.indexOf('format') !== -1">
                    <q-btn-dropdown size="sm" unelevated dense :icon="formatIcon" :label="formatLabel" style="width:42px" class="text-bold">
                        <q-list dense>
                            <q-item 
                            clickable 
                            :class="{ 'is-active': isActive.paragraph() }" 
                            @click="commands.paragraph()">
                                <q-item-section>
                                    <q-icon name="fa fa-paragraph" />
                                </q-item-section>
                            </q-item>
                            <q-item 
                            clickable 
                            :class="{ 'is-active': isActive.heading({level: 1}) }" 
                            @click="commands.heading({level: 1})">
                                <q-item-section>H1</q-item-section>
                            </q-item>
                            <q-item 
                            clickable
                            :class="{ 'is-active': isActive.heading({level: 2}) }"
                            @click="commands.heading({level: 2})">
                                <q-item-section>H2</q-item-section>
                            </q-item>
                            <q-item 
                            clickable
                            :class="{ 'is-active': isActive.heading({level: 3}) }"
                            @click="commands.heading({level: 3})">
                                <q-item-section>H3</q-item-section>
                            </q-item>
                            <q-item 
                            clickable
                            :class="{ 'is-active': isActive.heading({level: 4}) }"
                            @click="commands.heading({level: 4})">
                                <q-item-section>H4</q-item-section>
                            </q-item>
                            <q-item 
                            clickable
                            :class="{ 'is-active': isActive.heading({level: 5}) }"
                            @click="commands.heading({level: 5})">
                                <q-item-section>H5</q-item-section>
                            </q-item>
                            <q-item 
                            clickable
                            :class="{ 'is-active': isActive.heading({level: 6}) }"
                            @click="commands.heading({level: 6})">
                                <q-item-section>H6</q-item-section>
                            </q-item>
                        </q-list>
                    </q-btn-dropdown>
                </div>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('format') !== -1" />
                
                <div v-if="toolbar.indexOf('marks') !== -1">
                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': isActive.bold() }"
                    @click="commands.bold"
                    >
                        <q-icon name="format_bold" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': isActive.italic() }"
                    @click="commands.italic"
                    >
                        <q-icon name="format_italic" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': isActive.underline() }"
                    @click="commands.underline"
                    >
                        <q-icon name="format_underline" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': isActive.strike() }"
                    @click="commands.strike"
                    >
                        <q-icon name="format_strikethrough" />
                    </q-btn>
                </div>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('marks') !== -1" />

                <div v-if="toolbar.indexOf('list') !== -1">
                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': isActive.bullet_list() }"
                    @click="commands.bullet_list"
                    >
                        <q-icon name="format_list_bulleted" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': isActive.ordered_list() }"
                    @click="commands.ordered_list"
                    >
                        <q-icon name="format_list_numbered" />
                    </q-btn>
                </div>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('list') !== -1" />

                <div v-if="toolbar.indexOf('code') !== -1">
                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': isActive.code() }"
                    @click="commands.code"
                    >
                        <q-icon name="code" />
                    </q-btn>

                    <q-btn flat size="sm" dense
                    :class="{ 'is-active': isActive.code_block() }"
                    @click="commands.code_block"
                    >
                        <q-icon name="mdi-console" />
                    </q-btn>
                </div>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('code') !== -1" />

                <label class="cursor-pointer" v-if="toolbar.indexOf('image') !== -1">
                    <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="importImage($event.target.files)"
                    />
                    <q-icon name="image" />
                </label>
                <q-separator vertical class="q-mx-sm" v-if="toolbar.indexOf('image') !== -1" />

                <q-btn flat size="sm" dense
                @click="commands.undo"
                >
                    <q-icon name="undo" />
                </q-btn>

                <q-btn flat size="sm" dense
                @click="commands.redo"
                >
                    <q-icon name="redo" />
                </q-btn>

                <q-separator vertical class="q-mx-sm" v-if="diff !== undefined && (diff || value) && value !== diff" />
                <div v-if="diff !== undefined && (diff || value) && value !== diff">
                    <q-btn flat size="sm" dense
                    :class="{'is-active': toggleDiff}"
                    label="toggle diff"
                    @click="toggleDiff = !toggleDiff"
                    />
                </div>

            </q-toolbar>
            <!-- <q-separator /> -->
        </editor-menu-bar>
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
import { Editor, EditorContent, EditorMenuBar } from "tiptap"
import {
  Blockquote,
  CodeBlock,
  HardBreak,
  Heading,
  OrderedList,
  BulletList,
  ListItem,
  Bold,
  Code,
  Italic,
  Strike,
  Underline,
  History,
  TrailingNode
} from 'tiptap-extensions'

import CustomImage from './editor-image'

const Diff = require('diff')

import Utils from '@/services/utils'
import ImageService from '@/services/image'

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
                return ['format', 'marks', 'list', 'code', 'image']
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
        }
    },
    components: {
        EditorContent,
        EditorMenuBar
    },
    data() {
        return {
            editor: new Editor({
                editable: this.editable,
                extensions: [
                    new Blockquote(),
                    new BulletList(),
                    new CodeBlock(),
                    new HardBreak(),
                    new Heading({ levels: [1, 2, 3, 4, 5, 6] }),
                    new ListItem(),
                    new OrderedList(),
                    new Bold(),
                    new Code(),
                    new Italic(),
                    new Strike(),
                    new Underline(),
                    new History(),
                    new CustomImage(),
                    new TrailingNode({node: 'paragraph', notAfter: ['paragraph', 'heading', 'bullet_list', 'ordered_list', 'code_block']})
                ],
                onUpdate: ({ getJSON, getHTML }) => {
                    if (this.noSync)
                        return
                    this.updateHTML()
                },
                disableInputRules: true,
                disablePasteRules: true
            }),
            json: '',
            html: '',
            toggleDiff: true,
            affixRelativeElement: 'affix-relative-element',

            htmlEncode: Utils.htmlEncode
        }
    },

    watch: {
       value (value) {
            if (value === this.editor.getHTML()) {
                return;
            }
            var content = this.htmlEncode(this.value)
            this.editor.setContent(content);
       }
    },

    mounted: function() {
        this.affixRelativeElement += '-'+Math.floor((Math.random()*1000000) + 1)
        if (typeof this.value === "undefined" || this.value === this.editor.getHTML()) {
            return;
        }
        var content = this.htmlEncode(this.value);
        this.editor.setContent(content);
        this.editor.setOptions({
            editable: this.editable,
        });
    },

    beforeDestroy() {
        this.editor.destroy()
    },

    computed: {
        formatIcon: function () {
            if (this.editor.isActive.paragraph()) 
                return 'fa fa-paragraph'
            else
                return null
        },

        formatLabel: function() {
            if (this.editor.isActive.heading({level: 1})) return 'H1'
            else if (this.editor.isActive.heading({level: 2})) return 'H2'
            else if (this.editor.isActive.heading({level: 3})) return 'H3'
            else if (this.editor.isActive.heading({level: 4})) return 'H4'
            else if (this.editor.isActive.heading({level: 5})) return 'H5'
            else if (this.editor.isActive.heading({level: 6})) return 'H6'
        },

        diffContent: function() {
            var content = ''
            if (typeof this.diff !== "undefined") {
                var HtmlDiff = new Diff.Diff(true)
                HtmlDiff.tokenize = function(value) {
                    return value.split(/([{}:;,.]|<p>|<\/p>|<pre><code>|<\/code><\/pre>|<[uo]l><li>.*<\/li><\/[uo]l>|\s+)/);
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
                    this.editor.commands.image({src: data.data.datas._id, alt: file.name })
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

    .affix {
        width: auto;
        border-bottom: 1px solid rgba(0,0,0,0.12);
        border-right: 1px solid rgba(0,0,0,0.12);
        background-color: white;
        top: 50px!important;
        z-index: 1000
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

    pre {
      padding: 0.7rem 1rem;
      border-radius: 5px;
      background: black;
      color: white;
      font-size: 0.8rem;
      overflow-x: auto;
      white-space: pre-wrap;

      code {
        display: block;
      }
    }

    p code {
      padding: 0.2rem 0.4rem;
      border-radius: 5px;
      font-size: 0.8rem;
      font-weight: bold;
      background: rgba(black, 0.1);
      color: rgba(black, 0.8);
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

  }
}
.is-active {
    color: green;
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
</style>