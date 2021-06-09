var fs = require('fs');
var Docxtemplater = require('docxtemplater');
var JSZip = require('jszip');
var expressions = require('angular-expressions');
var ImageModule = require('docxtemplater-image-module-pwndoc');
var sizeOf = require('image-size');
var customGenerator = require('./custom-generator');
var utils = require('./utils');
var html2ooxml = require('./html2ooxml');
var _ = require('lodash');
var Image = require('mongoose').model('Image');
var reportConfig = require('./report.json');

// Generate document with docxtemplater
async function generateDoc(audit) {
    var templatePath = `${__basedir}/../report-templates/${audit.template.name}.${audit.template.ext || 'docx'}`
    var preppedAudit = await prepAuditData(audit)
    var content = fs.readFileSync(templatePath, "binary");

    var zip = new JSZip(content);

    var settings = JSON.parse(fs.readFileSync(`${__basedir}/lib/app-settings.json`));

    var opts = {};
    // opts.centered = true;
    opts.getImage = function(tagValue, tagName) {
        if (tagValue !== "undefined") {
            tagValue = tagValue.split(",")[1];
            return Buffer.from(tagValue, 'base64');
        }
        // return fs.readFileSync(tagValue, {encoding: 'base64'});
    }
    opts.getSize = function(img, tagValue, tagName) {
        if (img) {
            var sizeObj = sizeOf(img);
            var width = sizeObj.width;
            var height = sizeObj.height;
            if (tagName === "company.logo_small") {
                var divider = sizeObj.height / 37;
                height = 37;
                width = Math.floor(sizeObj.width / divider);
            }
            else if (tagName === "company.logo") {
                var divider = sizeObj.height / 250;
                height = 250;
                width = Math.floor(sizeObj.width / divider);
                if (width > 400) {
                    divider = sizeObj.width / 400;
                    height = Math.floor(sizeObj.height / divider);
                    width = 400;
                }
            }
            else if (sizeObj.width > 600) {
                var divider = sizeObj.width / 600;
                width = 600;
                height = Math.floor(sizeObj.height / divider);
            }
            return [width,height];
        }
        return [0,0]
    }

    if (settings.imageBorder && settings.imageBorderColor)
        opts.border = settings.imageBorderColor.replace('#', '')

    try {
        var imageModule = new ImageModule(opts);
    }
    catch(err) {
        console.log(err)
    }
    var doc = new Docxtemplater().attachModule(imageModule).loadZip(zip).setOptions({parser: angularParser, paragraphLoop: true});
    cvssHandle(preppedAudit);
    customGenerator.apply(preppedAudit);
    doc.setData(preppedAudit);
    try {
        doc.render();
    }
    catch (error) {
        if (error.properties.id === 'multi_error') {
            error.properties.errors.forEach(function(err) {
                console.log(err);
            });
        }
        else
            console.log(error)
        if (error.properties && error.properties.errors instanceof Array) {
            const errorMessages = error.properties.errors.map(function (error) {
                return `Explanation: ${error.properties.explanation}\nScope: ${JSON.stringify(error.properties.scope).substring(0,142)}...`
            }).join("\n\n");
            // errorMessages is a humanly readable message looking like this :
            // 'The tag beginning with "foobar" is unopened'
            throw `Template Error:\n${errorMessages}`;
        }
        else {
            throw error
        }
    }
    var buf = doc.getZip().generate({type:"nodebuffer"});

    return buf;
}
exports.generateDoc = generateDoc;

// *** Angular parser filters ***

// Convert input date with parameter s (full,short): {input | convertDate: 's'}
expressions.filters.convertDate = function(input, s) {
    var date = new Date(input);
    if (date != "Invalid Date") {
        var monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        var monthsShort = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        var day = date.getUTCDate();
        var month = date.getUTCMonth();
        var year = date.getUTCFullYear();
        if (s === "full") {
            return days[date.getUTCDay()] + ", " + monthsFull[month] + " " + (day<10 ? '0'+day: day) + ", " + year;
        }
        if (s === "short") {
            return monthsShort[month] + "/" + (day<10 ? '0'+day: day) + "/" + year;
        }
    }
}

