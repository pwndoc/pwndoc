import { boot } from 'quasar/wrappers'

import { createI18n } from 'vue-i18n'
import { useI18n } from "vue-i18n";

import messages from '@/i18n'

export default boot(({ app }) => {
  var language = localStorage.getItem("system_language");
  if (!language) {
      language = "en-US";
      localStorage.setItem("system_language", language);
  }

  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: language,
    fallbackLocale: 'en-US',
    messages
  });

  app.use(i18n);
})

export var $t = (...param) => {
  const { t } = useI18n();
  return t(...param);
}