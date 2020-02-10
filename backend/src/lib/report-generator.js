var fs = require('fs');
var Docxtemplater = require('docxtemplater');
var JSZip = require('jszip');
var expressions = require('angular-expressions');
var ImageModule = require('docxtemplater-image-module');
var sizeOf = require('image-size');
var customGenerator = require('./custom-generator');
var utils = require('./utils');

// Generate document with docxtemplater
function generateDoc(audit) {
    var content = fs.readFileSync(`${__basedir}/../report-templates/${audit.template.name}.docx`, "binary");

    var zip = new JSZip(content);

    var opts = {};
    // opts.centered = true;
    opts.getImage = function(tagValue, tagName) {
        tagValue = tagValue.split(",")[1];
        return Buffer.from(tagValue, 'base64');
        // return fs.readFileSync(tagValue, {encoding: 'base64'});
    }
    opts.getSize = function(img, tagValue, tagName) {
        var sizeObj = sizeOf(img);
        var width = sizeObj.width;
        var height = sizeObj.height;
        if (tagName === "company_logo_small") {
            var divider = sizeObj.height / 37;
            height = 37;
            width = Math.floor(sizeObj.width / divider);
        }
        else if (tagName === "company_logo_large") {
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
    var imageModule = new ImageModule(opts);
    var doc = new Docxtemplater().attachModule(imageModule).loadZip(zip).setOptions({parser: angularParser});
    cvssHandle(audit);
    customGenerator.apply(audit);
    doc.setData(audit);

    try {
        doc.render();
    }
    catch (error) {
        throw error;
    }

    var buf = doc.getZip().generate({type:"nodebuffer"});

    return buf;
    // fs.writeFileSync(__dirname+'/../../render/'+filename, buf);
}
exports.generateDoc = generateDoc;

// *** Angular parser filters ***

// Convert input date with parameter s (full,short): {input | convertDate: 's'}
expressions.filters.convertDate = function(input, s) {
    var date = new Date(input);
    if (date !== "Invalid Date") {
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

// Rplace newlines in office XML format: {@input | NewLines}
expressions.filters.NewLines = function(input) {
    var pre = '<w:p><w:r><w:t>';
    var post = '</w:t></w:r></w:p>';
    var lineBreak = '<w:br/>';

    if(!input) return pre + post;

    input = utils.escapeXMLEntities(input);
    input = input.replace(/\n/g, lineBreak);
    return pre + input + post;
}

// Compile all angular expressions
var angularParser = function(tag) {
    expressions = {...expressions, ...customGenerator.expressions};
    return {
        get: tag === '.' ? function(s){ return s;} : expressions.compile(tag)
    };
}

// For each finding, add cvssColor, cvssObj and criteria colors parameters
function cvssHandle(data) {
    // Header title colors
    var lowColor = "008000"; //green
    var mediumColor = "f9a009"; //yellow
    var highColor = "fe0000"; //red
    var criticalColor = "212121"; //black

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
            else if (data.findings[i].cvssSeverity === "Critical") { data.findings[i].cvssColor = cellCriticalColor};

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

