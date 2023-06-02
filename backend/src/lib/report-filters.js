var expressions = require('angular-expressions');
var html2ooxml = require('./html2ooxml');
var translate = require('../translate')
var _ = require('lodash');

// *** Angular parser filters ***

// Creates a text block or simple location bookmark:
// - Text block: {@name | bookmarkCreate: identifier | p}
// - Location: {@identifier | bookmarkCreate | p}
// Identifiers are sanitized as follow:
// - Invalid characters replaced by underscores.
// - Identifiers longer than 40 chars are truncated (MS-Word limitation).
expressions.filters.bookmarkCreate = function(input, refid = null) {
    let rand_id = Math.floor(Math.random() * 1000000 + 1000);
    let parsed_id = (refid ? refid : input).replace(/[^a-zA-Z0-9_]/g, '_').substring(0,40);

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
// Identifiers are sanitized as follow:
// - Invalid characters replaced by underscores.
// - Identifiers longer than 40 chars are truncated (MS-Word limitation).
expressions.filters.bookmarkLink = function(input, identifier) {
    identifier = identifier.replace(/[^a-zA-Z0-9_]/g, '_').substring(0,40);
    return '<w:hyperlink w:anchor="' + identifier + '">'
        + '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>'
        + '<w:t>' + input + '</w:t>'
        + '</w:r></w:hyperlink>';
}

// Creates a clickable dynamic field referencing a text block bookmark:
// {@identifier | bookmarkRef | p}
// Identifiers are sanitized as follow:
// - Invalid characters replaced by underscores.
// - Identifiers longer than 40 chars are truncated (MS-Word limitation).
expressions.filters.bookmarkRef = function(input) {
    return '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">'
        + ' REF ' + input.replace(/[^a-zA-Z0-9_]/g, '_').substring(0,40) + ' \\h </w:instrText></w:r>'
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
    return expressions.filters.loopObject(
        input.reduce(function(rv, x) {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
        }, {})
    );
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

// Loop over the input object, providing acccess to its keys and values: {#findings | loopObject}{key}{value.title}{/findings | loopObject}
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

// Applies a filter on a sequence of objects: {scope | select: 'name' | map: 'lower' | join: ', '}
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

// Add proper XML tags to embed raw string inside a docxtemplater raw expression: {@('Vulnerability: ' | s) + title | bookmarkCreate: identifier | p}
expressions.filters.s = function(input) {
    return '<w:r><w:t xml:space="preserve">' + input + '</w:t></w:r>';
}

// Looks up an attribute from a sequence of objects, doted notation is supported: {findings | select: 'cvss.environmentalSeverity'}
expressions.filters.select = function(input, attr) {
    return input.map(function(item) { return _.get(item, attr) });
}

// Sorts the input array according an optional given attribute, dotted notation is supported: {#findings | sort 'cvss.environmentalSeverity'}{name}{/findings | sort 'cvss.environmentalSeverity'}
expressions.filters.sort = function(input, key = null) {
    if (key === null) {
        return input.sort();
    }
    else {
        return input.sort(function(a, b) {
            return _.get(a, key) < _.get(b, key);
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
    translate.setLocale(locale)
    if (!input) return input
    return translate.translate(input, locale)
}

module.exports = expressions