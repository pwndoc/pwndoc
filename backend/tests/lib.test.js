module.exports = function () {
  var html2ooxml = require("../src/lib/html2ooxml")
  var utils = require("../src/lib/utils")

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
              `<w:u w:val="single"/>`+
              `<w:strike/>`+
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

      it('Code', () => {
        var html = "<p>Paragraph <code>Code</code> Paragraph</p>"
        var expected =
        `<w:p>`+
          `<w:r>`+
            `<w:t xml:space="preserve">Paragraph </w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:rPr>`+
              `<w:rStyle w:val="CodeChar"/>`+
            `</w:rPr>`+
            `<w:t xml:space="preserve">Code</w:t>`+
          `</w:r>`+
          `<w:r>`+
            `<w:t xml:space="preserve"> Paragraph</w:t>`+
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
  })
}