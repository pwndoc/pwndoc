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
var Settings = require('mongoose').model('Settings');
var CVSS31 = require('./cvsscalc31.js');
var translate = require('../translate')
var $t

// Generate document with docxtemplater
async function generateDoc(audit) {
    var templatePath = `${__basedir}/../report-templates/${audit.template.name}.${audit.template.ext || 'docx'}`
    var content = fs.readFileSync(templatePath, "binary");

    var zip = new JSZip(content);

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
        return [0,0]
    }

    if (settings.report.private.imageBorder && settings.report.private.imageBorderColor)
        opts.border = settings.report.private.imageBorderColor.replace('#', '')

    try {
        var imageModule = new ImageModule(opts);
    }
    catch(err) {
        console.log(err)
    }
    var doc = new Docxtemplater().attachModule(imageModule).loadZip(zip).setOptions({parser: angularParser, paragraphLoop: true});
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

// Creates a text block or simple location bookmark:
// - Text block: {@name | bookmarkCreate: identifier | p}
// - Location: {@identifier | bookmarkCreate | p}
// Invalid identifier characters are replaced by underscores.
expressions.filters.bookmarkCreate = function(input, refid = null) {
    let rand_id = Math.floor(Math.random() * 1000000 + 1000);
    let parsed_id = (refid ? refid : input).replace(/[^a-zA-Z0-9_]/g, '_');

    // Accept both text and OO-XML as input.
    if (input.indexOf('<w:r') !== 0) {
        input = '<w:r><w:t>' + input + '</w:t></w:r>';
    }

    return '<w:bookmarkStart w:id="' + rand_id + '" '
        + 'w:name="' + parsed_id + '"/>'
        + (refid ? input : '')
        + '<w:bookmarkEnd w:id="' + rand_id + '"/>';
}

// Creates a hyperlink to a text block or location bookmark:
// {@input | bookmarkLink: identifier | p}
expressions.filters.bookmarkLink = function(input, identifier) {
    return '<w:hyperlink w:anchor="' + identifier + '">'
        + '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>'
        + '<w:t>' + input + '</w:t>'
        + '</w:r></w:hyperlink>';
}

// Creates a clickable dynamic field referencing a text block bookmark:
// {@identifier | bookmarkRef | p}
// Invalid identifier characters are replaced by underscores.
expressions.filters.bookmarkRef = function(input) {
    return '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">'
        + ' REF ' + input.replace(/[^a-zA-Z0-9_]/g, '_') + ' \\h </w:instrText></w:r>'
        + '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>'
        + input + '</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
}

// Capitalizes input first letter: {input | capfirst}
expressions.filters.capfirst = function(input) {
    if (!input || input == "undefined") return input;
    return input.replace(/^\w/, (c) => c.toUpperCase());
}

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
        var options = { year: 'numeric', month: '2-digit', day: '2-digit'}

        if (style === "full")
            options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}

        return date.toLocaleDateString(locale, options)

    }
}

// Convert identifier prefix to a user defined prefix: {identifier | changeID: 'PRJ-'}
expressions.filters.changeID = function (input, prefix) {
    return input.replace("IDX-", prefix);
}

// Default value: returns input if it is truthy, otherwise its parameter.
// Example producing a comma-separated list of affected systems, falling-back on the whole audit scope: {affected | lines | d: (scope | select: 'name') | join: ', '}
expressions.filters.d = function(input, s) {
    return (input && input != "undefined") ? input : s;
}

// Display "From ... to ..." dates nicely, removing redundant information when the start and end date occur during the same month or year: {date_start | fromTo: date_end:'fr' | capfirst}
// To internationalize or customize the resulting string, associate the desired output to the strings "from {0} to {1}" and "on {0}" in your Pwndoc translate file.
expressions.filters.fromTo = function(start, end, locale) {
    const start_date = new Date(start);
    const end_date = new Date(end);
    let options = {}, start_str = '', end_str = '';
    let str = "from {0} to {1}";

    if (start_date == "Invalid Date" || end_date == "Invalid Date") return start;

    options = {day: '2-digit', month: '2-digit', year: 'numeric'};
    end_str = end_date.toLocaleDateString(locale, options);

    if (start_date.getYear() != end_date.getYear()) {
        options = {day: '2-digit', month: '2-digit', year: 'numeric'};
        start_str = start_date.toLocaleDateString(locale, options);
    }
    else if (start_date.getMonth() != end_date.getMonth()) {
        options = {day: '2-digit', month: '2-digit'};
        start_str = start_date.toLocaleDateString(locale, options);
    }
    else if (start_date.getDay() != end_date.getDay()) {
        options = {day: '2-digit'};
        start_str = start_date.toLocaleDateString(locale, options);
    }
    else {
        start_str = end_str;
        str = "on {0}";
    }

    return translate.translate(str).format(start_str, end_str);
}

