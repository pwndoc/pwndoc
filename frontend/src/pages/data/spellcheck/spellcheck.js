import { Dialog, Notify } from 'quasar';

import SpellcheckService from '@/services/spellcheck'
import Utils from '@/services/utils'

import { $t } from '@/boot/i18n'

export default {
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
                    console.log(err)
                })
        },
            
        addWord: function(word) {
        },

        deleteWord: function(word) {
        },

        confirmDeleteWord: function(word) {
            Dialog.create({
                title: $t('msg.confirmSuppression'),
                message: `${$t('word')} «${word.word}» ${$t('msg.deleteNotice')}`,
                ok: {label: $t('btn.confirm'), color: 'negative'},
                cancel: {label: $t('btn.cancel'), color: 'white'}
            })
            .onOk(() => this.deleteWord(word))
        },

        cleanErrors: function() {
            this.errors.name = '';
        },
    }
}