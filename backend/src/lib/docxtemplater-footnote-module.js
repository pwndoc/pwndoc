/*
    This code will walk the document looking for FootNote references with id 1337,
    when it encounters one, the next paragraph will be extracted. This is the paragraph
    to which the reference is pointing. Then, that value is added to the footnotes.xml
*/

var DOMParser = require("xmldom").DOMParser;

class FootnoteModule {
    constructor() {
        this.name = "FootnoteModule";
    }
    set(options) {
        if (options.zip) {
            this.zip = options.zip;
        }
        if (options.xmlDocuments) {
            this.xmlDocuments = options.xmlDocuments;
        }
    }
    on(event) {
        try {
            // While zip is being created, we add the footnote files
            if (event !== "syncing-zip") {
                return;
            }
            if (!this.zip.file('word/_rels/footnotes.xml.rels')) {
                this.zip.file('word/_rels/footnotes.xml.rels', 
                    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
            }
            delete this.xmlDocuments['word/_rels/footnotes.xml.rels'];
            let rels = this.zip.file('word/_rels/footnotes.xml.rels').asText();
            let document = this.zip.file('word/document.xml').asText();
            let footnotes = this.zip.file('word/footnotes.xml').asText();
            rels = new DOMParser().parseFromString(rels);
            document = new DOMParser().parseFromString(document);
            footnotes = new DOMParser().parseFromString(footnotes);

            // Don't ask.
            Array.from(document.getElementsByTagName("w:footnoteReference")).forEach((elem, i) => {
                if (elem.getAttribute('w:id') !== '1337') {
                    return;  // Don't want to mess with existing footnotes
                }
                const content = elem.parentNode.nextSibling.getElementsByTagName("w:t")[0].textContent.trim();

                // word/_rels/footnotes.xml.rels: Create new <Relationship> element
                const rel = rels.createElement('Relationship');
                const rid = `rId${i + 1}`;
                rel.setAttribute('Id', rid);
                rel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink');
                rel.setAttribute('Target', content);
                rel.setAttribute('TargetMode', 'External');
                rels.getElementsByTagName('Relationships')[0].appendChild(rel);

                // word/footnotes.xml: Create footnote with hyperlink
                const footnote = footnotes.createElement('w:footnote');
                footnote.setAttribute('w:id', `${i + 1}`);
                const p = footnotes.createElement('w:p');
                footnote.appendChild(p);
                const pPr = footnotes.createElement('w:pPr');
                p.appendChild(pPr);
                const pStyle = footnotes.createElement('w:pStyle');
                pStyle.setAttribute('w:val', 'FootnoteText');
                pPr.appendChild(pStyle);
                const r = footnotes.createElement('w:r');
                p.appendChild(r);
                const rPr = footnotes.createElement('w:rPr');
                r.appendChild(rPr);
                const rStyle = footnotes.createElement('w:rStyle');
                rStyle.setAttribute('w:val', 'FootnoteReference');
                rPr.appendChild(rStyle);
                const footnoteRef = footnotes.createElement('w:footnoteRef');
                r.appendChild(footnoteRef);
                const r2 = footnotes.createElement('w:r');
                p.appendChild(r2);
                const t = footnotes.createElement('w:t');
                t.setAttribute('xml:space', 'preserve');
                t.textContent = " ";
                r2.appendChild(t);
                const hyperlink = footnotes.createElement('w:hyperlink');
                hyperlink.setAttribute('r:id', rid);
                p.appendChild(hyperlink);
                const r3 = footnotes.createElement('w:r');
                hyperlink.appendChild(r3);
                const rPr2 = footnotes.createElement('w:rPr');
                r3.appendChild(rPr2);
                const rStyle2 = footnotes.createElement('w:rStyle');
                rStyle2.setAttribute('w:val', 'Hyperlink');
                rPr2.appendChild(rStyle2);
                const t2 = footnotes.createElement('w:t');
                t2.textContent = content;
                r3.appendChild(t2);

                footnotes.getElementsByTagName('w:footnotes')[0].appendChild(footnote);

                // word/document.xml: Update footnote ID and remove text storage
                elem.setAttribute('w:id', `${i + 1}`);

                // Remove next 2 elements (stored link & superscript)
                elem.parentNode.parentNode.removeChild(elem.parentNode.nextSibling);
                elem.parentNode.parentNode.removeChild(elem.parentNode.nextSibling);
            });

            this.zip.file('word/_rels/footnotes.xml.rels', rels.toString());
            this.zip.file('word/document.xml', document.toString());
            this.zip.file('word/footnotes.xml', footnotes.toString());
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = FootnoteModule;