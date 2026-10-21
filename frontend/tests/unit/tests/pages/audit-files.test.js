import { shallowMount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { Notify, Dialog } from 'quasar'
import Page from '@/pages/audits/edit/files/files'
import Service from '@/services/audit-file'

const permissions = vi.hoisted(() => ({ update: true }))
vi.mock('@/services/audit-file', () => ({ default: { list: vi.fn(), upload: vi.fn(), download: vi.fn(), remove: vi.fn() } }))
vi.mock('@/boot/i18n', () => ({ $t: key => key }))
vi.mock('src/stores/user', () => ({ useUserStore: () => ({ isAllowed: () => permissions.update }) }))
vi.mock('quasar', async () => ({
    ...await vi.importActual('quasar'),
    Notify: { create: vi.fn() }, Dialog: { create: vi.fn(() => ({ onOk: vi.fn() })) }
}))

let wrapper
let state
let route
const file = { _id: 'file-id', name: 'evidence.zip', size: 4 }
const response = () => ({ data: { datas: { files: [file], usage: { count: 1, bytes: 4 },
    limits: { maxFileBytes: 10, maxAuditBytes: 100, maxAuditFiles: 10 } } } })

beforeEach(async () => {
    vi.clearAllMocks()
    permissions.update = true
    state = ref(0)
    route = { params: { auditId: 'audit-id' } }
    Service.list.mockResolvedValue(response())
    Service.upload.mockResolvedValue({})
    Service.remove.mockResolvedValue({})
    wrapper = shallowMount({ ...Page, render: () => null }, {
        global: { provide: { auditParent: ref({ name: 'Audit' }), frontEndAuditState: state },
            mocks: { $route: route, $socket: { emit: vi.fn() } } }
    })
    await flushPromises()
})
afterEach(() => wrapper.unmount())

describe('Audit File Management', () => {
    test('loads file metadata and limits', () => {
        expect(Service.list).toHaveBeenCalledWith('audit-id')
        expect(wrapper.vm.files).toEqual([file])
        expect(wrapper.vm.usage.bytes).toBe(4)
        expect(wrapper.vm.loading).toBe(false)
    })
    test('respects read-only states and upload permissions', async () => {
        expect(wrapper.vm.canEdit).toBe(true)
        state.value = 1
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.canEdit).toBe(false)
        await wrapper.vm.uploadFiles([new File(['test'], 'test')])
        expect(Service.upload).not.toHaveBeenCalled()
        state.value = 0
        permissions.update = false
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.canEdit).toBe(false)
    })
    test('uploads sequentially, reports partial failures and refreshes the inventory', async () => {
        const files = [new File(['test'], 'one.bin'), new File(['bad'], 'two.bin'), new File(['ok'], 'three.bin')]
        Service.upload.mockImplementationOnce(async (id, file, progress) => progress(100))
            .mockRejectedValueOnce({ response: { data: { datas: 'Rejected by scanner' } } })
            .mockResolvedValueOnce({})
        await wrapper.vm.uploadFiles(files)
        expect(Service.upload).toHaveBeenCalledTimes(3)
        expect(wrapper.vm.queue.map(item => item.status)).toEqual(['uploaded', 'failed', 'uploaded'])
        expect(wrapper.vm.queue[1].error).toBe('Rejected by scanner')
        expect(Service.list).toHaveBeenCalledTimes(2)
        expect(wrapper.vm.busy).toBe(false)
    })
    test('rejects oversize files locally and blocks repeated submissions', async () => {
        await wrapper.vm.uploadFiles([new File(['12345678901'], 'large.bin')])
        expect(wrapper.vm.queue[0].error).toBe('auditFiles.tooLarge')
        expect(Service.upload).not.toHaveBeenCalled()
        wrapper.vm.uploading = true
        await wrapper.vm.uploadFiles([new File(['a'], 'blocked')])
        expect(Service.upload).not.toHaveBeenCalled()
    })
    test('displays load errors and permits retry', async () => {
        Service.list.mockRejectedValueOnce(new Error('offline'))
        await wrapper.vm.loadFiles()
        expect(wrapper.vm.loadError).toBe('auditFiles.error')
        await wrapper.vm.loadFiles()
        expect(wrapper.vm.loadError).toBe('')
    })
    test('confirms deletion and updates the file list', async () => {
        wrapper.vm.confirmRemove(file)
        expect(Dialog.create).toHaveBeenCalled()
        await wrapper.vm.removeFile(file)
        expect(Service.remove).toHaveBeenCalledWith('audit-id', 'file-id')
        expect(Service.list).toHaveBeenCalledTimes(2)
    })
    test('prevents deletion in read-only mode', async () => {
        state.value = 1
        await wrapper.vm.$nextTick()
        wrapper.vm.confirmRemove(file)
        await wrapper.vm.removeFile(file)
        expect(Dialog.create).not.toHaveBeenCalled()
        expect(Service.remove).not.toHaveBeenCalled()
    })
    test('starts downloads and reports download failures', async () => {
        Service.download.mockResolvedValueOnce({})
        await wrapper.vm.downloadFile(file)
        expect(Service.download).toHaveBeenCalledWith('audit-id', 'file-id')
        expect(wrapper.vm.downloading).toBe(null)
        Service.download.mockRejectedValueOnce(new Error('offline'))
        await wrapper.vm.downloadFile(file)
        expect(Notify.create).toHaveBeenCalledWith({ type: 'negative', message: 'auditFiles.error' })
    })
    test('guards navigation and reload during transfers', () => {
        const next = vi.fn()
        wrapper.vm.$options.beforeRouteLeave.call(wrapper.vm, {}, {}, next)
        expect(next).toHaveBeenLastCalledWith()
        wrapper.vm.uploading = true
        wrapper.vm.$options.beforeRouteLeave.call(wrapper.vm, {}, {}, next)
        expect(next).toHaveBeenLastCalledWith(false)
        const event = { preventDefault: vi.fn() }
        wrapper.vm.beforeUnload(event)
        expect(event.preventDefault).toHaveBeenCalled()
    })
    test('formats file sizes including empty files', () => {
        expect(wrapper.vm.formatSize(0)).toBe('0 B')
        expect(wrapper.vm.formatSize(1048576)).toBe('1.0 MiB')
        expect(wrapper.vm.formatSize(undefined)).toBe('—')
    })
})
