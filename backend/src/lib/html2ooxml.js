var docx = require("docx")
var xml = require("xml")
var htmlparser = require("htmlparser2")
var domutils = require("domutils")
const render = require('dom-serializer').default
const hljs = require('highlight.js');

function html2ooxml(html, style = '') {
    if (html === '')
        return html
    if (!html.match(/^<.+>/))
        html = `<p>${html}</p>`
    html = html.replace(/<comment.*?>/g, '').replace(/<\/comment>/g, '') // Clean comment tags
    var doc = new docx.Document({sections:[]});
    var paragraphs = []
    var cParagraph = null
    var cRunProperties = {}
    var cParagraphProperties = {}
    var list_state = []
    var inCodeBlock = false
    var parser = new htmlparser.Parser(
    {
        onopentag(tag, attribs) {
            if (tag === "h1") {
                cParagraph = new docx.Paragraph({heading: 'Heading1'})
            }
            else if (tag === "h2") {
                cParagraph = new docx.Paragraph({heading: 'Heading2'})
            }
            else if (tag === "h3") {
                cParagraph = new docx.Paragraph({heading: 'Heading3'})
            }
            else if (tag === "h4") {
                cParagraph = new docx.Paragraph({heading: 'Heading4'})
            }
            else if (tag === "h5") {
                cParagraph = new docx.Paragraph({heading: 'Heading5'})
            }
            else if (tag === "h6") {
                cParagraph = new docx.Paragraph({heading: 'Heading6'})
            }
            else if (tag === "div" || tag === "p") {
                if (style && typeof style === 'string')
                    cParagraphProperties.style = style
                cParagraph = new docx.Paragraph(cParagraphProperties)
            }
            else if (tag === "pre") {
                inCodeBlock = true
                cParagraph = new docx.Paragraph({style: "Code"})
            }
            else if (tag === "b" || tag === "strong") {
                cRunProperties.bold = true
            }
            else if (tag === "i" || tag === "em") {
                cRunProperties.italics = true
            }
            else if (tag === "u") {
                cRunProperties.underline = {}
            }
            else if (tag === "strike" || tag === "s") {
                cRunProperties.strike = true
            }
            else if (tag === "mark") {
                var bgColor = attribs["data-color"] || "#ffff25"
                cRunProperties.highlight = getHighlightColor(bgColor)

                // Use text color if set (to handle white or black text depending on background color)
                var color = attribs.style.match(/.+color:.(.+)/)
                if (color && color[1]) cRunProperties.color = getTextColor(color[1])
            }
            else if (tag === "br") {
                if (inCodeBlock) {
                    paragraphs.push(cParagraph)
                    cParagraph = new docx.Paragraph({style: "Code"})
                }
                else
                    cParagraph.addChildElement(new docx.Run({break: 1}))
            }
            else if (tag === "ul") {
                list_state.push('bullet')
            }
            else if (tag === "ol") {
                list_state.push('number')
            }
            else if (tag === "li") {
                var level = list_state.length - 1
                if (level >= 0 && list_state[level] === 'bullet')
                    cParagraphProperties.bullet = {level: level}
                else if (level >= 0 && list_state[level] === 'number')
                    cParagraphProperties.numbering = {reference: 2, level: level}
                else
                    cParagraphProperties.bullet = {level: 0}
            }
            else if (tag === "code") {
                cRunProperties.style = "CodeChar"
            }
            else if (tag === "legend" && attribs && attribs.alt !== "undefined") {
                var label = attribs.label || "Figure"
                cParagraph = new docx.Paragraph({style: "Caption", alignment: docx.AlignmentType.CENTER})
                cParagraph.addChildElement(new docx.TextRun(`${label} `))
                cParagraph.addChildElement(new docx.SimpleField(`SEQ ${label}`, '1'))
                cParagraph.addChildElement(new docx.TextRun(` - ${attribs.alt}`))
            } else if (tag === "span" && inCodeBlock) {
                var hljsClassName = attribs["class"];

                if (hljsClassName === "hljs-doctag" || hljsClassName === "hljs-keyword" || hljsClassName === "hljs-formula") {
                    cRunProperties.color = "c678dd";
                } else if (hljsClassName === "hljs-section" || hljsClassName === "hljs-name" || hljsClassName === "hljs-selector-tag" || hljsClassName === "hljs-deletion" || hljsClassName === "hljs-subst") {
                    cRunProperties.color = "e06c75";
                } else if (hljsClassName === "hljs-literal") {
                    cRunProperties.color = "56b6c2";
                } else if (hljsClassName === "hljs-string" || hljsClassName === "hljs-regexp" || hljsClassName === "hljs-addition" || hljsClassName === "hljs-attribute") {
                    cRunProperties.color = "98c379";
                } else if (hljsClassName === "hljs-attr" || hljsClassName === "hljs-variable" || hljsClassName === "hljs-template-variable" || hljsClassName === "hljs-type" || hljsClassName === "hljs-selector-class" || hljsClassName === "hljs-selector-attr" || hljsClassName === "hljs-selector-pseudo" || hljsClassName === "hljs-number") {
                    cRunProperties.color = "d19a66";
                } else if (hljsClassName === "hljs-symbol" || hljsClassName === "hljs-bullet" || hljsClassName === "hljs-link" || hljsClassName === "hljs-meta" || hljsClassName === "hljs-selector-id" || hljsClassName === "hljs-title") {
                    cRunProperties.color = "61aeee";
                } else if (hljsClassName === "hljs-built_in" || hljsClassName === "hljs-class_" || hljsClassName === "hljs-class") {
                    cRunProperties.color = "e6c07b";
                } else if (hljsClassName === "hljs-comment" || hljsClassName === "hljs-quote") {
                    cRunProperties.color = "5c6370";
                    cRunProperties.italics = true;
                }
            }
        },

        ontext(text) {
            if (text && cParagraph) {
                cRunProperties.text = text
                cParagraph.addChildElement(new docx.TextRun(cRunProperties))
            }
        },

        onclosetag(tag) {
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p', 'pre', 'legend'].includes(tag)) {
                paragraphs.push(cParagraph)
                cParagraph = null
                cParagraphProperties = {}
                if (tag === 'pre')
                    inCodeBlock = false
            }
            else if (tag === "b" || tag === "strong") {
                delete cRunProperties.bold
            }
            else if (tag === "i" || tag === "em") {
                delete cRunProperties.italics
            }
            else if (tag === "u") {
                delete cRunProperties.underline
            }
            else if (tag === "strike" || tag === "s") {
                delete cRunProperties.strike
            }
            else if (tag === "mark") {
                delete cRunProperties.highlight
                delete cRunProperties.color
            }
            else if (tag === "ul" || tag === "ol") {
                list_state.pop()
                if (list_state.length === 0)
                    cParagraphProperties = {}
            }
            else if (tag === "code") {
                delete cRunProperties.style
            } else if (tag === "span" && inCodeBlock) {
                delete cRunProperties.color
                delete cRunProperties.italics
            }
        },

        onend() {
            doc.addSection({
                children: paragraphs
            })
        }
    }, { decodeEntities: true })

    var htmlObject = htmlparser.parseDocument(html);
    var codeObjects = domutils.getElementsByTagName('code', htmlObject);

    for (let codeIndex = 0; codeIndex < codeObjects.length; codeIndex++) {
        let codeClass = codeObjects[codeIndex].attribs.class
        let codeLanguage = (codeClass && codeClass.split('-')[1]) || 'plaintext'
        codeObjects[codeIndex].children[0] = htmlparser.parseDocument(hljs.highlight(codeObjects[codeIndex].children[0].data, {language: codeLanguage}).value);
    }

    // For multiline code blocks
    html = render(htmlObject).replace(/\n/g, '<br>')
    parser.write(html)
    parser.end()

    var prepXml = doc.documentWrapper.document.body.prepForXml({ stack: [] })
    var filteredXml = prepXml["w:body"].filter(e => {return e && Object.keys(e)[0] === "w:p"})
    var dataXml = xml(filteredXml)
    dataXml = dataXml.replace(/w:numId w:val="{2-0}"/g, 'w:numId w:val="2"') // Replace numbering to have correct value

    return dataXml
        
}
module.exports = html2ooxml

