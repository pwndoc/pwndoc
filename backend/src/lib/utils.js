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