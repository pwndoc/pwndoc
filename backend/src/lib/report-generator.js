var fs = require('fs');
var Docxtemplater = require('docxtemplater');
var PizZip = require("pizzip");
var reportFilters = require('./report-filters');
var reportFiltersCustom;
// If the custom filters file is not found, fallback to empty filters
try {
    reportFiltersCustom = require('./custom/report-filters-custom.js');
} catch (e) {
    reportFiltersCustom = { expressions: {}, subTemplatingFilters: {} };
}
let expressionParser = require('docxtemplater/expressions.js')
var ImageModule = require('docxtemplater-image-module-pwndoc');
var sizeOf = require('image-size');
var utils = require('./utils');
var _ = require('lodash');
var Image = require('mongoose').model('Image');
var Settings = require('mongoose').model('Settings');
const cvss = require('ae-cvss-calculator');
var translate = require('../translate')
var $t

// Generate document with docxtemplater
async function generateDoc(audit) {
    var templatePath = `${__basedir}/../report-templates/${audit.template.name}.${audit.template.ext || 'docx'}`
    var content = fs.readFileSync(templatePath, "binary");
    
    var zip = new PizZip(content);
    
    translate.setLocale(audit.language)
    $t = translate.translate

    var settings = await Settings.getAll();
    var preppedAudit = await prepAuditData(audit, settings)

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
        return [0,0];
    }

    if (settings.report.private.imageBorder && settings.report.private.imageBorderColor)
        opts.border = settings.report.private.imageBorderColor.replace('#', '')

    try {
        var imageModule = new ImageModule(opts);
    }
    catch(err) {
        console.log(err)
    }
    expressionParser.filters = {...reportFilters.expressions, ...reportFiltersCustom.expressions}   
    var doc = new Docxtemplater(zip, {
        parser: parser,
        paragraphLoop: true,
        modules: [imageModule],
    });
    try {
        doc.render(preppedAudit);
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

// Filters helper: handles the use of preformated easilly translatable strings.
// Source: https://www.tutorialstonight.com/javascript-string-format.php
String.prototype.format = function () {
    let args = arguments;
    return this.replace(/{([0-9]+)}/g, function (match, index) {
        return typeof args[index] == 'undefined' ? match : args[index];
    });
};


function parser(tag) {
    // We write an exception to handle the tag "$pageBreakExceptLast"
    if (tag === "$pageBreakExceptLast") {
        return {
            get(scope, context) {
                const totalLength = context.scopePathLength[context.scopePathLength.length - 1];
                const index = context.scopePathItem[context.scopePathItem.length - 1];
                const isLast = index === totalLength - 1;
                if (!isLast) {
                    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
                }
                else {
                    return '';
                }
            }
        }
    }
    // We use the angularParser as the default fallback
    // If you don't wish to use the angularParser,
    // you can use the default parser as documented here:
    // https://docxtemplater.readthedocs.io/en/latest/configuration.html#default-parser
    return expressionParser(tag);
}

function cvssStrToObject(cvss) {
    var initialState = 'Not Defined'
    var res = {AV:initialState, AC:initialState, PR:initialState, UI:initialState, S:initialState, C:initialState, I:initialState, A:initialState, E:initialState, RL:initialState, RC:initialState, CR:initialState, IR:initialState, AR:initialState, MAV:initialState, MAC:initialState, MPR:initialState, MUI:initialState, MS:initialState, MC:initialState, MI:initialState, MA:initialState};
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
                    res.AV = $t(res.AV)
                    break;
                case "AC":
                    if (elt[1] === "L") res.AC = "Low"
                    else if (elt[1] === "H") res.AC = "High"
                    res.AC = $t(res.AC)
                    break;
                case "PR":
                    if (elt[1] === "N") res.PR = "None"
                    else if (elt[1] === "L") res.PR = "Low"
                    else if (elt[1] === "H") res.PR = "High"
                    res.PR = $t(res.PR)
                    break;
                case "UI":
                    if (elt[1] === "N") res.UI = "None"
                    else if (elt[1] === "R") res.UI = "Required"
                    res.UI = $t(res.UI)
                    break;
                case "S":
                    if (elt[1] === "U") res.S = "Unchanged"
                    else if (elt[1] === "C") res.S = "Changed"
                    res.S = $t(res.S)
                    break;
                case "C":
                    if (elt[1] === "N") res.C = "None"
                    else if (elt[1] === "L") res.C = "Low"
                    else if (elt[1] === "H") res.C = "High"
                    res.C = $t(res.C)
                    break;
                case "I":
                    if (elt[1] === "N") res.I = "None"
                    else if (elt[1] === "L") res.I = "Low"
                    else if (elt[1] === "H") res.I = "High"
                    res.I = $t(res.I)
                    break;
                case "A":
                    if (elt[1] === "N") res.A = "None"
                    else if (elt[1] === "L") res.A = "Low"
                    else if (elt[1] === "H") res.A = "High"
                    res.A = $t(res.A)
                    break;
                case "E":
                    if (elt[1] === "U") res.E = "Unproven"
                    else if (elt[1] === "P") res.E = "Proof-of-Concept"
                    else if (elt[1] === "F") res.E = "Functional"
                    else if (elt[1] === "H") res.E = "High"
                    res.E = $t(res.E)
                    break;
                case "RL":
                    if (elt[1] === "O") res.RL = "Official Fix"
                    else if (elt[1] === "T") res.RL = "Temporary Fix"
                    else if (elt[1] === "W") res.RL = "Workaround"
                    else if (elt[1] === "U") res.RL = "Unavailable"
                    res.RL = $t(res.RL)
                    break;
                case "RC":
                    if (elt[1] === "U") res.RC = "Unknown"
                    else if (elt[1] === "R") res.RC = "Reasonable"
                    else if (elt[1] === "C") res.RC = "Confirmed"
                    res.RC = $t(res.RC)
                    break;
                case "CR":
                    if (elt[1] === "L") res.CR = "Low"
                    else if (elt[1] === "M") res.CR = "Medium"
                    else if (elt[1] === "H") res.CR = "High"
                    res.CR = $t(res.CR)
                    break;
                case "IR":
                    if (elt[1] === "L") res.IR = "Low"
                    else if (elt[1] === "M") res.IR = "Medium"
                    else if (elt[1] === "H") res.IR = "High"
                    res.IR = $t(res.IR)
                    break;
                case "AR":
                    if (elt[1] === "L") res.AR = "Low"
                    else if (elt[1] === "M") res.AR = "Medium"
                    else if (elt[1] === "H") res.AR = "High"
                    res.AR = $t(res.AR)
                    break;
                case "MAV":
                    if (elt[1] === "N") res.MAV = "Network"
                    else if (elt[1] === "A") res.MAV = "Adjacent Network"
                    else if (elt[1] === "L") res.MAV = "Local"
                    else if (elt[1] === "P") res.MAV = "Physical"
                    res.MAV = $t(res.MAV)
                    break;
                case "MAC":
                    if (elt[1] === "L") res.MAC = "Low"
                    else if (elt[1] === "H") res.MAC = "High"
                    res.MAC = $t(res.MAC)
                    break;
                case "MPR":
                    if (elt[1] === "N") res.MPR = "None"
                    else if (elt[1] === "L") res.MPR = "Low"
                    else if (elt[1] === "H") res.MPR = "High"
                    res.MPR = $t(res.MPR)
                    break;
                case "MUI":
                    if (elt[1] === "N") res.MUI = "None"
                    else if (elt[1] === "R") res.MUI = "Required"
                    res.MUI = $t(res.MUI)
                    break;
                case "MS":
                    if (elt[1] === "U") res.MS = "Unchanged"
                    else if (elt[1] === "C") res.MS = "Changed"
                    res.MS = $t(res.MS)
                    break;
                case "MC":
                    if (elt[1] === "N") res.MC = "None"
                    else if (elt[1] === "L") res.MC = "Low"
                    else if (elt[1] === "H") res.MC = "High"
                    res.MC = $t(res.MC)
                    break;
                case "MI":
                    if (elt[1] === "N") res.MI = "None"
                    else if (elt[1] === "L") res.MI = "Low"
                    else if (elt[1] === "H") res.MI = "High"
                    res.MI = $t(res.MI)
                    break;
                case "MA":
                    if (elt[1] === "N") res.MA = "None"
                    else if (elt[1] === "L") res.MA = "Low"
                    else if (elt[1] === "H") res.MA = "High"
                    res.MA = $t(res.MA)
                    break;
                default:
                    break;
            }
        }
    }
    return res
}