// Convert input date with parameter s (full,short): {input | convertDateLocale: 'locale':'style'}
expressions.filters.convertDateLocale = function(input, locale, style) {
    var date = new Date(input);
    if (date != "Invalid Date") {
        var options = { year: 'numeric', month: 'numeric', day: 'numeric'}

        if (style === "full")
            options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}

        return date.toLocaleDateString(locale, options)
       
    }
}

// Convert identifier prefix to a user defined prefix: {identifier | changeID: 'PRJ-'}
expressions.filters.changeID = function (input, prefix) {
    return input.replace("IDX-", prefix);
}

// Replace newlines in office XML format: {@input | NewLines}
expressions.filters.NewLines = function(input) {
    var pre = '<w:p><w:r><w:t>';
    var post = '</w:t></w:r></w:p>';
    var lineBreak = '<w:br/>';
    var result = '';

    if(!input) return pre + post;

    input = utils.escapeXMLEntities(input);
    var inputArray = input.split(/\n\n+/g);
    inputArray.forEach(p => {
        result += `${pre}${p.replace(/\n/g, lineBreak)}${post}`
    });
    // input = input.replace(/\n/g, lineBreak);
    // return pre + input + post;
    return result;
}


// Convert HTML data to Open Office XML format: {@input | convertHTML: 'customStyle'}
expressions.filters.convertHTML = function(input, style) {
    if (typeof input === 'undefined')
        var result = html2ooxml('')
    else
        var result = html2ooxml(input.replace(/(<p><\/p>)+$/, ''), style)
    return result;
}

// Count vulnerability by severity
// Example: {findings | count: 'Critical'}
expressions.filters.count = function(input, severity) {
    if(!input) return input;
    var count = 0;

    for(var i = 0; i < input.length; i++){

        if(input[i].cvssSeverity === severity){
            count += 1;
        }
    }

    return count;
}

// Compile all angular expressions
var angularParser = function(tag) {
    expressions = {...expressions, ...customGenerator.expressions};
    if (tag === '.') {
        return {
            get: function(s){ return s;}
        };
    }
    const expr = expressions.compile(
        tag.replace(/(’|‘)/g, "'").replace(/(“|”)/g, '"')
    );
    return {
        get: function(scope, context) {
            let obj = {};
            const scopeList = context.scopeList;
            const num = context.num;
            for (let i = 0, len = num + 1; i < len; i++) {
                obj = _.merge(obj, scopeList[i]);
            }
            return expr(scope, obj);
        }
    };
}

// For each finding, add cvssColor, cvssObj and criteria colors parameters
function cvssHandle(data) {
    // Header title colors
    var noneColor = reportConfig.cvss_colors.none_color; //default of blue ("4A86E8")
    var lowColor = reportConfig.cvss_colors.low_color; //default of green ("008000")
    var mediumColor = reportConfig.cvss_colors.medium_color; //default of yellow ("f9a009")
    var highColor = reportConfig.cvss_colors.high_color; //default of red ("fe0000")
    var criticalColor = reportConfig.cvss_colors.critical_color; //default of black ("212121")

    var cellNoneColor = '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="' + noneColor + '"/></w:tcPr>';
    var cellLowColor = '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="'+lowColor+'"/></w:tcPr>';
    var cellMediumColor = '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="'+mediumColor+'"/></w:tcPr>';
    var cellHighColor = '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="'+highColor+'"/></w:tcPr>';
    var cellCriticalColor = '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="'+criticalColor+'"/></w:tcPr>';

    if (data.findings) {
        for (var i=0; i<data.findings.length; i++) {
            // Global CVSS color depending on Severity
            if (data.findings[i].cvssSeverity === "Low") { data.findings[i].cvssColor = cellLowColor}
            else if (data.findings[i].cvssSeverity === "Medium") { data.findings[i].cvssColor = cellMediumColor}
            else if (data.findings[i].cvssSeverity === "High") { data.findings[i].cvssColor = cellHighColor}
            else if (data.findings[i].cvssSeverity === "Critical") { data.findings[i].cvssColor = cellCriticalColor}
            else { data.findings[i].cvssColor = cellNoneColor} ;

            // Convert CVSS string to object in cvssObj parameter
            var cvssObj = cvssStrToObject(data.findings[i].cvssv3);
            data.findings[i].cvssObj = cvssObj;
         }
    }
}

