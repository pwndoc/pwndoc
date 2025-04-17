import { Notify, Dialog } from 'quasar'

import SettingsService from '@/services/settings'
import { useUserStore } from 'src/stores/user'
import BackupService from '@/services/backup'
import Utils from '@/services/utils'

import { $t } from 'boot/i18n'
import LanguageSelector from '@/components/language-selector';

const userStore = useUserStore()

export default {
    data: () => {
        return {
            loading: true,
            userStore: userStore,
            settings: {},
            settingsOrig : {},
            canEdit: false,
            highlightPalette: [
                '#ffff25', '#00ff41', '#00ffff', '#ff00f9', '#0005fd',
                '#ff0000', '#000177', '#00807a', '#008021', '#8e0075',
                '#8f0000', '#817d0c', '#807d78', '#c4c1bb', '#000000'
            ],

            // Backups
            loadingBackups: true,
            backups: [],
            // Datatable headers
            dtBackupHeaders: [
                {name: 'name', label: '', field: 'name', align: 'left', sortable: true},
                {name: 'size', label: '', field: row => Utils.bytesToHumanReadable(row.size), align: 'left', sortable: true},
                {name: 'date', label: '', field: row => Utils.getRelativeDate(row.date), align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            // Datatable pagination
            pagination: {
                page: 1,
                rowsPerPage: 10,
                sortBy: 'date2',
                descending: true
            },
            rowsPerPageOptions: [
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:'All', value:0}
            ],
            // Search filter
            searchBackup: {name: ''},
            customFilter: Utils.customFilter,
            // Selected or New Backup
            currentBackup: {
                name: '',
                data: [],
                password: ''
            },
            backupType: 'full',
            backupEncrypted: false,
            backupStatus: 'idle',
            // If following object modified, update handleBackupTicked accordingly
            backupOptions: [
                {label: $t('audits'), value: 'Audits'},
                {label: $t('vulnerabilities'), value: 'Vulnerabilities', tickStrategy: 'strict', children: [
                    {label: $t('includeVulnerabilitiesUpdates'), value: 'Vulnerabilities Updates'},
                ]},
                {label: $t('users'), value: 'Users'},
                {label: $t('customers'), value: 'Customers', children: [
                    {label: $t('companies'), value: 'Companies'},
                    {label: $t('clients'), value: 'Clients'}
                ]},
                {label: $t('templates'), value: 'Templates'},
                {label: $t('customData'), value: 'Custom Data', children: [
                    {label: $t('auditTypes'), value: 'Audit Types'},
                    {label: $t('vulnerabilityTypes'), value: 'Vulnerability Types'},
                    {label: $t('vulnerabilityCategories'), value: 'Vulnerability Categories'},
                    {label: $t('customFields'), value: 'Custom Fields'},
                    {label: $t('customSections'), value: 'Custom Sections'}
                ]},
                {label: $t('settings'), value: 'Settings'},
            ],
            restoreOptions: [],
            restoreMode: 'revert',
            uploadBackupFile: null,
            uploadBackupLoading: false,
            uploadProgress: 0
        }
    },
    components: {
        LanguageSelector
    },

    beforeRouteLeave (to, from , next) {
        if (this.unsavedChanges()) {
            Dialog.create({
            title: $t('msg.thereAreUnsavedChanges'),
            message: $t('msg.doYouWantToLeave'),
            ok: {label: $t('btn.comfirm'), color: 'negative'},
            cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => next())
        }
        else
            next()
    },

    mounted: function() {
        if (userStore.isAllowed('settings:read')) {
            this.getSettings()
            this.getBackupStatus()
            setInterval(() => {this.getBackupStatus()}, 10000); // 10 seconds
            this.getBackups()
            this.canEdit = userStore.isAllowed('settings:update');
            document.addEventListener('keydown', this._listener, false)
        }
        else {
            this.loading = false
        }
    },

    unmounted: function() {
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
                this.loading = false
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
            if(this.settings.reviews.public.minReviewers < min || this.settings.reviews.public.minReviewers > max) {
                this.settings.reviews.public.minReviewers = this.settings.reviews.public.minReviewers < min ? min: max;
            }
            SettingsService.updateSettings(this.settings)
            .then((data) => {
                this.settingsOrig = this.$_.cloneDeep(this.settings);
                this.$settings.refresh();
                Notify.create({
                    message: $t('msg.settingsUpdatedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.message || err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        revertToDefaults: function() {
            Dialog.create({
                title: $t('msg.revertingSettings'),
                message: $t('msg.revertingSettingsConfirm'),
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(async () => {
                await SettingsService.revertDefaults();
                this.$settings.refresh();
                this.getSettings();
                Notify.create({
                    message: $t('settingsUpdatedOk'),
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        importSettings: function(file) {
            var fileReader = new FileReader();
            fileReader.onloadend = async (e) => {
                try {
                    var settings = JSON.parse(fileReader.result);
                    if (typeof settings === 'object') {
                        Dialog.create({
                            title: $t('msg.importingSettings'),
                            message: $t('msg.importingSettingsConfirm'),
                            ok: {label: $t('btn.confirm'), color: 'negative'},
                            cancel: {label: $t('btn.cancel'), color: 'white'}
                        })
                        .onOk(async () => {
                            await SettingsService.updateSettings(settings);
                            this.getSettings();
                            Notify.create({
                                message: $t('msg.settingsImportedOk'),
                                color: 'positive',
                                textColor:'white',
                                position: 'top-right'
                            })
                        })
                    } else {
                        throw $t('err.jsonMustBeAnObject');
                    }
                }
                catch (err) {
                    console.log(err);
                    var errMsg = $t('err.importingSettingsError')
                    if (err.message) errMsg = $t('err.errorWhileParsingJsonContent',[err.message]);
                    Notify.create({
                        message: errMsg,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                }
            };
            var fileContent = new Blob(file, {type : 'application/json'});
            fileReader.readAsText(fileContent);
        },

        exportSettings: async function() {
            var response = await SettingsService.exportSettings();
            var blob = new Blob([JSON.stringify(response.data)], {type: "application/json"});
            var link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = response.headers['content-disposition'].split('"')[1];
            document.body.appendChild(link);
            link.click();
            link.remove();
        },

        unsavedChanges() {
            return JSON.stringify(this.settingsOrig) !== JSON.stringify(this.settings);
        },

        getBackups: function() {
            BackupService.getBackups()
            .then((data) => {
                this.backups = data.data.datas
                this.loadingBackups = false
                this.cleanCurrentBackup()
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

        getBackupStatus: function() {
            BackupService.getBackupStatus()
            .then((data) => {
                let oldStatus = this.backupStatus.state
                this.backupStatus = data.data.datas
                if (oldStatus !== 'idle' && this.backupStatus.state === 'idle')
                    this.getBackups()
            })
        },

        createBackup: function() {
            BackupService.createBackup(this.currentBackup)
            .then((data) => {
                this.$refs.createBackupModal.hide();
                Notify.create({
                    message: data.data.datas,
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
                this.getBackupStatus()
            }
            )
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        cleanCurrentBackup: function() {
            const date = new Date()
            this.backupType = 'full'
            this.currentBackup = {
                name: `${date.toLocaleDateString("en-us", {year: "numeric", month: "short", day: "2-digit"})}`,
                data: [],
                password: ''
            }
            this.handleBackupTicked(this.currentBackup.data)
            this.backupEncrypted = false
        },

        handleBackupTicked: function(ticked) {
            if (ticked.includes('Clients')) {
                if (!ticked.includes('Companies'))
                    ticked.push('Companies')
                this.backupOptions[3].children[0].disabled = true
                this.backupOptions[3].children[0].label = $t('companies') + ' (' + $t('neededForClients') + ')'
            }
            else {
                this.backupOptions[3].children[0].disabled = false
                this.backupOptions[3].children[0].label = $t('companies')
            }

            if (ticked.includes('Audit Types')) {
                if (!ticked.includes('Templates')) 
                    ticked.push('Templates')
                if (!ticked.includes('Custom Sections')) 
                    ticked.push('Custom Sections')
                this.backupOptions[4].disabled = true
                this.backupOptions[4].label = $t('templates') + ' (' + $t('neededForAuditTypes') + ')'
                this.backupOptions[5].children[4].disabled = true
                this.backupOptions[5].children[4].label = $t('customSections') + ' (' + $t('neededForAuditTypes') + ')'
            }
            else {
                this.backupOptions[4].disabled = false
                this.backupOptions[4].label = $t('templates')
                this.backupOptions[5].children[4].disabled = false
                this.backupOptions[5].children[4].label = $t('customSections')
            }

            if (ticked.includes('Vulnerabilities Updates')) {
                if (!ticked.includes('Vulnerabilities')) 
                    ticked.push('Vulnerabilities')
                this.backupOptions[1].label = $t('vulnerabilities') + ' (' + $t('neededForVulnUpdates') + ')'
            }
            else
                this.backupOptions[1].label = $t('vulnerabilities')
        },

        confirmRestoreBackup: function() {
            Dialog.create({
                title: $t('msg.confirmRestore'),
                message: `${$t('backup')} « <b>${this.currentBackup.name} »</b> ${$t('msg.restoreNotice')}`,
                html: true,
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'},
                focus: 'cancel'
            })
            .onOk(() => {
                this.restoreBackup();
            })
        },

        restoreBackup: function() {
            let postData = {
                data: (this.backupType === 'partial') ? this.currentBackup.data : [],
                password: this.currentBackup.password || '',
                mode: this.restoreMode
            }
            BackupService.restoreBackup(this.currentBackup.slug, postData)
            .then((data) => {
                this.$refs.restoreBackupModal.hide();
                Notify.create({
                    message: data.data.datas,
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
                this.getBackupStatus()
            }
            )
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor:'white',
                    position: 'top-right'
                })
            })
        },

        backupRowClick: function(row) {
            this.cleanCurrentBackup()
            Object.assign(this.currentBackup, row)
            this.handleBackupTicked(this.currentBackup.data)
            this.backupType = this.currentBackup.type
            this.restoreOptions = this.backupOptions.filter((option) => {
                if (option.children)
                    return option.children.some((child) => {
                        return this.currentBackup.data.includes(child.value)
                    })
                else
                    return this.currentBackup.data.includes(option.value)
            })
            this.$refs.restoreBackupModal.show()       
        },

        confirmDeleteBackup: function(backup) {
            Dialog.create({
                title: $t('msg.confirmSuppression'),
                message: `${$t('backup')} <b>« ${backup.name} »</b> ${$t('msg.deleteNotice')}`,
                html: true,
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'},
                focus: 'cancel'
            })
            .onOk(() => {
                this.deleteBackup(backup);
            })
        },

        deleteBackup: function(backup) {
            BackupService.deleteBackup(backup.slug)
            .then((data) => {
                this.getBackups();
                Notify.create({
                    message: data.data.datas,
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        },

        downloadBackup: function(row) {
            BackupService.downloadBackup(row.slug)
        },

        // Upload Backup functions
        uploadBackup: function() {
            if (this.uploadBackupFile) {
                this.uploadBackupLoading = true
                const formData = new FormData()
                formData.append('file', this.uploadBackupFile)
                BackupService.uploadBackup(formData, progress => {
                    console.log(progress)
                    this.uploadProgress = progress
                })
                .then(data => {
                    this.getBackups();
                    Notify.create({
                        message: data.data.datas,
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right'
                    })
                })
                .catch(err => {
                    Notify.create({
                        message: err.response.data.datas.message || err.response.data.datas,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
                .finally(() => {
                    this.$refs.uploadBackupModal.hide();
                    this.uploadBackupLoading = false
                    this.uploadBackupFile = null
                    this.uploadProgress = 0
                })
            }
        },

        counterLabelFn ({ totalSize, filesNumber, maxFiles }) {
            return (filesNumber > 0) ? totalSize : ''
        },

        rejectUploadFile (rejectedEntries) {
            Notify.create({
                message: $t('wrongFileFormat'),
                color: 'negative',
                textColor: 'white',
                position: 'top-right'
            })
        }
        
    }
}