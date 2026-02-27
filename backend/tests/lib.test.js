module.exports = function () {
  var html2ooxml = require("../src/lib/html2ooxml")
  var utils = require("../src/lib/utils")
  var reportFilters = require("../src/lib/report-filters")
  var customGenerator = require("../src/lib/custom-generator")

  describe('Lib functions Suite Tests', () => {

    describe('Name format validation tests', () => {
      it('Valid Filename', () => {
        var filename = "Vulnerability 1"
        var result = utils.validFilename(filename)
        expect(result).toEqual(true)
      })

      it('Valid Latin Filename', () => {
        var filename = "Vulnerabilité 1"
        var result = utils.validFilename(filename)
        expect(result).toEqual(true)
      })

      it('Valid Latvian Filename', () => {
        var filename = "Pažeidžiamumas 1"
        var result = utils.validFilename(filename)
        expect(result).toEqual(true)
      })

      it('Valid Filename with special chars', () => {
        var filename = "Vulnerability_1-test"
        var result = utils.validFilename(filename)
        expect(result).toEqual(true)
      })

      it('Invalid Filename', () => {
        var filename = "<Vulnerability> 1"
        var result = utils.validFilename(filename)
        expect(result).toEqual(false)
      })
    })

    describe('html2ooxml tests', () => {
      it('Simple Paragraph', () => {
        var html = "<p>Paragraph Text</p>"
        var expected = `<w:p><w:r><w:t xml:space="preserve">Paragraph Text</w:t></w:r></w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Text without tag', () => {
        var html = "Paragraph Text"
        var expected = `<w:p><w:r><w:t xml:space="preserve">Paragraph Text</w:t></w:r></w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Bold without wrapping paragraph', () => {
        var html = "<b>Paragraph Bold</b>"
        var expected = ""
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Bold', () => {
        var html = "<p>Paragraph <b>Bold</b></p>"
        var expected =
        `<w:p>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Paragraph </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:b/>`+
              `<w:bCs/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">Bold</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Italic', () => {
        var html = "<p>Paragraph <i>Italic</i></p>"
        var expected =
        `<w:p>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Paragraph </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:i/>`+
              `<w:iCs/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">Italic</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Underline', () => {
        var html = "<p>Paragraph <u>Underline</u></p>"
        var expected =
        `<w:p>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Paragraph </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:u w:val="single"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">Underline</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Strike', () => {
        var html = "<p>Paragraph <s>Strike</s></p>"
        var expected =
        `<w:p>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Paragraph </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:strike/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">Strike</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Bold and Italics', () => {
        var html = "<p>Paragraph <b><i>Mark</i></b></p>"
        var expected =
        `<w:p>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Paragraph </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:b/>`+
              `<w:bCs/>`+
              `<w:i/>`+
              `<w:iCs/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">Mark</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('All marks', () => {
        var html = "<p>Paragraph <b><i><u><s>Mark</s></u></i></b></p>"
        var expected =
        `<w:p>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Paragraph </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:b/>`+
              `<w:bCs/>`+
              `<w:i/>`+
              `<w:iCs/>`+
              `<w:strike/>`+
              `<w:u w:val="single"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">Mark</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Heading 1', () => {
        var html = "<h1>Heading</h1>"
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="Heading1"/>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Heading</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Heading 2', () => {
        var html = "<h2>Heading</h2>"
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="Heading2"/>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Heading</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Heading 3', () => {
        var html = "<h3>Heading</h3>"
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="Heading3"/>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Heading</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Heading 4', () => {
        var html = "<h4>Heading</h4>"
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="Heading4"/>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Heading</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Heading 5', () => {
        var html = "<h5>Heading</h5>"
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="Heading5"/>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Heading</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Heading 6', () => {
        var html = "<h6>Heading</h6>"
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="Heading6"/>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Heading</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Simple Bullets', () => {
        var html = 
        `<ul>`+
          `<li>`+
            `<p>Bullet1</p>`+
          `</li>`+
          `<li>`+
            `<p>Bullet2</p>`+
          `</li>`+
        `</ul>`
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="0"/>`+
              `<w:numId w:val="1"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Bullet1</w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="0"/>`+
              `<w:numId w:val="1"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Bullet2</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Simple Bullets without ul tag', () => {
        var html = 
        `<li>`+
          `<p>Bullet1</p>`+
        `</li>`+
        `<li>`+
          `<p>Bullet2</p>`+
        `</li>`
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="0"/>`+
              `<w:numId w:val="1"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Bullet1</w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="0"/>`+
              `<w:numId w:val="1"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Bullet2</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Nested Bullets', () => {
        var html =
        `<ul>`+
          `<li>`+
            `<p>Bullet1</p>`+
          `</li>`+
          `<ul>`+
            `<li>`+
              `<p>BulletNested</p>`+
            `</li>`+
          `</ul>`+
          `<li>`+
            `<p>Bullet2</p>`+
          `</li>`+
        `</ul>`
        var expected = 
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="0"/>`+
              `<w:numId w:val="1"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Bullet1</w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="1"/>`+
              `<w:numId w:val="1"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">BulletNested</w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="0"/>`+
              `<w:numId w:val="1"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Bullet2</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Simple Numbering', () => {
        var html =
        `<ol>`+
          `<li>`+
            `<p>Number1</p>`+
          `</li>`+
          `<li>`+
            `<p>Number2</p>`+
          `</li>`+
        `</ol>`
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="0"/>`+
              `<w:numId w:val="2"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Number1</w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="0"/>`+
              `<w:numId w:val="2"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Number2</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Nested Numbering', () => {
        var html =
        `<ol>`+
          `<li>`+
            `<p>Number1</p>`+
          `</li>`+
          `<ol>`+
            `<li>`+
              `<p>NumberNested</p>`+
            `</li>`+
          `</ol>`+
          `<li>`+
            `<p>Number2</p>`+
          `</li>`+
        `</ol>`
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="0"/>`+
              `<w:numId w:val="2"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Number1</w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="1"/>`+
              `<w:numId w:val="2"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">NumberNested</w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="ListParagraph"/>`+
            `<w:numPr>`+
              `<w:ilvl w:val="0"/>`+
              `<w:numId w:val="2"/>`+
            `</w:numPr>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Number2</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Break', () => {
        var html = "<p>Paragraph<br>Break</p>"
        var expected =
        `<w:p>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Paragraph</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:br/>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Break</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('Break with newline', () => {
        var html = "<p>Paragraph\nBreak</p>"
        var expected =
        `<w:p>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Paragraph</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:br/>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Break</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

      it('CodeBlock', () => {
        var html = "<pre><code>Code Block</code></pre>"
        var expected =
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="Code"/>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:rStyle w:val="CodeChar"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">Code Block</w:t>`+
          `</w:r>`+
        `</w:p>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })

    })

    describe('Syntax highlight tests', () => {
      it('Code', () => {
        const hljs = require('highlight.js');
        var html = "<p>Paragraph <pre>" +
          hljs.highlight(
            "// Using require\n" +
            "const hljs = require('highlight.js');" +
            "\n" +
            "const highlightedCode = hljs.highlight(" +
            "  '<span>Hello World!</span>'," +
            "  { language: 'xml' }" +
            ").value", {language: 'javascript'}
          ).value +
          "</pre> Paragraph</p>";

        var expected = 
        `<w:p>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Paragraph </w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="Code"/>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:i/>`+
              `<w:iCs/>`+
              `<w:color w:val="5c6370"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">// Using require</w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="Code"/>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="c678dd"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">const</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve"> hljs = </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="e6c07b"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">require</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve">(</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">&apos;</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">highlight.js</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">&apos;</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve">);</w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p>`+
          `<w:pPr>`+
            `<w:pStyle w:val="Code"/>`+
          `</w:pPr>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="c678dd"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">const</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve"> highlightedCode = hljs.</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve">highlight</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve">(  </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">&apos;</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">&lt;</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">span</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">&gt;</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">Hello World!</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">&lt;</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">/span</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">&gt;</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">&apos;</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve">,  { </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="d19a66"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">language</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve">: </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">&apos;</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">xml</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:color w:val="98c379"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">&apos;</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve"> }).</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve">value</w:t>`+
          `</w:r>`+
        `</w:p>`+
        `<w:p/>`
        var ooxml = html2ooxml(html)
        expect(ooxml).toEqual(expected)
      })
    })

    describe('report-filters tests', () => {
      var defaultFilters = reportFilters.defaultFilters
      var subTemplatingFilters = reportFilters.subTemplatingFilters

      it('bookmark filters sanitize identifiers', () => {
        var bookmark = defaultFilters.bookmarkCreate("hello", "id/unsafe?name")
        expect(bookmark).toContain('w:name="id_unsafe_name"')

        var link = defaultFilters.bookmarkLink("text", "id/unsafe?name")
        expect(link).toContain('w:anchor="id_unsafe_name"')

        var ref = defaultFilters.bookmarkRef("id/unsafe?name")
        expect(ref).toContain('REF id_unsafe_name')
      })

      it('date filters and fallback filters behave as expected', () => {
        expect(defaultFilters.convertDate("2026-02-25T00:00:00.000Z", "short")).toBe("02/25/2026")
        expect(defaultFilters.convertDateLocale("2026-02-25T00:00:00.000Z", "en-US", "full")).toContain("2026")
        expect(defaultFilters.changeID("IDX-005", "PRJ-")).toBe("PRJ-005")
        expect(defaultFilters.d("", "fallback")).toBe("fallback")
      })

      it('fromTo and grouping helpers', () => {
        var sameDay = defaultFilters.fromTo("2026-02-25T00:00:00.000Z", "2026-02-25T00:00:00.000Z", "en-US")
        expect(sameDay).toContain("on")

        var grouped = defaultFilters.groupBy([{severity: "High", id: 1}, {severity: "Low", id: 2}], "severity")
        expect(grouped).toEqual([
          {key: "High", value: [{severity: "High", id: 1}]},
          {key: "Low", value: [{severity: "Low", id: 2}]}
        ])
      })

      it('string helper filters', () => {
        expect(subTemplatingFilters.capfirst("test")).toBe("Test")
        expect(subTemplatingFilters.initials("John Doe")).toBe("J. D.")
        expect(subTemplatingFilters.join(["a", "b"], ", ")).toBe("a, b")
        expect(subTemplatingFilters.length(["a", "b"])).toBe(2)
        expect(subTemplatingFilters.lower("TeSt")).toBe("test")
        expect(subTemplatingFilters.upper("TeSt")).toBe("TEST")
        expect(subTemplatingFilters.title("john doe")).toBe("John Doe")
      })

      it('line/link/object and mapping filters', () => {
        expect(defaultFilters.lines("<p>a</p><p>b</p>")).toEqual(["a", "b"])
        expect(defaultFilters.lines("a\nb")).toEqual(["a", "b"])
        expect(defaultFilters.mailto("john@example.com")).toContain('mailto:john@example.com')
        expect(defaultFilters.linkTo("Open", "https://example.com?a=1&b=2")).toContain("HYPERLINK")
        expect(defaultFilters.loopObject({a: 1, b: 2})).toEqual([{key: "a", value: 1}, {key: "b", value: 2}])
        expect(defaultFilters.map(["IDX-1", "IDX-2"], "changeID", "PRJ-")).toEqual(["PRJ-1", "PRJ-2"])
      })

      it('paragraph and raw filters', () => {
        var nl = defaultFilters.NewLines("line1\nline2")
        expect(nl).toContain("<w:br/>")
        expect(defaultFilters.p("<w:r><w:t>text</w:t></w:r>", "My style")).toContain('w:val="Mystyle"')
        expect(defaultFilters.reverse(["a", "b"])).toEqual(["b", "a"])
        expect(defaultFilters.s("raw")).toContain('xml:space="preserve"')
      })

      it('select, sort and serialization filters', () => {
        var entries = [{name: "z", nested: {score: "2"}}, {name: "a", nested: {score: "10"}}]
        expect(defaultFilters.select(entries, "nested.score")).toEqual(["2", "10"])
        expect(defaultFilters.sort(["b", "a"])).toEqual(["a", "b"])
        expect(defaultFilters.sortArrayByField(entries, "nested.score", -1).map(e => e.nested.score)).toEqual(["10", "2"])
        expect(defaultFilters.toJSON({ok: true})).toBe('{"ok":true}')
      })

      it('where/convertHTML/count/translate filters', () => {
        var filtered = defaultFilters.where(
          [{cvss: {severity: "Critical"}}, {cvss: {severity: "Low"}}],
          'cvss.severity == "Critical"'
        )
        expect(filtered).toHaveLength(1)

        expect(defaultFilters.convertHTML("<p>Hello</p>")).toContain("Hello")
        expect(defaultFilters.count(
          [{cvss: {environmentalSeverity: "High"}}, {cvss: {environmentalSeverity: "Low"}}],
          "High",
          "environmental"
        )).toBe(1)
        expect(defaultFilters.translate("No Category", "en")).toBe("No Category")
      })
    })

    describe('custom-generator filter tests', () => {
      it('criteriaFR converts known and unknown values', () => {
        expect(customGenerator.expressions.filters.criteriaFR("Network")).toBe("Réseau")
        expect(customGenerator.expressions.filters.criteriaFR("Unknown")).toBe("Non défini")
      })

      it('convertDateFR returns short and full formats', () => {
        var short = customGenerator.expressions.filters.convertDateFR("2026-02-25T00:00:00.000Z", "short")
        var full = customGenerator.expressions.filters.convertDateFR("2026-02-25T00:00:00.000Z", "full")
        expect(short).toBe("25/02/2026")
        expect(full).toContain("2026")
      })
    })

    describe('report-generator document assembly tests', () => {
      var baseSettings = {
        report: {
          private: { imageBorder: true, imageBorderColor: '#ABCDEF' },
          public: {
            cvssColors: {
              noneColor: '#4A86E8',
              lowColor: '#008000',
              mediumColor: '#f9a009',
              highColor: '#fe0000',
              criticalColor: '#212121'
            },
            scoringMethods: { CVSS3: true, CVSS4: true }
          }
        }
      }

      function buildAuditFixture() {
        return {
          name: 'Generator Audit',
          auditType: 'Web',
          language: 'en',
          date: '2026-02-25',
          date_start: '2026-02-24',
          date_end: '2026-02-26',
          template: { name: 'Report Test', ext: 'docx' },
          scope: { toObject: () => ['scope-a', 'scope-b'] },
          company: { name: 'Acme', logo: 'data:image/png;base64,QUFB' },
          client: { email: 'client@example.com', firstname: 'Jane', lastname: 'Doe' },
          creator: { username: 'admin', firstname: 'Admin', lastname: 'User', email: 'admin@example.com', phone: '111', role: 'admin' },
          reviewers: [{ username: 'reviewer', firstname: 'Rev', lastname: 'Iewer', email: 'rev@example.com', phone: '222', role: 'reviewer' }],
          collaborators: [{ username: 'collab', firstname: 'Co', lastname: 'Llab', email: 'col@example.com', phone: '333', jobTitle: 'Consultant', role: 'user' }],
          customFields: [
            {
              customField: { fieldType: 'text', label: 'Executive Summary' },
              text: '<p>Summary paragraph</p><img src="img-ok" alt="Summary image">'
            },
            {
              customField: { fieldType: 'input', label: 'Tracking ID' },
              text: 'TRK-001'
            },
            {
              customField: { fieldType: 'space', label: 'Spacer' },
              text: ''
            }
          ],
          findings: [
            {
              identifier: 1,
              title: 'Finding One',
              vulnType: 'Web',
              description: '<p>Description</p><img src="img-ok" alt="desc"><img src="missing-img" alt="fallback">',
              observation: '<p>Observation</p>',
              remediation: '<p>Remediation</p>',
              remediationComplexity: 2,
              priority: 3,
              references: ['ref-1'],
              poc: '<p>PoC</p>',
              scope: 'target-1',
              status: 1,
              category: 'No Category',
              retestStatus: 'partial',
              retestDescription: '<p>Retest details</p>',
              cvssv3: 'AV:N/AC:H/PR:L/UI:R/S:C/C:H/I:L/A:N',
              cvssv4: 'AV:N/AC:H/AT:P/PR:L/UI:A/VC:H/VI:L/VA:N/SC:L/SI:N/SA:H/S:P/AU:Y/R:A/V:C/RE:H/U:RED',
              customFields: [
                { customField: { fieldType: 'text', label: 'Finding Notes' }, text: '<p>Field text</p>' },
                { fieldType: 'input', label: 'Legacy Label', text: 'legacy' }
              ]
            },
            {
              identifier: 2,
              title: 'Finding Two',
              description: '<p>Another finding</p>',
              observation: '',
              remediation: '',
              cvssv3: 'AV:P/AC:L/PR:N/UI:N/S:U/C:L/I:H/A:H/E:F/RL:W/RC:C/CR:M/IR:H/AR:L/MAV:A/MAC:H/MPR:H/MUI:R/MS:C/MC:H/MI:L/MA:N'
            }
          ],
          sections: [
            { field: 'executivesummary', name: 'Executive Summary', text: '<p>Section body</p>' },
            {
              field: 'methodology',
              name: 'Methodology',
              customFields: [
                { customField: { fieldType: 'text', label: 'Approach' }, text: '<p>Approach text</p>' },
                { customField: { fieldType: 'input', label: 'Toolset' }, text: 'nmap' }
              ]
            }
          ]
        }
      }

      function loadReportGenerator(overrides = {}) {
        var capturedData = null
        var capturedImageOptions = null
        var expressionParser = Object.assign(
          (tag) => ({ get: () => `expr:${tag}` }),
          { filters: {} }
        )

        jest.resetModules()
        global.__basedir = `${process.cwd()}/src`

        jest.doMock('fs', () => ({
          ...jest.requireActual('fs'),
          readFileSync: jest.fn((path, encoding) => {
            if (encoding === 'binary') return 'PK'
            return '{"Network":"Network","No Category":"No Category","Low":"Low","Medium":"Medium","High":"High","Critical":"Critical"}'
          }),
          readdirSync: jest.fn(() => ['en.json', 'fr.json'])
        }))

        jest.doMock('docxtemplater/expressions.js', () => expressionParser)
        jest.doMock('pizzip', () => jest.fn(() => ({ zip: true })))
        jest.doMock('docxtemplater-image-module-pwndoc', () => jest.fn((opts) => {
          capturedImageOptions = opts
          if (overrides.throwImageModule) throw new Error('Image module init failed')
          return { module: true }
        }))
        jest.doMock('docxtemplater', () => jest.fn().mockImplementation((zip, options) => ({
          render: jest.fn((payload) => {
            if (capturedImageOptions) {
              capturedImageOptions.getImage('data:image/png;base64,QUJD', 'finding.image')
              capturedImageOptions.getImage('undefined', 'finding.image')
              capturedImageOptions.getSize(Buffer.from('img'), '', 'company.logo_small')
              capturedImageOptions.getSize(Buffer.from('img'), '', 'company.logo')
              capturedImageOptions.getSize(Buffer.from('img'), '', 'finding.image')
              capturedImageOptions.getSize(null, '', 'finding.image')
            }
            var pageBreakParser = options.parser('$pageBreakExceptLast')
            pageBreakParser.get({}, { scopePathLength: [2], scopePathItem: [0] })
            pageBreakParser.get({}, { scopePathLength: [2], scopePathItem: [1] })
            options.parser('regularTag')
            capturedData = payload
            if (overrides.renderError) throw overrides.renderError
          }),
          getZip: () => ({ generate: () => Buffer.from('generated-docx') })
        })))
        jest.doMock('image-size', () => ({ default: jest.fn(() => ({ width: 1200, height: 600 })) }))
        jest.doMock('mongoose', () => ({
          model: jest.fn((name) => {
            if (name === 'Image') {
              return {
                getOne: jest.fn(async (id) => {
                  if (id === 'missing-img') throw new Error('missing image')
                  return { value: 'data:image/png;base64,SU1H' }
                })
              }
            }
            if (name === 'Settings') {
              return { getAll: jest.fn(async () => baseSettings) }
            }
            throw new Error(`Unexpected model ${name}`)
          })
        }))
        jest.doMock('ae-cvss-calculator', () => ({
          Cvss3P1: jest.fn().mockImplementation((vector) => ({
            createJsonSchema: () => ({
              vectorString: vector || '',
              baseScore: 8.8,
              baseSeverity: vector && vector.includes('SEVNONE') ? '' : (vector && vector.includes('SEVLOW') ? 'LOW' : (vector && vector.includes('SEVMED') ? 'MEDIUM' : (vector && vector.includes('SEVHIGH') ? 'HIGH' : 'CRITICAL'))),
              temporalScore: 6.1,
              temporalSeverity: vector && vector.includes('TEMPNONE') ? '' : (vector && vector.includes('TEMPLOW') ? 'LOW' : (vector && vector.includes('TEMPHIGH') ? 'HIGH' : 'MEDIUM')),
              environmentalScore: 3.4,
              environmentalSeverity: vector && vector.includes('ENVNONE') ? '' : (vector && vector.includes('ENVCRIT') ? 'CRITICAL' : 'LOW')
            })
          })),
          Cvss4P0: jest.fn().mockImplementation((vector) => ({
            createJsonSchema: () => ({
              vectorString: vector || '',
              baseScore: 9.1,
              baseSeverity: vector && vector.includes('SEVNONE') ? '' : (vector && vector.includes('SEVLOW') ? 'LOW' : (vector && vector.includes('SEVMED') ? 'MEDIUM' : (vector && vector.includes('SEVCRIT') ? 'CRITICAL' : 'HIGH'))),
              threatScore: 8.4
            })
          }))
        }))

        var reportGenerator = require('../src/lib/report-generator')
        return { reportGenerator, getCapturedData: () => capturedData }
      }

      afterEach(() => {
        jest.dontMock('fs')
        jest.dontMock('mongoose')
        jest.dontMock('docxtemplater')
        jest.dontMock('pizzip')
        jest.dontMock('docxtemplater-image-module-pwndoc')
        jest.dontMock('image-size')
        jest.dontMock('ae-cvss-calculator')
        jest.dontMock('docxtemplater/expressions.js')
      })

      it('Builds report data for findings, custom fields and embedded images', async () => {
        var loader = loadReportGenerator()
        var audit = buildAuditFixture()
        var buffer = await loader.reportGenerator.generateDoc(audit)
        var rendered = loader.getCapturedData()

        expect(Buffer.isBuffer(buffer)).toBe(true)
        expect(buffer.toString()).toBe('generated-docx')
        expect(rendered.company.shortName).toBe('Acme')
        expect(rendered.findings).toHaveLength(2)
        expect(rendered.findings[0].identifier).toBe('IDX-001')
        expect(rendered.findings[0].cvss.baseSeverity).toBe('Critical')
        expect(rendered.findings[0].cvss4.baseSeverity).toBe('High')
        expect(rendered.findings[0].cvssObj.AV).toBe('Network')
        expect(rendered.findings[1].cvssObj.AV).toBe('Physical')
        var descriptionImages = rendered.findings[0].description.flatMap(block => block.images || [])
        expect(descriptionImages[0].image).toContain('data:image/png;base64')
        expect(descriptionImages[1].image).toContain('data:image/gif;base64')
        expect(rendered.executivesummary.text[0].text).toContain('Section body')
      })

      it('Converts multi-error template failures into a readable template error', async () => {
        var loader = loadReportGenerator({
          renderError: {
            properties: {
              id: 'multi_error',
              errors: [
                { properties: { explanation: 'Tag is unopened', scope: { tag: 'broken' } } }
              ]
            }
          }
        })

        await expect(loader.reportGenerator.generateDoc(buildAuditFixture()))
          .rejects
          .toContain('Template Error:')
      })

      it('Re-throws unexpected render errors', async () => {
        var loader = loadReportGenerator({
          renderError: Object.assign(new Error('Unexpected render crash'), { properties: {} })
        })

        await expect(loader.reportGenerator.generateDoc(buildAuditFixture()))
          .rejects
          .toThrow('Unexpected render crash')
      })

      it('Processes diverse CVSS vectors and resolves sub-templating placeholders', async () => {
        var loader = loadReportGenerator()
        var audit = buildAuditFixture()
        audit.customFields = [
          {
            customField: { fieldType: 'input', label: 'Tracking ID' },
            text: '{_{creator.username|upper}_}'
          }
        ]
        audit.findings = [
          {
            identifier: 10,
            title: 'Variant A',
            description: '<p>A</p>',
            observation: '<p>A</p>',
            remediation: '<p>A</p>',
            cvssv3: 'AV:A/AC:H/PR:H/UI:R/S:C/C:H/I:L/A:N/E:P/RL:T/RC:R/CR:H/IR:M/AR:L/MAV:L/MAC:H/MPR:L/MUI:R/MS:C/MC:H/MI:L/MA:N/SEVLOW/TEMPLOW',
            cvssv4: 'AV:A/AC:H/AT:P/PR:H/UI:A/VC:H/VI:L/VA:N/SC:H/SI:L/SA:N/S:P/AU:Y/R:U/V:C/RE:M/U:GREEN/MAV:A/MAC:H/MAT:P/MPR:H/MUI:A/MVC:H/MVI:L/MVA:N/MSC:H/MSI:L/MSA:N/CR:H/IR:M/AR:L/E:P/SEVLOW'
          },
          {
            identifier: 11,
            title: 'Variant B',
            description: '<p>B</p>',
            observation: '<p>B</p>',
            remediation: '<p>B</p>',
            cvssv3: 'AV:P/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:H/E:U/RL:O/RC:C/CR:L/IR:H/AR:M/MAV:P/MAC:L/MPR:N/MUI:N/MS:U/MC:N/MI:H/MA:H/SEVMED/TEMPHIGH/ENVCRIT',
            cvssv4: 'AV:P/AC:L/AT:N/PR:N/UI:N/VC:N/VI:H/VA:H/SC:N/SI:H/SA:H/S:N/AU:N/R:I/V:D/RE:H/U:AMBER/MAV:P/MAC:L/MAT:N/MPR:N/MUI:N/MVC:N/MVI:H/MVA:H/MSC:N/MSI:H/MSA:H/CR:M/IR:H/AR:M/E:A/SEVMED'
          },
          {
            identifier: 12,
            title: 'Variant C',
            description: '<p>C</p>',
            observation: '<p>C</p>',
            remediation: '<p>C</p>',
            cvssv3: 'AV:N/AC:L/PR:L/UI:N/S:C/C:L/I:N/A:L/E:F/RL:W/RC:U/CR:M/IR:L/AR:H/MAV:N/MAC:L/MPR:H/MUI:R/MS:C/MC:L/MI:N/MA:L/SEVHIGH',
            cvssv4: 'AV:N/AC:L/AT:P/PR:L/UI:P/VC:L/VI:N/VA:L/SC:L/SI:N/SA:L/S:P/AU:Y/R:A/V:D/RE:L/U:RED/MAV:N/MAC:L/MAT:P/MPR:L/MUI:P/MVC:L/MVI:N/MVA:L/MSC:L/MSI:N/MSA:L/CR:L/IR:L/AR:H/E:U/SEVCRIT'
          }
        ]

        await loader.reportGenerator.generateDoc(audit)
        var rendered = loader.getCapturedData()

        expect(rendered.trackingid).toBe('ADMIN')
        expect(rendered.findings).toHaveLength(3)
        expect(rendered.findings[0].cvss.cellColor).toContain('008000')
        expect(rendered.findings[1].cvss.environmentalCellColor).toContain('212121')
        expect(rendered.findings[2].cvss.cellColor).toContain('fe0000')
        expect(rendered.findings[2].cvss4.cellColor).toContain('212121')
        expect(rendered.findings[1].cvss4Obj.U).toBe('Amber')
        expect(rendered.findings[0].cvss4Obj.R).toBe('User')
      })

      it('Handles unknown severity fallback colors and image-first rich text', async () => {
        var loader = loadReportGenerator()
        var audit = buildAuditFixture()
        audit.customFields = [
          {
            customField: { fieldType: 'input', label: 'Tracking ID' },
            text: '{_{creator.username}_}'
          }
        ]
        audit.findings = [
          {
            identifier: 100,
            title: 'Fallback Variant',
            description: '<img src="img-ok" alt="first"><p>Tail</p>',
            observation: '<p>Obs</p>',
            remediation: '<p>Fix</p>',
            cvssv3: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/E:H/RL:U/TEMPNONE/ENVNONE/SEVNONE',
            cvssv4: 'AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H/S:N/AU:N/R:A/V:C/RE:H/U:CLEAR/SEVNONE'
          }
        ]

        await loader.reportGenerator.generateDoc(audit)
        var rendered = loader.getCapturedData()

        expect(rendered.trackingid).toBe('admin')
        expect(rendered.findings[0].description[0].text).toBe('')
        expect(rendered.findings[0].cvss.cellColor).toContain('4A86E8')
        expect(rendered.findings[0].cvss.temporalCellColor).toContain('4A86E8')
        expect(rendered.findings[0].cvss.environmentalCellColor).toContain('4A86E8')
        expect(rendered.findings[0].cvss4.cellColor).toContain('4A86E8')
      })

      it('Falls back when custom filters are missing and image module initialization fails', async () => {
        var loader = loadReportGenerator({ throwImageModule: true })
        var buffer = await loader.reportGenerator.generateDoc(buildAuditFixture())
        expect(Buffer.isBuffer(buffer)).toBe(true)
        expect(loader.getCapturedData().name).toBe('Generator Audit')
      })
    })

    describe('translate helper tests', () => {
      afterEach(() => {
        jest.resetModules()
      })

      it('Returns original text when locale file is missing', () => {
        jest.doMock('fs', () => ({
          readdirSync: jest.fn(() => ['en.json']),
          readFileSync: jest.fn(() => '{}')
        }))
        var translate = require('../src/translate')
        translate.setLocale('de')
        expect(translate.translate('No Category')).toBe('No Category')
      })

      it('Returns original text when dictionary parsing fails', () => {
        jest.doMock('fs', () => ({
          readdirSync: jest.fn(() => ['en.json']),
          readFileSync: jest.fn(() => { throw new Error('cannot read') })
        }))
        var translate = require('../src/translate')
        expect(translate.translate('Any Message', 'en')).toBe('Any Message')
      })
    })

  })
}