function cvssStrToObject(cvss) {
    var res = {AV: "", AC: "", PR: "", UI: "", S: "", C: "", I: "", A: ""};
    if (cvss) {
        var temp = cvss.split('/');
        for (var i=0; i<temp.length; i++) {
            var elt = temp[i].split(':');
            switch(elt[0]) {
                case "AV":
                    if (elt[1] === "N") res.AV = "Network"
                    else if (elt[1] === "A") res.AV = "Adjacent Network"
                    else if (elt[1] === "L") res.AV = "Local"
                    else if (elt[1] === "P") res.AV = "Physical"
                    else res.AV = elt[1];
                    break;
                case "AC":
                    if (elt[1] === "L") res.AC = "Low"
                    else if (elt[1] === "H") res.AC = "High"
                    else res.AC = elt[1];
                    break;
                case "PR":
                    if (elt[1] === "N") res.PR = "None"
                    else if (elt[1] === "L") res.PR = "Low"
                    else if (elt[1] === "H") res.PR = "High"
                    else res.PR = elt[1];
                    break;
                case "UI":
                    if (elt[1] === "N") res.UI = "None"
                    else if (elt[1] === "R") res.UI = "Required"
                    else res.UI = elt[1];
                    break;
                case "S":
                    if (elt[1] === "U") res.S = "Unchanged"
                    else if (elt[1] === "C") res.S = "Changed"
                    else res.S = elt[1];
                    break;
                case "C":
                    if (elt[1] === "N") res.C = "None"
                    else if (elt[1] === "L") res.C = "Low"
                    else if (elt[1] === "H") res.C = "High"
                    else res.C = elt[1];
                    break;
                case "I":
                    if (elt[1] === "N") res.I = "None"
                    else if (elt[1] === "L") res.I = "Low"
                    else if (elt[1] === "H") res.I = "High"
                    else res.I = elt[1];
                    break;
                case "A":
                    if (elt[1] === "N") res.A = "None"
                    else if (elt[1] === "L") res.A = "Low"
                    else if (elt[1] === "H") res.A = "High"
                    else res.A = elt[1];
                    break;
                default:
                    break;
            }
        }
    }
    return res
}

