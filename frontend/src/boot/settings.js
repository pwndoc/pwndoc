import Settings from '@/services/settings';

export default async ({ Vue }) => {
    Vue.prototype.$settings = {};

    try {
        Vue.prototype.$settings = (await Settings.getPublicSettings()).data.datas;
    } catch(err) {}
    
    Vue.prototype.$settings.refresh = async () => {
        let newSettings = {};

        try {
            newSettings = (await Settings.getPublicSettings()).data.datas;
        } catch(err) {}

        Vue.prototype.$settings = { ...newSettings, refresh: Vue.prototype.$settings.refresh };
    }
}
