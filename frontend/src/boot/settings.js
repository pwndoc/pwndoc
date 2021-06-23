import Settings from '@/services/settings';

export default async ({ Vue }) => {
    Vue.prototype.$settings = (await Settings.getPublicSettings()).data.datas;
}
