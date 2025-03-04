var fs = require('fs')
var gLocale = 'en'

function setLocale(locale) {
    gLocale = locale
}
exports.setLocale = setLocale

function translate(message, locale = gLocale) {
    try {
        let availableLocales = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''))
        if (!availableLocales.includes(locale)) {
            return message
        }
        let dictionary = JSON.parse(fs.readFileSync(`${__dirname}/${locale}.json`))
        if (dictionary.hasOwnProperty(message)) {
            return dictionary[message] || message
        } else {
            return message
        }
    }
    catch (error) {
        return message
    }
}
exports.translate = translate