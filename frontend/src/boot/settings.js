import { boot } from 'quasar/wrappers'
import Settings from '@/services/settings';

export default async ({ app }) => {
    app.config.globalProperties.$settings = {};

    try {
        app.config.globalProperties.$settings = (await Settings.getPublicSettings()).data.datas;
    } catch(err) {}
    
    app.config.globalProperties.$settings.refresh = async () => {
        let newSettings = {};

        try {
            newSettings = (await Settings.getPublicSettings()).data.datas;
        } catch(err) {}

        app.config.globalProperties.$settings = { ...newSettings, refresh: app.config.globalProperties.$settings.refresh };
    }
}
