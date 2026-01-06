import { defineBoot } from '#q-app/wrappers';
import Settings from '@/services/settings';

export default defineBoot(async({ app }) => {
    let settings = {}

    try {
      Object.assign(settings, (await Settings.getPublicSettings()).data.datas)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }

    settings.refresh = async () => {
      try {
        const newSettings = (await Settings.getPublicSettings()).data.datas
        Object.assign(settings, newSettings)
      } catch (err) {
        console.error('Failed to refresh settings:', err)
      }
    }

    app.config.globalProperties.$settings = settings
    app.provide('$settings', settings)
})
