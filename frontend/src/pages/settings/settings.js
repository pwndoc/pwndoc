import { Notify } from 'quasar'

import SettingsService from '@/services/settings'
import UserService from '@/services/user'

export default {
    data: () => {
        return {
            loading: true,
            UserService: UserService,
            settings: {
                imageBorder: false,
                imageBorderColor: "#000000",
                cvssColors : {
                    noneColor : "#4a86e8",
                    lowColor : "#008000",
                    mediumColor : "#f9a009",
                    highColor : "#fe0000",
                    criticalColor : "#212121" 
                },
                enableReviews: false,
                mandatoryReview: false,
                minReviewers: 1,
                removeApprovalsUponUpdate: false
            },
            canEdit: false
        }
    },
    beforeRouteEnter(to, from, next) {
        if (!UserService.isAllowed('settings:read'))
            next('/audits')
        next()
    },

    mounted: function() {
        this.getSettings()
        this.canEdit = this.UserService.isAllowed('settings:update');
    },

    methods: {
        getSettings: function() {
            SettingsService.getSettings()
            .then((data) => {
                this.settings = data.data.datas;
                this.loading = false;
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
            var min = 1;
            var max = 99;
            if(this.settings.minReviewers < min || this.settings.minReviewers > max) {
                this.settings.minReviewers = this.settings.minReviewers < min ? min: max;
            }
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

        updateSettingsValueRange: function(paramName, min, max) {
            if(this.settings[paramName] < min || this.settings[paramName] > max) {
                this.settings[paramName] = this.settings[paramName] < min ? min: max;
            }
            this.updateSettings();
        }, 

        revertToDefaults: function() {

        },

        importSettings: function() {

        },

        exportSettings: async function() {
            this.loading = true;
            await exportSettings();
            this.loading = false;
        }
    }
}