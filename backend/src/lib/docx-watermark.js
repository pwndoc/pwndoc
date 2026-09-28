var PizZip = require('pizzip');

var WATERMARK_NS = [
    'xmlns:v="urn:schemas-microsoft-com:vml"',
    'xmlns:o="urn:schemas-microsoft-com:office:office"',
    'xmlns:w10="urn:schemas-microsoft-com:office:word"'
];

function escapeXmlAttr(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Resolve the watermark string for an audit language from the localized settings list.
 * Falls back to the first non-empty value, then to "DRAFT".
 */
function resolveDraftWatermarkText(draftWatermark, language) {
    if (!Array.isArray(draftWatermark) || draftWatermark.length === 0)
        return 'DRAFT';

    var match = draftWatermark.find(e => e.locale === language && e.value);
    if (match)
        return match.value;

    var fallback = draftWatermark.find(e => e.value);
    return fallback ? fallback.value : 'DRAFT';
}

function watermarkParagraphXml(text) {
    var escaped = escapeXmlAttr(text);
    return (
        '<w:p>' +
            '<w:r>' +
                '<w:rPr><w:noProof/></w:rPr>' +
                '<w:pict>' +
                    '<v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e">' +
                        '<v:formulas>' +
                            '<v:f eqn="sum #0 0 10800"/>' +
                            '<v:f eqn="prod #0 2 1"/>' +
                            '<v:f eqn="sum 21600 0 @1"/>' +
                            '<v:f eqn="sum 0 0 @2"/>' +
                            '<v:f eqn="sum 21600 0 @3"/>' +
                            '<v:f eqn="if @0 @3 0"/>' +
                            '<v:f eqn="if @0 21600 @1"/>' +
                            '<v:f eqn="if @0 0 @2"/>' +
                            '<v:f eqn="if @0 @4 21600"/>' +
                            '<v:f eqn="mid @5 @6"/>' +
                            '<v:f eqn="mid @8 @5"/>' +
                            '<v:f eqn="mid @7 @8"/>' +
                            '<v:f eqn="mid @6 @7"/>' +
                            '<v:f eqn="sum @6 0 @5"/>' +
                        '</v:formulas>' +
                        '<v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/>' +
                        '<v:textpath on="t" fitshape="t"/>' +
                        '<v:handles><v:h position="#0,bottomRight" polar="center"/></v:handles>' +
                        '<o:lock v:ext="edit" text="t" shapetype="t"/>' +
                    '</v:shapetype>' +
                    '<v:shape id="PowerPlusWaterMarkObject" o:spid="_x0000_s2049" type="#_x0000_t136" ' +
                        'style="position:absolute;margin-left:0;margin-top:0;width:468pt;height:117pt;rotation:315;z-index:-251656192;' +
                        'mso-position-horizontal:center;mso-position-horizontal-relative:margin;' +
                        'mso-position-vertical:center;mso-position-vertical-relative:margin" ' +
                        'o:allowincell="f" fillcolor="silver" stroked="f">' +
                        '<v:fill opacity=".5"/>' +
                        '<v:textpath style="font-family:&quot;Calibri&quot;;font-size:1pt" string="' + escaped + '"/>' +
                        '<w10:wrap type="none"/>' +
                    '</v:shape>' +
                '</w:pict>' +
            '</w:r>' +
        '</w:p>'
    );
}

function ensureWatermarkNamespaces(hdrOpenTag) {
    var extras = WATERMARK_NS.filter(ns => !hdrOpenTag.includes(ns.split('=')[0] + '='));
    if (!extras.length)
        return hdrOpenTag;
    return hdrOpenTag.replace('<w:hdr', '<w:hdr ' + extras.join(' '));
}

function injectWatermarkIntoHeader(headerXml, text) {
    var openMatch = /<w:hdr\b[^>]*>/.exec(headerXml);
    if (!openMatch)
        return headerXml;

    var open = ensureWatermarkNamespaces(openMatch[0]);
    var closeIdx = headerXml.lastIndexOf('</w:hdr>');
    if (closeIdx < 0)
        return headerXml;

    var before = headerXml.slice(0, openMatch.index);
    var inner = headerXml.slice(openMatch.index + openMatch[0].length, closeIdx);
    // Drop any previously injected text-path watermark paragraphs
    inner = inner.replace(/<w:p\b[^>]*>[\s\S]*?<v:textpath\b[\s\S]*?<\/w:p>/g, '');
    return before + open + watermarkParagraphXml(text) + inner + '</w:hdr>';
}

function createMinimalHeader(text) {
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        WATERMARK_NS.join(' ') + '>' +
        watermarkParagraphXml(text) +
        '</w:hdr>'
    );
}

