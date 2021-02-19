// Filename whitelist validation for template creation
function validFilename(filename) {
    const regex = /^[A-zÀ-ú0-9 \[\]\'()_-]+$/i;
    
    return (regex.test(filename));
}
exports.validFilename = validFilename;

// Escape XML special entities when using {@RawXML} in template generation
function escapeXMLEntities(input) {
    var XML_CHAR_MAP = { '<': '&lt;', '>': '&gt;', '&': '&amp;'};
    var standardEncode = input.replace(/[<>&]/g, function (ch) { return XML_CHAR_MAP[ch]; });
    return standardEncode;
}
exports.escapeXMLEntities = escapeXMLEntities;

// Convert number to 3 digits format if under 100
function lPad(number) {
    if (number <= 99) { number = ("00" + number).slice(-3); }
    return `${number}`;
}
exports.lPad = lPad;

function escapeRegex(regex) {
    return regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}
exports.escapeRegex = escapeRegex

// format accepts any string and will replace the following placeholders:
// %YY   - year (2 digits)
// %YYYY - year (4 digits) 
// %M    - month
// %MM   - month (2 digits always), 
// %m    - english month description
// %D    - day, 
// %DD   - day (2 digits always) 
// %w    - english day of week 
// %W    - day of week (number)
function formatDate(date, format) {
    var day = date.getUTCDate();
    var dayOfWeek = date.getDay();
    var month = date.getUTCMonth() + 1;
    var year = date.getUTCFullYear();

    var monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var formatedDate = format
        .replace("%YYYY", year)
        .replace("%YY", year)
        .replace("%MM", month < 10 ? `0${month}` : month)
        .replace("%M", month)
        .replace("%m", monthsFull[month - 1])
        .replace("%DD", day < 10 ? `0${day}` : day)
        .replace("%D", day)
        .replace("%W", dayOfWeek)
        .replace("%w", days[dayOfWeek]);;

    return formatedDate
}
exports.formatDate = formatDate;
