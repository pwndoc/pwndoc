import { Dialog, Notify, copyToClipboard } from 'quasar'
import Breadcrumb from 'components/breadcrumb'
import FileService from '@/services/audit-file'
import Utils from '@/services/utils'
import { useUserStore } from 'src/stores/user'
import { $t } from '@/boot/i18n'

export default {
    components: { Breadcrumb },
    inject: ['auditParent', 'frontEndAuditState'],
    data() {
        return {
            files: [], usage: { bytes: 0, count: 0 }, limits: {}, queue: [],
            loading: false, uploading: false, deleting: false, downloading: null, copying: null,
            dragging: false, filter: '', loadError: '', loadGeneration: 0
        }
    },
    computed: {
        auditId() { return this.$route.params.auditId },
        canEdit() {
            return this.frontEndAuditState === Utils.AUDIT_VIEW_STATE.EDIT && useUserStore().isAllowed('audits:update')
        },
        busy() { return this.uploading || this.deleting },
        columns() {
            return [
                { name: 'name', field: 'name', label: $t('auditFiles.name'), align: 'left', sortable: true },
                { name: 'size', field: 'size', label: $t('auditFiles.size'), format: this.formatSize, sortable: true },
                { name: 'createdAt', field: 'createdAt', label: $t('auditFiles.date'),
                    format: value => new Date(value).toLocaleString(), align: 'left', sortable: true },
                { name: 'uploadedByName', field: 'uploadedByName', label: $t('auditFiles.author'), align: 'left', sortable: true },
                { name: 'actions', label: '', align: 'right' }
            ]
        }
    },
    watch: {
        auditId() {
            this.files = []
            this.queue = []
            this.loadFiles()
        }
    },
    mounted() {
        this.loadFiles()
        this.$socket.emit('menu', { menu: 'files', room: this.auditId })
        window.addEventListener('beforeunload', this.beforeUnload)
    },
    beforeRouteLeave(to, from, next) {
        if (!this.busy) return next()
        Notify.create({ type: 'warning', message: $t('auditFiles.waitForTransfers') })
        next(false)
    },
    beforeRouteUpdate(to, from, next) {
        if (!this.busy) return next()
        Notify.create({ type: 'warning', message: $t('auditFiles.waitForTransfers') })
        next(false)
    },
    beforeUnmount() {
        this.loadGeneration++
        window.removeEventListener('beforeunload', this.beforeUnload)
    },
    methods: {
        beforeUnload(event) {
            if (this.busy) {
                event.preventDefault()
                event.returnValue = ''
            }
        },
        formatSize(bytes) {
            if (!Number.isFinite(bytes)) return '—'
            if (bytes < 1024) return `${bytes} B`
            const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3)
            return `${(bytes / 1024 ** exponent).toFixed(1)} ${['B', 'KiB', 'MiB', 'GiB'][exponent]}`
        },
        async errorMessage(error) {
            let data = error.response?.data
            if (data instanceof Blob) {
                try { data = JSON.parse(await data.text()) } catch { data = null }
            }
            return typeof data?.datas === 'string' ? data.datas : $t('auditFiles.error')
        },
        async loadFiles() {
            const generation = ++this.loadGeneration
            this.loading = true
            try {
                const response = await FileService.list(this.auditId)
                if (generation !== this.loadGeneration) return
                const data = response.data.datas
                this.files = data.files
                this.auditParent.fileCount = data.files.length
                this.usage = data.usage
                this.limits = data.limits
                this.loadError = ''
            } catch (error) {
                if (generation === this.loadGeneration) this.loadError = await this.errorMessage(error)
            } finally {
                if (generation === this.loadGeneration) this.loading = false
            }
        },
        pickFiles(event) {
            this.uploadFiles(Array.from(event.target.files || []))
            event.target.value = ''
        },
        dropFiles(event) {
            this.dragging = false
            this.uploadFiles(Array.from(event.dataTransfer.files || []))
        },
        async uploadFiles(files) {
            if (!this.canEdit || this.busy || this.loading || this.loadError || !files.length) return
            this.uploading = true
            this.queue = files.map(file => ({ name: file.name, progress: 0, status: 'waiting', error: '' }))
            try {
                for (let index = 0; index < files.length; index++) {
                    const file = files[index]
                    const item = this.queue[index]
                    try {
                        if (!this.canEdit) throw new Error('read-only')
                        if (file.size > this.limits.maxFileBytes)
                            throw { response: { data: { datas: $t('auditFiles.tooLarge') } } }
                        item.status = 'uploading'
                        await FileService.upload(this.auditId, file, progress => { item.progress = progress })
                        item.status = 'uploaded'
                    } catch (error) {
                        item.status = 'failed'
                        item.error = await this.errorMessage(error)
                    }
                }
            } finally {
                this.uploading = false
                await this.loadFiles()
            }
        },
        async downloadFile(file) {
            if (this.downloading) return
            this.downloading = file._id
            try {
                await FileService.download(this.auditId, file._id)
            } catch (error) {
                Notify.create({ type: 'negative', message: await this.errorMessage(error) })
            } finally { this.downloading = null }
        },
        async copyFileLink(file) {
            if (this.copying) return
            this.copying = file._id
            try {
                await copyToClipboard(FileService.downloadUrl(this.auditId, file._id))
                Notify.create({ type: 'positive', message: $t('auditFiles.linkCopied') })
            } catch {
                Notify.create({ type: 'negative', message: $t('auditFiles.copyLinkError') })
            } finally { this.copying = null }
        },
        confirmRemove(file) {
            if (!this.canEdit || this.busy) return
            Dialog.create({
                title: $t('auditFiles.remove'), message: $t('auditFiles.confirmRemove', { name: file.name }),
                cancel: { label: $t('btn.cancel'), flat: true },
                ok: { label: $t('btn.delete'), color: 'negative' }
            }).onOk(() => this.removeFile(file))
        },
        async removeFile(file) {
            if (!this.canEdit || this.busy) return
            this.deleting = true
            try {
                await FileService.remove(this.auditId, file._id)
                await this.loadFiles()
            } catch (error) {
                Notify.create({ type: 'negative', message: await this.errorMessage(error) })
            } finally { this.deleting = false }
        }
    }
}
