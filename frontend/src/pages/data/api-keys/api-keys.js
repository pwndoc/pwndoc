import { Notify, Dialog } from 'quasar'
import ApiKeyService from '@/services/api-key'
import { useUserStore } from 'src/stores/user'
import { $t } from '@/boot/i18n'

const userStore = useUserStore()

export default {
    data: () => ({
        userStore,
        apiKeys: [],
        loading: true,
        updatingApiKeys: [],
        search: '',
        pagination: {
            page: 1,
            rowsPerPage: 25,
            sortBy: 'createdAt',
            descending: true
        },
        columns: [
            { name: 'owner', label: $t('apiKeys.owner'), field: row => row.user?.username || '', align: 'left', sortable: true },
            { name: 'name', label: $t('apiKeys.name'), field: 'name', align: 'left', sortable: true },
            { name: 'prefix', label: $t('apiKeys.key'), field: 'prefix', align: 'left' },
            { name: 'roles', label: $t('roles'), field: 'roles', align: 'left' },
            { name: 'createdAt', label: $t('apiKeys.created'), field: 'createdAt', align: 'left', sortable: true },
            { name: 'lastUsed', label: $t('apiKeys.lastUsed'), field: 'lastUsed', align: 'left', sortable: true },
            { name: 'expiresAt', label: $t('apiKeys.expires'), field: 'expiresAt', align: 'left', sortable: true },
            { name: 'enabled', label: $t('apiKeys.status'), field: 'enabled', align: 'center' },
            { name: 'actions', label: $t('apiKeys.actions'), field: 'actions', align: 'center' }
        ]
    }),

    mounted() {
        this.getApiKeys()
    },

    computed: {
        canUpdate() {
            return userStore.isAllowed('apikeys:update-all')
        },
        canDelete() {
            return userStore.isAllowed('apikeys:delete-all')
        },
        tableColumns() {
            return this.columns.filter(column => {
                if (column.name === 'enabled' && !this.canUpdate)
                    return false
                if (column.name === 'actions' && !this.canDelete)
                    return false
                return true
            })
        }
    },

    methods: {
        ownerLabel(row) {
            const user = row.user
            if (!user)
                return '—'
            const fullName = `${user.firstname || ''} ${user.lastname || ''}`.trim()
            if (fullName && user.username)
                return `${fullName} (${user.username})`
            return fullName || user.username || '—'
        },

        formatDate(value) {
            return value ? new Date(value).toLocaleString() : $t('apiKeys.never')
        },

        keyFilter(rows, terms) {
            const query = (terms || '').toString().trim().toLowerCase()
            if (!query)
                return rows
            return rows.filter((row) => {
                const haystack = [
                    row.name,
                    row.prefix,
                    ...(row.roles || []),
                    row.user?.username,
                    row.user?.firstname,
                    row.user?.lastname,
                    this.ownerLabel(row)
                ].join(' ').toLowerCase()
                return haystack.includes(query)
            })
        },

        getApiKeys() {
            this.loading = true
            return ApiKeyService.getAll()
                .then((res) => {
                    this.apiKeys = res.data.datas || []
                })
                .catch(() => {
                    Notify.create({
                        message: $t('apiKeys.loadFailed'),
                        color: 'negative',
                        position: 'top-right'
                    })
                })
                .finally(() => {
                    this.loading = false
                })
        },

        toggleApiKey(row) {
            if (!this.canUpdate || this.updatingApiKeys.includes(row._id))
                return
            this.updatingApiKeys.push(row._id)
            return ApiKeyService.toggleApiKey(row._id)
                .then((res) => {
                    row.enabled = res.data.datas.enabled
                    Notify.create({
                        message: $t('apiKeys.statusUpdatedOk'),
                        color: 'positive',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
                .catch(() => {
                    Notify.create({
                        message: $t('apiKeys.updateFailed'),
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
                .finally(() => {
                    this.updatingApiKeys = this.updatingApiKeys.filter(id => id !== row._id)
                })
        },

        confirmRevokeApiKey(row) {
            if (!this.canDelete)
                return
            Dialog.create({
                title: $t('apiKeys.confirmRevokeTitle'),
                message: $t('apiKeys.confirmRevokeAdminMsg', {
                    name: row.name,
                    owner: this.ownerLabel(row)
                }),
                ok: { color: 'negative', label: $t('btn.delete') },
                cancel: { flat: true, color: 'grey-7', label: $t('btn.cancel') }
            }).onOk(() => {
                ApiKeyService.deleteApiKey(row._id)
                    .then(() => {
                        this.getApiKeys()
                        Notify.create({
                            message: $t('apiKeys.revokedOk'),
                            color: 'positive',
                            textColor: 'white',
                            position: 'top-right'
                        })
                    })
                    .catch(() => {
                        Notify.create({
                            message: $t('apiKeys.revokeFailed'),
                            color: 'negative',
                            textColor: 'white',
                            position: 'top-right'
                        })
                    })
            })
        }
    }
}
