import Vue from 'vue'
import VueI18n from 'vue-i18n'
import messages from '@/i18n'

Vue.use(VueI18n)

var language = localStorage.getItem("system_language");
if (!language) {
    language = "en-US";
    localStorage.setItem("system_language", language);
}

const i18n = new VueI18n({
  locale: language,
  fallbackLocale: 'en-US',
  messages
})

export default ({ app }) => {
  app.i18n = i18n
}

export { i18n }

export var $t = (...param) => {
  return i18n.t(...param);
}