function cvss4StrToObject(cvss4) {
    var initialState = 'Not Defined'
    var res = {AV:initialState, AC:initialState, AT:initialState, PR:initialState, UI:initialState, VC:initialState, VI:initialState, VA:initialState, SC:initialState, SI:initialState, SA:initialState, S:initialState, AU:initialState, R:initialState, V:initialState, RE:initialState, U:initialState, MAV:initialState, MAC:initialState, MAT:initialState, MPR:initialState, MUI:initialState, MVC:initialState, MVI:initialState, MVA:initialState, MSC:initialState, MSI:initialState, MSA:initialState, CR:initialState, IR:initialState, AR:initialState, E:initialState};
    if (cvss4) {
        var temp = cvss4.split('/');
        for (var i=0; i<temp.length; i++) {
            var elt = temp[i].split(':');
            switch(elt[0]) {
                case "AV":
                    if (elt[1] === "N") res.AV = "Network"
                    else if (elt[1] === "A") res.AV = "Adjacent"
                    else if (elt[1] === "L") res.AV = "Local"
                    else if (elt[1] === "P") res.AV = "Physical"
                    res.AV = $t(res.AV)
                    break;
                case "AC":
                    if (elt[1] === "L") res.AC = "Low"
                    else if (elt[1] === "H") res.AC = "High"
                    res.AC = $t(res.AC)
                    break;
                case "AT":
                    if (elt[1] === "N") res.AT = "None"
                    else if (elt[1] === "P") res.AT = "Present"
                    res.AT = $t(res.AT)
                    break;
                case "PR":
                    if (elt[1] === "N") res.PR = "None"
                    else if (elt[1] === "L") res.PR = "Low"
                    else if (elt[1] === "H") res.PR = "High"
                    res.PR = $t(res.PR)
                    break;
                case "UI":
                    if (elt[1] === "N") res.UI = "None"
                    else if (elt[1] === "P") res.UI = "Passive"
                    else if (elt[1] === "A") res.UI = "Active"
                    res.UI = $t(res.UI)
                    break;
                case "VC":
                    if (elt[1] === "N") res.VC = "None"
                    else if (elt[1] === "L") res.VC = "Low"
                    else if (elt[1] === "H") res.VC = "High"
                    res.VC = $t(res.VC)
                    break;
                case "VI":
                    if (elt[1] === "N") res.VI = "None"
                    else if (elt[1] === "L") res.VI = "Low"
                    else if (elt[1] === "H") res.VI = "High"
                    res.VI = $t(res.VI)
                    break;
                case "VA":
                    if (elt[1] === "N") res.VA = "None"
                    else if (elt[1] === "L") res.VA = "Low"
                    else if (elt[1] === "H") res.VA = "High"
                    res.VA = $t(res.VA)
                    break;
                case "SC":
                    if (elt[1] === "N") res.SC = "None"
                    else if (elt[1] === "L") res.SC = "Low"
                    else if (elt[1] === "H") res.SC = "High"
                    res.SC = $t(res.SC)
                    break;
                case "SI":
                    if (elt[1] === "N") res.SI = "None"
                    else if (elt[1] === "L") res.SI = "Low"
                    else if (elt[1] === "H") res.SI = "High"
                    res.SI = $t(res.SI)
                    break;
                case "SA":
                    if (elt[1] === "N") res.SA = "None"
                    else if (elt[1] === "L") res.SA = "Low"
                    else if (elt[1] === "H") res.SA = "High"
                    res.SA = $t(res.SA)
                    break;
                case "S":
                    if (elt[1] === "N") res.S = "Negligible"
                    else if (elt[1] === "P") res.S = "Present"
                    res.S = $t(res.S)
                    break;
                case "AU":
                    if (elt[1] === "N") res.AU = "No"
                    else if (elt[1] === "Y") res.AU = "Yes"
                    res.AU = $t(res.AU)
                    break;
                case "R":
                    if (elt[1] === "A") res.R = "Automatic"
                    else if (elt[1] === "U") res.R = "User"
                    else if (elt[1] === "I") res.R = "Irrecoverable"
                    res.R = $t(res.R)
                    break;
                case "V":
                    if (elt[1] === "D") res.V = "Diffuse"
                    else if (elt[1] === "C") res.V = "Concentrated"
                    res.V = $t(res.V)
                    break;
                case "RE":
                    if (elt[1] === "L") res.RE = "Low"
                    else if (elt[1] === "M") res.RE = "Moderate"
                    else if (elt[1] === "H") res.RE = "High"
                    res.RE = $t(res.RE)
                    break;
                case "U":
                    if (elt[1] === "CLEAR") res.U = "Clear"
                    else if (elt[1] === "GREEN") res.U = "Green"
                    else if (elt[1] === "AMBER") res.U = "Amber"
                    else if (elt[1] === "RED") res.U = "Red"
                    res.U = $t(res.U)
                    break;
                case "MAV":
                    if (elt[1] === "N") res.MAV = "Network"
                    else if (elt[1] === "A") res.MAV = "Adjacent"
                    else if (elt[1] === "L") res.MAV = "Local"
                    else if (elt[1] === "P") res.MAV = "Physical"
                    res.MAV = $t(res.MAV)
                    break;
                case "MAC":
                    if (elt[1] === "L") res.MAC = "Low"
                    else if (elt[1] === "H") res.MAC = "High"
                    res.MAC = $t(res.MAC)
                    break;
                case "MAT":
                    if (elt[1] === "N") res.MAT = "None"
                    else if (elt[1] === "P") res.MAT = "Present"
                    res.MAT = $t(res.MAT)
                    break;
                case "MPR":
                    if (elt[1] === "N") res.MPR = "None"
                    else if (elt[1] === "L") res.MPR = "Low"
                    else if (elt[1] === "H") res.MPR = "High"
                    res.MPR = $t(res.MPR)
                    break;
                case "MUI":
                    if (elt[1] === "N") res.MUI = "None"
                    else if (elt[1] === "P") res.MUI = "Passive"
                    else if (elt[1] === "A") res.MUI = "Active"
                    res.MUI = $t(res.MUI)
                    break;
                case "MVC":
                    if (elt[1] === "N") res.MVC = "None"
                    else if (elt[1] === "L") res.MVC = "Low"
                    else if (elt[1] === "H") res.MVC = "High"
                    res.MVC = $t(res.MVC)
                    break;
                case "MVI":
                    if (elt[1] === "N") res.MVI = "None"
                    else if (elt[1] === "L") res.MVI = "Low"
                    else if (elt[1] === "H") res.MVI = "High"
                    res.MVI = $t(res.MVI)
                    break;
                case "MVA":
                    if (elt[1] === "N") res.MVA = "None"
                    else if (elt[1] === "L") res.MVA = "Low"
                    else if (elt[1] === "H") res.MVA = "High"
                    res.MVA = $t(res.MVA)
                    break;
                case "MSC":
                    if (elt[1] === "N") res.MSC = "None"
                    else if (elt[1] === "L") res.MSC = "Low"
                    else if (elt[1] === "H") res.MSC = "High"
                    res.MSC = $t(res.MSC)
                    break;
                case "MSI":
                    if (elt[1] === "N") res.MSI = "None"
                    else if (elt[1] === "L") res.MSI = "Low"
                    else if (elt[1] === "H") res.MSI = "High"
                    res.MSI = $t(res.MSI)
                    break;
                case "MSA":
                    if (elt[1] === "N") res.MSA = "None"
                    else if (elt[1] === "L") res.MSA = "Low"
                    else if (elt[1] === "H") res.MSA = "High"
                    res.MSA = $t(res.MSA)
                    break;
                case "CR":
                    if (elt[1] === "H") res.CR = "High"
                    else if (elt[1] === "M") res.CR = "Medium"
                    else if (elt[1] === "L") res.CR = "Low"
                    res.CR = $t(res.CR)
                    break;
                case "IR":
                    if (elt[1] === "H") res.IR = "High"
                    else if (elt[1] === "M") res.IR = "Medium"
                    else if (elt[1] === "L") res.IR = "Low"
                    res.IR = $t(res.IR)
                    break;
                case "AR":
                    if (elt[1] === "H") res.AR = "High"
                    else if (elt[1] === "M") res.AR = "Medium"
                    else if (elt[1] === "L") res.AR = "Low"
                    res.AR = $t(res.AR)
                    break;
                case "E":
                    if (elt[1] === "A") res.E = "Attacked"
                    else if (elt[1] === "P") res.E = "POC"
                    else if (elt[1] === "U") res.E = "Unreported"
                    res.E = $t(res.E)
                    break;
                default:
                    break;
            }
        }
    }
    return res
}