function nextRelationshipId(relsXml) {
    var ids = [...relsXml.matchAll(/\bId="rId(\d+)"/g)].map(m => parseInt(m[1], 10));
    return 'rId' + ((ids.length ? Math.max(...ids) : 0) + 1);
}

function ensureHeaderPart(zip, text) {
    zip.file('word/header1.xml', createMinimalHeader(text));

    var ctPath = '[Content_Types].xml';
    var ct = zip.file(ctPath).asText();
    if (!ct.includes('/word/header1.xml')) {
        ct = ct.replace(
            '</Types>',
            '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>'
        );
        zip.file(ctPath, ct);
    }

    var relsPath = 'word/_rels/document.xml.rels';
    var rels = zip.file(relsPath).asText();
    var rIdMatch = /Id="(rId\d+)"[^>]*Target="header1\.xml"|Target="header1\.xml"[^>]*Id="(rId\d+)"/.exec(rels);
    var rId;
    if (rIdMatch) {
        rId = rIdMatch[1] || rIdMatch[2];
    } else {
        rId = nextRelationshipId(rels);
        rels = rels.replace(
            '</Relationships>',
            '<Relationship Id="' + rId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>'
        );
        zip.file(relsPath, rels);
    }

    var docPath = 'word/document.xml';
    var doc = zip.file(docPath).asText();
    if (!/<w:headerReference\b/.test(doc)) {
        doc = doc.replace(/<w:sectPr\b([^>]*)>/g, function(match, attrs) {
            return '<w:sectPr' + attrs + '><w:headerReference w:type="default" r:id="' + rId + '"/>';
        });
        zip.file(docPath, doc);
    }
}

/**
 * Inject a diagonal text watermark into every header of a DOCX buffer.
 * Creates a default header when the document has none.
 */
function addTextWatermark(zip, text) {
    if (!text)
        return;

    var headerFiles = Object.keys(zip.files).filter(f => /^word\/header\d+\.xml$/.test(f) && !zip.files[f].dir);

    if (headerFiles.length === 0) {
        ensureHeaderPart(zip, text);
    } else {
        headerFiles.forEach(file => {
            zip.file(file, injectWatermarkIntoHeader(zip.file(file).asText(), text));
        });
    }
}

/**
 * Mark the document as read-only via Word document protection.
 * No password is set, so protection can be removed via Restrict Editing,
 * but Word opens the file as non-editable by default.
 */
function makeReadOnly(zip) {
    var settingsFile = zip.file('word/settings.xml');
    if (!settingsFile)
        return;

    var xml = settingsFile.asText();
    // Replace any existing documentProtection element
    xml = xml.replace(/<w:documentProtection\b[^/]*\/>/g, '');
    xml = xml.replace(/<w:documentProtection\b[^>]*>[\s\S]*?<\/w:documentProtection>/g, '');

    var protection = '<w:documentProtection w:edit="readOnly" w:enforcement="1"/>';
    if (xml.includes('</w:settings>')) {
        xml = xml.replace('</w:settings>', protection + '</w:settings>');
    } else {
        return;
    }
    zip.file('word/settings.xml', xml);
}

/**
 * Apply draft-export protections: watermark + read-only document protection.
 */
function applyDraftExport(docxBuffer, watermarkText) {
    var zip = new PizZip(docxBuffer);
    addTextWatermark(zip, watermarkText);
    makeReadOnly(zip);
    return zip.generate({ type: 'nodebuffer' });
}

module.exports = {
    applyDraftExport,
    resolveDraftWatermarkText,
    // Exported for unit testing
    addTextWatermark,
    makeReadOnly,
    injectWatermarkIntoHeader,
    watermarkParagraphXml
};
