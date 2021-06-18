import { Notify, Dialog } from 'quasar'

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
            settingsOrig : {},
            canEdit: false
        }
    },
    beforeRouteEnter(to, from, next) {
        if (!UserService.isAllowed('settings:read'))
            next('/audits')
        next()
    },

    beforeRouteLeave (to, from , next) {
        if (this.unsavedChanges()) {
            Dialog.create({
            title: 'There are unsaved changes !',
            message: `Do you really want to leave ?`,
            ok: {label: 'Confirm', color: 'negative'},
            cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(() => next())
        }
        else
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
                this.settingsOrig = this.$_.cloneDeep(this.settings);
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
                this.settingsOrig = this.$_.cloneDeep(this.settings);
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
            Dialog.create({
                title: 'Reverting settings !',
                message: `Do you really wish to revert the settings to the defaults? You will lose all current settings.`,
                ok: {label: 'Confirm', color: 'negative'},
                cancel: {label: 'Cancel', color: 'white'}
            })
            .onOk(async () => {
                this.loading = true;
                await SettingsService.revertDefaults();
                this.getSettings();
                Notify.create({
                    message: "Settings reverted successfully",
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        importSettings: function() {

        },

        exportSettings: async function() {
            this.loading = true;
            var response = await SettingsService.exportSettings();
            var blob = new Blob([JSON.stringify(response.data)], {type: "application/json"});
            var link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = response.headers['content-disposition'].split('"')[1];
            document.body.appendChild(link);
            link.click();
            link.remove();
            this.loading = false;
        },

        unsavedChanges() {
            return JSON.stringify(this.settingsOrig) !== JSON.stringify(this.settings);
        }
    }
}