async function prepAuditData(data) {
    var result = {}
    result.name = data.name || "undefined"
    result.auditType = data.auditType || "undefined"
    result.location = data.location || "undefined"
    result.date = data.date || "undefined"
    result.date_start = data.date_start || "undefined"
    result.date_end = data.date_end || "undefined"
    if (data.customFields) {
        for (field of data.customFields) {
            var fieldType = field.customField.fieldType
            var label = field.customField.label

            if (fieldType === 'text')
                result[_.deburr(label.toLowerCase()).replace(/\s/g, '')] = await splitHTMLParagraphs(field.text)
            else if (fieldType !== 'space')
                result[_.deburr(label.toLowerCase()).replace(/\s/g, '')] = field.text
        }
    }

    result.company = {}
    if (data.company) {
        result.company.name = data.company.name || "undefined"
        result.company.logo = data.company.logo || "undefined"
        result.company.logo_small = data.company.logo || "undefined"
    }

    result.client = {}
    if (data.client) {
        result.client.email = data.client.email || "undefined"
        result.client.firstname = data.client.firstname || "undefined"
        result.client.lastname = data.client.lastname || "undefined"
        result.client.phone = data.client.phone || "undefined"
        result.client.cell = data.client.cell || "undefined"
        result.client.title = data.client.title || "undefined"
    }

    result.collaborators = []
    data.collaborators.forEach(collab => {
        result.collaborators.push({
            username: collab.username || "undefined",
            firstname: collab.firstname || "undefined",
            lastname: collab.lastname || "undefined",
            role: collab.role || "undefined"
        })
    })
    result.language = data.language || "undefined"
    result.scope = data.scope || []

    result.findings = []
    for (finding of data.findings) {
        var tmpFinding = {
            title: finding.title || "",
            vulnType: finding.vulnType || "",
            description: await splitHTMLParagraphs(finding.description),
            observation: await splitHTMLParagraphs(finding.observation),
            remediation: await splitHTMLParagraphs(finding.remediation),
            remediationComplexity: finding.remediationComplexity || "",
            priority: finding.priority || "",
            references: finding.references || [],
            cvssv3: finding.cvssv3 || "",
            cvssScore: finding.cvssScore || "",
            cvssSeverity: finding.cvssSeverity || "",
            poc: await splitHTMLParagraphs(finding.poc),
            affected: finding.scope || "",
            status: finding.status || "",
            category: finding.category || "",
            identifier: "IDX-" + utils.lPad(finding.identifier)
        }
        if (finding.customFields) {
            for (field of finding.customFields) {
                // For retrocompatibility of findings with old customFields 
                // or if custom field has been deleted, last saved custom fields will be available
                if (field.customField) {
                    var fieldType = field.customField.fieldType
                    var label = field.customField.label
                }
                else {
                    var fieldType = field.fieldType
                    var label = field.label
                }
                if (fieldType === 'text')
                    tmpFinding[_.deburr(label.toLowerCase()).replace(/\s/g, '').replace(/[^\w]/g, '_')] = await splitHTMLParagraphs(field.text)
                else if (fieldType !== 'space')
                    tmpFinding[_.deburr(label.toLowerCase()).replace(/\s/g, '').replace(/[^\w]/g, '_')] = field.text
            }
        }
        result.findings.push(tmpFinding)
    }

    result.creator = {}
    if (data.creator) {
        result.creator.username = data.creator.username || "undefined"
        result.creator.firstname = data.creator.firstname || "undefined"
        result.creator.lastname = data.creator.lastname || "undefined"
        result.creator.role = data.creator.role || "undefined"
    }

    for (section of data.sections) {
        var formatSection = { 
            name: section.name
        }
        if (section.text) // keep text for retrocompatibility
            formatSection.text = await splitHTMLParagraphs(section.text)
        else if (section.customFields) {
            for (field of section.customFields) {
                var fieldType = field.customField.fieldType
                var label = field.customField.label
                if (fieldType === 'text')
                    formatSection[_.deburr(label.toLowerCase()).replace(/\s/g, '').replace(/[^\w]/g, '_')] = await splitHTMLParagraphs(field.text)
                else if (fieldType !== 'space')
                    formatSection[_.deburr(label.toLowerCase()).replace(/\s/g, '').replace(/[^\w]/g, '_')] = field.text
            }
        }
        result[section.field] = formatSection
    }
    
    return result
}

async function splitHTMLParagraphs(data) {
    var result = []
    if (!data)
        return result

    var splitted = data.split(/(<img.+?src=".*?".+?alt=".*?".*?>)/)

    for (value of splitted){
        if (value.startsWith("<img")) {
            var src = value.match(/<img.+src="(.*?)"/) || ""
            var alt = value.match(/<img.+alt="(.*?)"/) || ""
            if (src && src.length > 1) src = src[1]
            if (alt && alt.length > 1) alt = _.unescape(alt[1])

            if (!src.startsWith('data')){
                try {
                    src = (await Image.getOne(src)).value
                } catch (error) {
                    src = "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="
                }
            }
            if (result.length === 0)
                result.push({text: "", images: []})
            result[result.length-1].images.push({image: src, caption: alt})
        }
        else if (value === "") {
            continue
        }
        else {
            result.push({text: value, images: []})
        }
    }
    return result
}