function getHighlightColor(hexColor) {
// <xsd:simpleType name="ST_HighlightColor">
//     <xsd:restriction base="xsd:string">
//         <xsd:enumeration value="yellow"/>
//         <xsd:enumeration value="green"/>
//         <xsd:enumeration value="cyan"/>
//         <xsd:enumeration value="magenta"/>
//         <xsd:enumeration value="blue"/>

//         <xsd:enumeration value="red"/>
//         <xsd:enumeration value="darkBlue"/>
//         <xsd:enumeration value="darkCyan"/>
//         <xsd:enumeration value="darkGreen"/>
//         <xsd:enumeration value="darkMagenta"/>

//         <xsd:enumeration value="darkRed"/>
//         <xsd:enumeration value="darkYellow"/>
//         <xsd:enumeration value="darkGray"/>
//         <xsd:enumeration value="lightGray"/>
//         <xsd:enumeration value="black"/>

//         <xsd:enumeration value="white"/>
//         <xsd:enumeration value="none"/>
//     </xsd:restriction>
// </xsd:simpleType>

    var colors = {
        '#ffff25': 'yellow',
        '#00ff41': 'green',
        '#00ffff': 'cyan',
        '#ff00f9': 'magenta',
        '#0005fd': 'blue',
        '#ff0000': 'red',
        '#000177': 'darkBlue',
        '#00807a': 'darkCyan',
        '#008021': 'darkGreen',
        '#8e0075': 'darkMagenta',
        '#8f0000': 'darkRed',
        '#817d0c': 'darkYellow',
        '#807d78': 'darkGray',
        '#c4c1bb': 'lightGray',
        '#000000': 'black'
    }
    return colors[hexColor] || "yellow"
}

function getTextColor(color) {
    var regex = /^#[0-9a-fA-F]{6}$/
    if (regex.test(color))
        return color.substring(1,7)
    
    return "000000" 
}