// Group input elements by an attribute: {#findings | groupBy: 'severity'}{title}{/findings | groupBy: 'severity'}
// Source: https://stackoverflow.com/a/34890276
expressions.filters.groupBy = function(input, key) {
    return input.reduce(function(rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
}

// Returns the initials from an input string (typically a firstname): {creator.firstname | initials}
expressions.filters.initials = function(input) {
    if (!input || input == "undefined") return input;
    return input.replace(/(\w)\w+/gi,"$1.");
}

// Returns a string which is a concatenation of input elements using an optional separator string: {references | join: ', '}
// Can also be used to build raw OOXML strings.
expressions.filters.join = function(input, sep = '') {
    if (!input || input == "undefined") return input;
    return input.join(sep);
}

// Returns the length (ie. number of items for an array) of input: {input | length}
// Can be used as a conditional to check the emptiness of a list: {#input | length}Not empty{/input | length}
expressions.filters.length = function(input) {
    return input.length;
}

// Takes a multilines input strings (either raw or simple HTML paragraphs) and returns each line as an ordered list: {input | lines}
expressions.filters.lines = function(input) {
    if (!input || input == "undefined") return input;
    if (input.indexOf('<p>') == 0) {
        return input.substring(3,input.length - 4).split('</p><p>');
    }
    else {
        return input.split("\n");
    }
}

// Creates a hyperlink: {@input | linkTo: 'https://example.com' | p}
expressions.filters.linkTo = function(input, url) {
    return '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
        + '<w:r><w:instrText xml:space="preserve"> HYPERLINK "' + url + '" </w:instrText></w:r>'
        + '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
        + '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>'
        + '<w:t>' + input + '</w:t>'
        + '</w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
}

// Loop over the input object, providing acccess to its keys and values: {#findings | loopObject}{key}{value.name}{/findings | loopObject}
// Source: https://stackoverflow.com/a/60887987
expressions.filters.loopObject = function(input) {
    return Object.keys(input).map(function(key) {
        return { key , value : input[key]};
    });
}

// Lowercases input: {input | lower}
expressions.filters.lower = function(input) {
    if (!input || input == "undefined") return input;
        return input.toLowerCase();
}

// Creates a clickable "mailto:" link, assumes that input is an email address if
// no other address has been provided as parameter:
// {@lastname | mailto: email | p}
expressions.filters.mailto = function(input, address = null) {
    return expressions.filters.linkTo(input, 'mailto:' + (address ? address : input));
}

// Applies a filter on a sequence of objects: {scope | select: 'name' | map: lower | join: ', '}
expressions.filters.map = function(input, filter) {
    let args = Array.prototype.slice.call(arguments, 2);
    return input.map(x => expressions.filters[filter](x, ...args));
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

// Embeds input within OOXML paragraph tags, applying an optional style name to it: {@input | p: 'Some style'}
expressions.filters.p = function(input, style = null) {
    let result = '<w:p>';

    if (style !== null ) {
        let style_parsed = style.replaceAll(' ', '');
        result += '<w:pPr><w:pStyle w:val="' + style_parsed + '"/></w:pPr>';
    }
    result += input + '</w:p>';

    return result;
}

// Reverses the input array: {input | reverse}
expressions.filters.reverse = function(input) {
    return input.reverse();
}

// Looks up an attribute from a sequence of objects, doted notation is supported: {findings | select: 'cvss.environmentalSeverity'}
expressions.filters.select = function(input, attr) {
    return input.map(function(item) { return _getPropertyValue(item, attr) });
}

// Sorts the input array according an optional given attribute, dotted notation is supported: {#findings | sort 'cvss.environmentalSeverity'}{name}{/findings | sort 'cvss.environmentalSeverity'}
expressions.filters.sort = function(input, key = null) {
    if (key === null) {
        return input.sort();
    }
    else {
        return input.sort(function(a, b) {
            return _getPropertyValue(a, key) < _getPropertyValue(b, key);
        });
    }
}

// Sort array by supplied field: {#findings | sortArrayByField: 'identifier':1}{/}
// order: 1 = ascending, -1 = descending
expressions.filters.sortArrayByField = function (input, field, order) {
    //invalid order sort ascending
    if(order != 1 && order != -1) order = 1;

    const sorted = input.sort((a,b) => {
        //multiply by order so that if is descending (-1) will reverse the values
        return _.get(a, field).localeCompare(_.get(b, field), undefined, {numeric: true}) * order
    })
    return sorted;
}

// Takes a string as input and split it into an ordered list using a separator: {input | split: ', '}
expressions.filters.split = function(input, sep) {
    if (!input || input == "undefined") return input;
    return input.split(sep);
}

// Capitalizes input first letter of each word, can be associated to 'lower' to normalize case: {creator.lastname | lower | title}
expressions.filters.title= function(input) {
    if (!input || input == "undefined") return input;
    return input.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
}

// Returns the JSON representation of the input value, useful to dump variables content while debugging a template: {input | toJSON}
expressions.filters.toJSON = function(input) {
    return JSON.stringify(input);
}

// Upercases input: {input | upper}
expressions.filters.upper = function(input) {
    if (!input || input == "undefined") return input;
    return input.toUpperCase();
}

// Filters input elements matching a free-form Angular statements: {#findings | where: 'cvss.severity == "Critical"'}{title}{/findings | where: 'cvss.severity == "Critical"'}
// Source: https://docxtemplater.com/docs/angular-parse/#data-filtering
expressions.filters.where = function(input, query) {
    return input.filter(function (item) {
        return expressions.compile(query)(item);
    });
};

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

        if(input[i].cvss.baseSeverity === severity){
            count += 1;
        }
    }

    return count;
}

// Translate using locale from 'translate' folder
// Example: {input | translate: 'fr'}
expressions.filters.translate = function(input, locale) {
    if (!input) return input
    return $t(input, locale)
}

// Filters helper: handles the use of dotted notation as property names.
// Source: https://stackoverflow.com/a/37510735
function _getPropertyValue(obj, dataToRetrieve) {
  return dataToRetrieve
    .split('.')
    .reduce(function(o, k) {
      return o && o[k];
    }, obj);
}

// Filters helper: handles the use of preformated easilly translatable strings.
// Source: https://www.tutorialstonight.com/javascript-string-format.php
String.prototype.format = function () {
    let args = arguments;
    return this.replace(/{([0-9]+)}/g, function (match, index) {
        return typeof args[index] == 'undefined' ? match : args[index];
    });
};

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
            email: collab.email || "undefined",
            phone: collab.phone || "undefined",
            role: collab.role || "undefined"
        })
    })
    result.language = data.language || "undefined"
    result.scope = data.scope.toObject() || []

    result.findings = []
    for (finding of data.findings) {
        var tmpCVSS = CVSS31.calculateCVSSFromVector(finding.cvssv3);
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
            identifier: "IDX-" + utils.lPad(finding.identifier)
        }
        // Handle CVSS
        tmpFinding.cvss = {
            vectorString: tmpCVSS.vectorString || "",
            baseMetricScore: tmpCVSS.baseMetricScore || "",
            baseSeverity: tmpCVSS.baseSeverity || "",
            temporalMetricScore: tmpCVSS.temporalMetricScore || "",
            temporalSeverity: tmpCVSS.temporalSeverity || "",
            environmentalMetricScore: tmpCVSS.environmentalMetricScore || "",
            environmentalSeverity: tmpCVSS.environmentalSeverity || ""
        }
        if (tmpCVSS.baseImpact)
            tmpFinding.cvss.baseImpact = CVSS31.roundUp1(tmpCVSS.baseImpact)
        else
            tmpFinding.cvss.baseImpact = ""
        if (tmpCVSS.baseExploitability)
            tmpFinding.cvss.baseExploitability = CVSS31.roundUp1(tmpCVSS.baseExploitability)
        else
            tmpFinding.cvss.baseExploitability = ""

        if (tmpCVSS.environmentalModifiedImpact)
            tmpFinding.cvss.environmentalModifiedImpact = CVSS31.roundUp1(tmpCVSS.environmentalModifiedImpact)
        else
            tmpFinding.cvss.environmentalModifiedImpact = ""
        if (tmpCVSS.environmentalModifiedExploitability)
            tmpFinding.cvss.environmentalModifiedExploitability = CVSS31.roundUp1(tmpCVSS.environmentalModifiedExploitability)
        else
            tmpFinding.cvss.environmentalModifiedExploitability = ""

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

    result.creator = {}
    if (data.creator) {
        result.creator.username = data.creator.username || "undefined"
        result.creator.firstname = data.creator.firstname || "undefined"
        result.creator.lastname = data.creator.lastname || "undefined"
        result.creator.email = data.creator.email || "undefined"
        result.creator.phone = data.creator.phone || "undefined"
        result.creator.role = data.creator.role || "undefined"
    }

    for (section of data.sections) {
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

function replaceSubTemplating(o, originalData = o){
    var regexp = /\{_\{([a-zA-Z0-9\[\]\_\.]{1,})\}_\}/gm;
    if (Array.isArray(o))
        o.forEach(key => replaceSubTemplating(key, originalData))
    else if (typeof o === 'object' && !!o) {
        Object.keys(o).forEach(key => {
            if (typeof o[key] === 'string') o[key] = o[key].replace(regexp, (match, word) =>  _.get(originalData,word.trim(),''))
            else replaceSubTemplating(o[key], originalData)
        })
    }
}
