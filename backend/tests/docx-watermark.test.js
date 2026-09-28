const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const {
  applyDraftExport,
  addTextWatermark,
  makeReadOnly,
  resolveDraftWatermarkText,
  injectWatermarkIntoHeader
} = require('../src/lib/docx-watermark');

module.exports = function() {
  describe('docx-watermark', () => {
    it('Resolves localized watermark text with fallbacks', () => {
      expect(resolveDraftWatermarkText([], 'en')).toBe('DRAFT');
      expect(resolveDraftWatermarkText([{locale: 'fr', value: 'BROUILLON'}], 'en')).toBe('BROUILLON');
      expect(resolveDraftWatermarkText([
        {locale: 'en', value: 'DRAFT'},
        {locale: 'fr', value: 'BROUILLON'}
      ], 'fr')).toBe('BROUILLON');
      expect(resolveDraftWatermarkText([{locale: 'en', value: ''}], 'en')).toBe('DRAFT');
    });

    it('Injects a VML text watermark into an existing header', () => {
      var header =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:p><w:r><w:t>Existing</w:t></w:r></w:p>' +
        '</w:hdr>';

      var result = injectWatermarkIntoHeader(header, 'CONFIDENTIAL');
      expect(result).toContain('xmlns:v="urn:schemas-microsoft-com:vml"');
      expect(result).toContain('string="CONFIDENTIAL"');
      expect(result).toContain('Existing');
      expect(result).toContain('<v:textpath');
    });

    it('Escapes XML special characters in watermark text', () => {
      var header =
        '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:hdr>';
      var result = injectWatermarkIntoHeader(header, 'A&B<"\'>');
      expect(result).toContain('string="A&amp;B&lt;&quot;&apos;&gt;"');
    });

    it('Adds a watermark to the default report template headers', () => {
      var templatePath = path.join(__dirname, '../report-templates/Default Template.docx');
      var zip = new PizZip(fs.readFileSync(templatePath));
      addTextWatermark(zip, 'DRAFT COPY');
      var headers = Object.keys(zip.files)
        .filter(f => /^word\/header\d+\.xml$/.test(f))
        .map(f => zip.file(f).asText());

      expect(headers.length).toBeGreaterThan(0);
      headers.forEach(xml => {
        expect(xml).toContain('string="DRAFT COPY"');
        expect(xml).toContain('xmlns:v="urn:schemas-microsoft-com:vml"');
      });
    });

    it('Creates a header when the document has none', () => {
      var zip = new PizZip();
      zip.file('[Content_Types].xml',
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>'
      );
      zip.file('word/_rels/document.xml.rels',
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '</Relationships>'
      );
      zip.file('word/document.xml',
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<w:body><w:p/><w:sectPr/></w:body></w:document>'
      );

      addTextWatermark(zip, 'WATERMARK');
      expect(zip.file('word/header1.xml')).toBeTruthy();
      expect(zip.file('word/header1.xml').asText()).toContain('string="WATERMARK"');
      expect(zip.file('[Content_Types].xml').asText()).toContain('/word/header1.xml');
      expect(zip.file('word/document.xml').asText()).toContain('headerReference');
    });

    it('Marks the document as read-only in settings.xml', () => {
      var templatePath = path.join(__dirname, '../report-templates/Default Template.docx');
      var zip = new PizZip(fs.readFileSync(templatePath));
      makeReadOnly(zip);
      var settings = zip.file('word/settings.xml').asText();
      expect(settings).toContain('w:documentProtection');
      expect(settings).toContain('w:edit="readOnly"');
      expect(settings).toContain('w:enforcement="1"');
    });

    it('Applies watermark and read-only protection together for draft exports', () => {
      var templatePath = path.join(__dirname, '../report-templates/Default Template.docx');
      var buffer = applyDraftExport(fs.readFileSync(templatePath), 'DRAFT COPY');
      var zip = new PizZip(buffer);

      expect(zip.file('word/settings.xml').asText()).toContain('w:edit="readOnly"');
      var headerXml = Object.keys(zip.files)
        .filter(f => /^word\/header\d+\.xml$/.test(f))
        .map(f => zip.file(f).asText())
        .join('');
      expect(headerXml).toContain('string="DRAFT COPY"');
    });
  });
};
