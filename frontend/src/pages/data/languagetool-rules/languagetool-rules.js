import { Notify, Dialog } from 'quasar';
import { useUserStore } from '@/stores/user'

import LanguageToolRulesService from '@/services/languagetool-rules'
import Utils from '@/services/utils'

import { $t } from '@/boot/i18n'

const userStore = useUserStore()

export default {
    computed: {
        canEdit() {
            return userStore.isAllowed('settings:update')
        }
    },

    data: () => {
        return {
            // rules list
            rules: [],
            // Loading state
            loading: true,
            // Languages list
            languages: [],
            loadingLanguages: false,
            // Creating state
            creating: false,
            // Deleting state
            deleting: false,
            // Datatable headers
            dtHeaders: [
                {name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true},
                {name: 'name', label: $t('name'), field: 'name', align: 'left', sortable: true},
                {name: 'language', label: $t('language'), field: 'language', align: 'left', sortable: true},
                {name: 'ruleXml', label: $t('ruleXml'), field: 'ruleXml', align: 'left', sortable: false},
                {name: 'action', label: '', field: 'action', align: 'right', sortable: false},
            ],
            // Datatable pagination
            pagination: {
                page: 1,
                rowsPerPage: 25,
                sortBy: 'name'
            },
            rowsPerPageOptions: [
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:'All', value:0}
            ],
            // Search filter
            search: {name: '', id: ''},
            customFilter: Utils.customFilter,
            // Selected rule for viewing details
            selectedRule: null,
            // New rule form
            newRule: {
                language: null,
                ruleXml: ''
            },
            // Form errors
            errors: {}
        }
    },

    mounted: function() {
        this.getRules()
        if (this.canEdit) {
            this.getLanguages()
        }
    },

    methods: {
        getRules: function() {
            this.loading = true
            LanguageToolRulesService.getAll()
                .then((data) => {
                    this.rules = data.data.datas || []
                    this.loading = false
                })
                .catch((err) => {
                    console.log(err)
                    this.loading = false
                    Notify.create({
                        message: err.response?.data?.datas || $t('msg.errorLoading'),
                        color: 'negative'
                    })
                })
        },

        viewRule: function(rule) {
            this.selectedRule = rule
            this.$refs.viewModal.show()
        },

        getLanguages: function() {
            this.loadingLanguages = true
            LanguageToolRulesService.getLanguages()
                .then((data) => {
                    // Backend returns { status: "success", datas: { languages: [...] } }
                    const languages = data.data?.datas?.languages || data.data?.languages || []
                    this.languages = languages.map(lang => ({
                        label: lang.toUpperCase(),
                        value: lang
                    }))
                    this.loadingLanguages = false
                })
                .catch((err) => {
                    console.error(err)
                    this.loadingLanguages = false
                    Notify.create({
                        message: err.response?.data?.error || $t('msg.errorLoading'),
                        color: 'negative'
                    })
                })
        },

        openCreateDialog: function() {
            if (!this.canEdit) {
                Notify.create({
                    message: $t('msg.unauthorized'),
                    color: 'negative'
                })
                return
            }
            this.cleanCreateForm()
            this.$refs.createModal.show()
            if (this.languages.length === 0) {
                this.getLanguages()
            }
        },

        cleanCreateForm: function() {
            this.newRule = {
                language: null,
                ruleXml: ''
            }
            this.errors = {}
        },

        validateCreateForm: function() {
            this.errors = {}
            let valid = true

            if (!this.newRule.language) {
                this.errors.language = $t('msg.fieldRequired')
                valid = false
            }

            if (!this.newRule.ruleXml || this.newRule.ruleXml.trim() === '') {
                this.errors.ruleXml = $t('msg.fieldRequired')
                valid = false
            } else if (this.newRule.ruleXml.trim()) {
                // Basic XML validation
                try {
                    const parser = new DOMParser()
                    const xmlDoc = parser.parseFromString(this.newRule.ruleXml, 'text/xml')
                    const parserError = xmlDoc.querySelector('parsererror')
                    if (parserError) {
                        this.errors.ruleXml = $t('msg.invalidXml')
                        valid = false
                    }
                } catch (err) {
                    this.errors.ruleXml = $t('msg.invalidXml')
                    valid = false
                }
            }

            return valid
        },

        createRule: function() {
            if (!this.validateCreateForm()) {
                return
            }

            this.creating = true
            LanguageToolRulesService.create(this.newRule.language, this.newRule.ruleXml)
                .then((data) => {
                    this.creating = false
                    Notify.create({
                        message: $t('msg.ruleCreated'),
                        color: 'positive'
                    })
                    this.$refs.createModal.hide()
                    this.getRules()
                })
                .catch((err) => {
                    this.creating = false
                    console.error(err)
                    const errorMsg = err.response?.data?.datas || $t('msg.errorCreating')
                    Notify.create({
                        message: errorMsg,
                        color: 'negative'
                    })
                    // Set field-specific errors if available
                    if (err.response?.data?.datas) {
                        if (err.response.data.datas.includes('Language')) {
                            this.errors.language = err.response.data.datas
                        } else if (err.response.data.datas.includes('XML') || err.response.data.datas.includes('Invalid')) {
                            this.errors.ruleXml = err.response.data.datas
                        }
                    }
                })
        },

        confirmDeleteRule: function(rule) {
            if (!this.canEdit) {
                Notify.create({
                    message: $t('msg.unauthorized'),
                    color: 'negative'
                })
                return
            }

            Dialog.create({
                title: $t('msg.confirmSuppression'),
                message: `${$t('rule')} «${rule.name}» (${rule.id}) ${$t('msg.deleteNotice')}`,
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => this.deleteRule(rule))
        },

        deleteRule: function(rule) {
            if (!rule.language) {
                Notify.create({
                    message: $t('msg.errorLoading'),
                    color: 'negative'
                })
                return
            }

            this.deleting = true
            LanguageToolRulesService.delete(rule._id)
                .then((data) => {
                    this.deleting = false
                    Notify.create({
                        message: $t('msg.ruleDeleted'),
                        color: 'positive'
                    })
                    this.getRules()
                })
                .catch((err) => {
                    this.deleting = false
                    console.error(err)
                    const errorMsg = err.response?.data?.datas || $t('msg.errorDeleting')
                    Notify.create({
                        message: errorMsg,
                        color: 'negative'
                    })
                })
        }
    }
}