async function prepAuditData(data, settings) {
    /** CVSS Colors for table cells */
    var noneColor = settings.report.public.cvssColors.noneColor.replace('#', ''); //default of blue ("#4A86E8")
    var lowColor = settings.report.public.cvssColors.lowColor.replace('#', ''); //default of green ("#008000")
    var mediumColor = settings.report.public.cvssColors.mediumColor.replace('#', ''); //default of yellow ("#f9a009")
    var highColor = settings.report.public.cvssColors.highColor.replace('#', ''); //default of red ("#fe0000")
    var criticalColor = settings.report.public.cvssColors.criticalColor.replace('#', ''); //default of black ("#212121")

    var cellNoneColor = '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="' + noneColor + '"/></w:tcPr>';
    var cellLowColor = '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="'+lowColor+'"/></w:tcPr>';
    var cellMediumColor = '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="'+mediumColor+'"/></w:tcPr>';
    var cellHighColor = '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="'+highColor+'"/></w:tcPr>';
    var cellCriticalColor = '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="'+criticalColor+'"/></w:tcPr>';

    var result = {}
    result.name = data.name || "undefined"
    result.auditType = $t(data.auditType) || "undefined"
    result.date = data.date || "undefined"
    result.date_start = data.date_start || "undefined"
    result.date_end = data.date_end || "undefined"
    if (data.customFields) {
        for (var field of data.customFields) {
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
        result.company.shortName = data.company.shortName || result.company.name
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
    result.reviewers = []
    data.reviewers.forEach(reviewer => {
        result.reviewers.push({
            username: reviewer.username || "undefined",
            firstname: reviewer.firstname || "undefined",
            lastname: reviewer.lastname || "undefined",
            email: reviewer.email || "undefined",
            phone: reviewer.phone || "undefined",
            role: reviewer.role || "undefined"
        })
    })
    
    result.collaborators = []
    data.collaborators.forEach(collab => {
        result.collaborators.push({
            username: collab.username || "undefined",
            firstname: collab.firstname || "undefined",
            lastname: collab.lastname || "undefined",
            email: collab.email || "undefined",
            phone: collab.phone || "undefined",
            role: collab.role || "undefined"
        })
    })
    result.language = data.language || "undefined"
    result.scope = data.scope.toObject() || []

    result.findings = []
    for (var finding of data.findings) {
        var tmpFinding = {
            title: finding.title || "",
            vulnType: $t(finding.vulnType) || "",
            description: await splitHTMLParagraphs(finding.description),
            observation: await splitHTMLParagraphs(finding.observation),
            remediation: await splitHTMLParagraphs(finding.remediation),
            remediationComplexity: finding.remediationComplexity || "",
            priority: finding.priority || "",
            references: finding.references || [],
            poc: await splitHTMLParagraphs(finding.poc),
            affected: finding.scope || "",
            status: finding.status || "",
            category: $t(finding.category) || $t("No Category"),
            identifier: "IDX-" + utils.lPad(finding.identifier),
            retestStatus: finding.retestStatus || "",
            retestDescription: await splitHTMLParagraphs(finding.retestDescription)
        }

        if (settings.report.public.scoringMethods.CVSS3) {
            // Handle CVSS 3.1
            var tmpCVSS = new cvss.Cvss3P1(finding.cvssv3).createJsonSchema();

            if (tmpCVSS.baseSeverity) {
                tmpCVSS.baseSeverity = tmpCVSS.baseSeverity.charAt(0).toUpperCase() + tmpCVSS.baseSeverity.slice(1).toLowerCase()
            }

            if (tmpCVSS.temporalSeverity) {
                tmpCVSS.temporalSeverity = tmpCVSS.temporalSeverity.charAt(0).toUpperCase() + tmpCVSS.temporalSeverity.slice(1).toLowerCase()
            }

            if (tmpCVSS.environmentalSeverity) {
                tmpCVSS.environmentalSeverity = tmpCVSS.environmentalSeverity.charAt(0).toUpperCase() + tmpCVSS.environmentalSeverity.slice(1).toLowerCase()
            }

            tmpFinding.cvss = {
                vectorString: tmpCVSS.vectorString || "",
                baseMetricScore: tmpCVSS.baseScore || "",
                baseSeverity: tmpCVSS.baseSeverity || "",
                temporalMetricScore: tmpCVSS.temporalScore || "",
                temporalSeverity: tmpCVSS.temporalSeverity || "",
                environmentalMetricScore: tmpCVSS.environmentalScore || "",
                environmentalSeverity: tmpCVSS.environmentalSeverity || ""
            }
    
            if (tmpCVSS.baseSeverity === "Low") tmpFinding.cvss.cellColor = cellLowColor
            else if (tmpCVSS.baseSeverity === "Medium") tmpFinding.cvss.cellColor = cellMediumColor
            else if (tmpCVSS.baseSeverity === "High") tmpFinding.cvss.cellColor = cellHighColor
            else if (tmpCVSS.baseSeverity === "Critical") tmpFinding.cvss.cellColor = cellCriticalColor
            else tmpFinding.cvss.cellColor = cellNoneColor
    
            if (tmpCVSS.temporalSeverity === "Low") tmpFinding.cvss.temporalCellColor = cellLowColor
            else if (tmpCVSS.temporalSeverity === "Medium") tmpFinding.cvss.temporalCellColor = cellMediumColor
            else if (tmpCVSS.temporalSeverity === "High") tmpFinding.cvss.temporalCellColor = cellHighColor
            else if (tmpCVSS.temporalSeverity === "Critical") tmpFinding.cvss.temporalCellColor = cellCriticalColor
            else tmpFinding.cvss.temporalCellColor = cellNoneColor
    
            if (tmpCVSS.environmentalSeverity === "Low") tmpFinding.cvss.environmentalCellColor = cellLowColor
            else if (tmpCVSS.environmentalSeverity === "Medium") tmpFinding.cvss.environmentalCellColor = cellMediumColor
            else if (tmpCVSS.environmentalSeverity === "High") tmpFinding.cvss.environmentalCellColor = cellHighColor
            else if (tmpCVSS.environmentalSeverity === "Critical") tmpFinding.cvss.environmentalCellColor = cellCriticalColor
            else tmpFinding.cvss.environmentalCellColor = cellNoneColor
    
            tmpFinding.cvssObj = cvssStrToObject(tmpCVSS.vectorString)
        }
        
        if (settings.report.public.scoringMethods.CVSS4) {
            // Handle CVSS 4.0
            var tmpCVSS = new cvss.Cvss4P0(finding.cvssv4).createJsonSchema();

            if (tmpCVSS.baseSeverity) {
                tmpCVSS.baseSeverity = tmpCVSS.baseSeverity.charAt(0).toUpperCase() + tmpCVSS.baseSeverity.slice(1).toLowerCase()
            }

            tmpFinding.cvss4 = {
                vectorString: tmpCVSS.vectorString || "",
                baseScore: tmpCVSS.baseScore || "",
                baseSeverity: tmpCVSS.baseSeverity || "",
            }

            if (tmpCVSS.baseSeverity === "Low") tmpFinding.cvss4.cellColor = cellLowColor
            else if (tmpCVSS.baseSeverity === "Medium") tmpFinding.cvss4.cellColor = cellMediumColor
            else if (tmpCVSS.baseSeverity === "High") tmpFinding.cvss4.cellColor = cellHighColor
            else if (tmpCVSS.baseSeverity === "Critical") tmpFinding.cvss4.cellColor = cellCriticalColor
            else tmpFinding.cvss4.cellColor = cellNoneColor

            tmpFinding.cvss4Obj = cvss4StrToObject(tmpCVSS.vectorString)
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

    result.categories = _
        .chain(result.findings)
        .groupBy("category")
        .map((value,key) => {return {categoryName:key, categoryFindings:value}})
        .value()

    // POC: Process observations if they exist
    result.observations = []
    if (data.observations && Array.isArray(data.observations)) {
        for (var observation of data.observations) {
            var tmpObs = {
                title: observation.title || "",
                observationType: observation.observationType?.name || "",
                description: await splitHTMLParagraphs(observation.description),
                evidence: await splitHTMLParagraphs(observation.evidence),
                impact: await splitHTMLParagraphs(observation.impact),
                recommendation: await splitHTMLParagraphs(observation.recommendation),
                effortLevel: observation.effortLevel || "",
                priority: observation.priority || "",
                references: observation.references || [],
                poc: await splitHTMLParagraphs(observation.poc),
                affected: observation.scope || "",
                status: observation.status || "",
                category: observation.category || $t("No Category"),
                identifier: "OBS-" + utils.lPad(observation.identifier),
                verificationStatus: observation.verificationStatus || ""
            }

            // Handle flexible risk scoring
            if (observation.riskScore) {
                var riskScore = observation.riskScore;
                tmpObs.riskScore = {
                    method: riskScore.method || "custom",
                    score: riskScore.score || 0,
                    severity: riskScore.severity || "Medium",
                    vector: riskScore.vector || ""
                }

                // Assign cell color based on severity
                if (riskScore.severity === "Low") tmpObs.riskScore.cellColor = cellLowColor
                else if (riskScore.severity === "Medium") tmpObs.riskScore.cellColor = cellMediumColor
                else if (riskScore.severity === "High") tmpObs.riskScore.cellColor = cellHighColor
                else if (riskScore.severity === "Critical") tmpObs.riskScore.cellColor = cellCriticalColor
                else tmpObs.riskScore.cellColor = cellNoneColor

                // For CVSS-based scoring, parse vector
                if (riskScore.method === 'cvss3' && riskScore.vector) {
                    tmpObs.cvssObj = cvssStrToObject(riskScore.vector)
                } else if (riskScore.method === 'cvss4' && riskScore.vector) {
                    tmpObs.cvss4Obj = cvss4StrToObject(riskScore.vector)
                }
            }

            // Handle custom fields
            if (observation.customFields) {
                for (var field of observation.customFields) {
                    var fieldType = field.customField.fieldType
                    var label = field.customField.label
                    if (fieldType === 'text')
                        tmpObs[_.deburr(label.toLowerCase()).replace(/\s/g, '').replace(/[^\w]/g, '_')] = await splitHTMLParagraphs(field.text)
                    else if (fieldType !== 'space')
                        tmpObs[_.deburr(label.toLowerCase()).replace(/\s/g, '').replace(/[^\w]/g, '_')] = field.text
                }
            }

            result.observations.push(tmpObs)
        }

        // Group observations by category (similar to findings)
        result.observationsCategories = _
            .chain(result.observations)
            .groupBy("category")
            .map((value,key) => {return {categoryName:key, categoryObservations:value}})
            .value()
    }

    result.creator = {}
    if (data.creator) {
        result.creator.username = data.creator.username || "undefined"
        result.creator.firstname = data.creator.firstname || "undefined"
        result.creator.lastname = data.creator.lastname || "undefined"
        result.creator.email = data.creator.email || "undefined"
        result.creator.phone = data.creator.phone || "undefined"
        result.creator.role = data.creator.role || "undefined"
    }

    for (var section of data.sections) {
        var formatSection = { 
            name: $t(section.name)
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
    replaceSubTemplating(result)
    return result
}

async function splitHTMLParagraphs(data) {
    var result = []
    if (!data)
        return result

    var splitted = data.split(/(<img.+?src=".*?".+?alt=".*?".*?>)/)

    for (var value of splitted){
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

function replaceSubTemplating(o, originalData = o) {
    var regexp = /\{_\{([a-zA-Z0-9\[\]\_\.]+)((\s*\|\s*[a-zA-Z0-9\_]+)*)\}_\}/gm;
    if (Array.isArray(o))
        o.forEach(key => replaceSubTemplating(key, originalData))
    else if (typeof o === 'object' && !!o) {
        Object.keys(o).forEach(key => {
            if (typeof o[key] === 'string') {
                o[key] = o[key].replace(regexp, (match, word, filters) => {
                    let value = _.get(originalData, word.trim(), '');
                    if (filters) {
                        filters = filters.split('|').map(f => f.trim()).filter(f => f);
                        filters.forEach(filter => {
                            if (reportFiltersCustom.subTemplatingFilters[filter]) {
                                value = reportFiltersCustom.subTemplatingFilters[filter](value);
                            }
                            else if (reportFilters.subTemplatingFilters[filter]) {
                                value = reportFilters.subTemplatingFilters[filter](value);
                            }
                        });
                    }
                    return value;
                });
            } else {
                replaceSubTemplating(o[key], originalData);
            }
        });
    }
}
