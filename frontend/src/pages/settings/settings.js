import { Notify } from 'quasar'

import SettingsService from '@/services/settings'
import UserService from '@/services/user'

export default {
    data: () => {
        return {
            UserService: UserService,
            settings: {
                imageBorder: false,
                imageBorderColor: "#000000"
            }   
        }
    },
    beforeRouteEnter(to, from, next) {
        if (!UserService.isAllowed('settings:update'))
            next('/audits')
        next()
    },

    mounted: function() {
        this.getSettings()
    },

    methods: {
        getSettings: function() {
            SettingsService.getSettings()
            .then((data) => {
                this.settings = data.data.datas;
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        updateSettings: function() {
            SettingsService.updateSettings(this.settings)
            .then((data) => {
                Notify.create({
                    message: "Settings updated successfully",
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },
    }
}