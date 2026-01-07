import { Dialog, Notify } from 'quasar';
import { useUserStore } from '@/stores/user'

import SpellcheckService from '@/services/spellcheck'
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
            // words list
            words: [],
            // Loading state
            loading: true,
            // Datatable headers
            dtHeaders: [
                {name: 'word', label: $t('word'), field: 'word', align: 'left', sortable: true},
                {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
            ],
            // Datatable pagination
            pagination: {
                page: 1,
                rowsPerPage: 25,
                sortBy: 'word'
            },
            rowsPerPageOptions: [
                {label:'25', value:25},
                {label:'50', value:50},
                {label:'100', value:100},
                {label:'All', value:0}
            ],
            // Search filter
            search: {word: ''},
            customFilter: Utils.customFilter,
            // Errors messages
            errors: {name: ''},
            // Word to create
            currentWord: {
                word: ''
            },
        }
    },

    mounted: function() {
        this.getWords()
    },

    methods: {
        getWords: function() {
            this.loading = true
            SpellcheckService.getWords()
                .then((data) => {
                    this.words = data.data.datas
                    this.loading = false
                })
                .catch((err) => {
                    console.error(err)
                    this.loading = false
                    Notify.create({
                        message: err.response?.data?.datas || $t('msg.errorLoading'),
                        color: 'negative'
                    })
                })
        },

        createWord: function() {
            if (!this.canEdit) {
                Notify.create({
                    message: $t('msg.unauthorized'),
                    color: 'negative'
                })
                return
            }

            if (!this.currentWord.word || this.currentWord.word.trim() === '') {
                this.errors.name = $t('msg.fieldRequired')
                return
            }

            this.cleanErrors()
            SpellcheckService.addWord(this.currentWord.word.trim())
                .then((data) => {
                    Notify.create({
                        message: $t('msg.wordCreated') || 'Word created successfully',
                        color: 'positive'
                    })
                    this.$refs.createModal.hide()
                    this.getWords()
                })
                .catch((err) => {
                    console.error(err)
                    if (err.response?.status === 403) {
                        Notify.create({
                            message: $t('msg.unauthorized'),
                            color: 'negative'
                        })
                    } else {
                        const errorMsg = err.response?.data?.error || err.response?.data?.datas || $t('msg.errorCreating') || 'Failed to create word'
                        Notify.create({
                            message: errorMsg,
                            color: 'negative'
                        })
                    }
                    if (err.response?.data?.error && err.response.data.error.includes('word')) {
                        this.errors.name = err.response.data.error
                    }
                })
        },

        deleteWord: function(word) {
            if (!this.canEdit) {
                Notify.create({
                    message: $t('msg.unauthorized'),
                    color: 'negative'
                })
                return
            }

            SpellcheckService.deleteWord(word.word)
                .then((data) => {
                    Notify.create({
                        message: $t('msg.wordDeleted') || 'Word deleted successfully',
                        color: 'positive'
                    })
                    this.getWords()
                })
                .catch((err) => {
                    console.error(err)
                    if (err.response?.status === 403) {
                        Notify.create({
                            message: $t('msg.unauthorized'),
                            color: 'negative'
                        })
                    } else {
                        const errorMsg = err.response?.data?.error || err.response?.data?.datas || $t('msg.errorDeleting') || 'Failed to delete word'
                        Notify.create({
                            message: errorMsg,
                            color: 'negative'
                        })
                    }
                })
        },

        confirmDeleteWord: function(word) {
            if (!this.canEdit) {
                Notify.create({
                    message: $t('msg.unauthorized'),
                    color: 'negative'
                })
                return
            }

            Dialog.create({
                title: $t('msg.confirmSuppression'),
                message: `${$t('word')} «${word.word}» ${$t('msg.deleteNotice')}`,
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => this.deleteWord(word))
        },

        cleanCurrentWord: function() {
            this.currentWord = {
                word: ''
            }
            this.cleanErrors()
        },

        cleanErrors: function() {
            this.errors.name = '';
        },
    }
}