import { Notify, Dialog } from 'quasar'

import SettingsService from '@/services/settings'
import UserService from '@/services/user'

export default {
    data: () => {
        return {
            loading: true,
            initialLoading: true,
            UserService: UserService,
            settings: {},
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
        document.addEventListener('keydown', this._listener, false)
    },

    destroyed: function() {
        document.removeEventListener('keydown', this._listener, false)
    },

    methods: {
        _listener: function(e) {
            if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
                e.preventDefault();
                this.updateSettings();
            }
        },

        getSettings: function() {
            SettingsService.getSettings()
            .then((data) => {
                this.settings = data.data.datas;
                this.settingsOrig = this.$_.cloneDeep(this.settings);
                this.loading = false;
                this.initialLoading = false;
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
                this.$settings.refresh();
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
                this.$settings.refresh();
                this.getSettings();
                Notify.create({
                    message: "Settings reverted successfully",
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        importSettings: function(file) {
            this.loading = true;
            var fileReader = new FileReader();
            fileReader.onloadend = async (e) => {
                try {
                    var settings = JSON.parse(fileReader.result);
                    if (typeof settings === 'object') {
                        Dialog.create({
                            title: 'Importing settings !',
                            message: `Do you really wish to import the new settings? You will lose all current settings that are replaced.`,
                            ok: {label: 'Confirm', color: 'negative'},
                            cancel: {label: 'Cancel', color: 'white'}
                        })
                        .onOk(async () => {
                            this.loading = true;
                            await SettingsService.updateSettings(settings);
                            this.getSettings();
                            Notify.create({
                                message: "Settings imported successfully",
                                color: 'positive',
                                textColor:'white',
                                position: 'top-right'
                            })
                        })
                    } else {
                        throw "JSON must be an object.";
                    }
                }
                catch (err) {
                    console.log(err);
                    if (err.message) errMsg = `Error while parsing JSON content: ${err.message}`;
                    Notify.create({
                        message: errMsg,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                }
            };
            var fileContent = new Blob(file, {type : 'application/json'});
            console.log(fileContent);
            fileReader.readAsText(fileContent);
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