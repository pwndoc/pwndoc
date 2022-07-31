var gLocale = 'en'

function setLocale(locale) {
    gLocale = locale
}
exports.setLocale = setLocale

function translate(message, locale = gLocale) {
    try {
        let dictionary = require(`./${locale}`)
        return dictionary[message] || message
    }
    catch (error) {
        return message
    }
}
exports.translate = translate