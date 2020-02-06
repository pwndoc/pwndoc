function validFilename(filename) {
    const regex = /^[a-z0-9 \[\]()_-]+$/i;
    
    return (regex.test(filename));
}
exports.validFilename = validFilename;