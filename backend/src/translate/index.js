var fs = require('fs')
var gLocale = 'en'

function setLocale(locale) {
    gLocale = locale
}
exports.setLocale = setLocale

function translate(message, locale = gLocale) {
    try {
        let dictionary = JSON.parse(fs.readFileSync(`${__dirname}/${locale}.json`))
        return dictionary[message] || message
    }
    catch (error) {
        return message
    }
}
exports.translate = translate