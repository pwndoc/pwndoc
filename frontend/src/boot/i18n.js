import { defineBoot } from '#q-app/wrappers'
import { createI18n } from 'vue-i18n'
import messages from '@/i18n'

let language = localStorage.getItem("system_language");
  if (!language) {
      language = "en-US";
      localStorage.setItem("system_language", language);
  }

  const i18n = createI18n({
    legacy: false, // Use Composition API
    globalInjection: true, // Enable global $t in templates
    locale: language,
    fallbackLocale: 'en-US',
    messages
  })

export default defineBoot(({ app }) => {
  app.use(i18n)
})

export const $t = (...args) => i18n.global.t(...args)