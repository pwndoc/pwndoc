import Settings from '@/services/settings';

export default ({ Vue }) => {
    Settings.getPublicSettings()
    .then(res => Vue.prototype.$settings = res.data.datas);
}
