import { describe, test, expect, vi, beforeEach } from 'vitest'
vi.mock('boot/axios', () => ({ api: { get: vi.fn(), head: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {baseURL: 'http://localhost/api'} } }))
import { api } from 'boot/axios'
import Service from '@/services/audit-file'

beforeEach(() => {
    vi.clearAllMocks()
    api.defaults.baseURL = 'http://localhost/api'
})
describe('Audit file transfers', () => {
    test.each(['https://pwndoc.example/api', 'https://pwndoc.example/api/'])(
        'provides an absolute download link from %s without authentication tokens', baseURL => {
            api.defaults.baseURL = baseURL
            expect(Service.downloadUrl('audit', 'file')).toBe('https://pwndoc.example/api/audits/audit/files/file/download')
        })
    test('resolves a relative API base against the current origin', () => {
        api.defaults.baseURL = '/api/'
        expect(Service.downloadUrl('audit', 'file')).toBe(`${window.location.origin}/api/audits/audit/files/file/download`)
    })
    test('sends the original binary body and percent-encodes the Unicode filename', async () => {
        const file = new File([new Uint8Array([0, 255, 10])], 'preuve été.bin')
        const progress = vi.fn()
        await Service.upload('audit', file, progress)
        const [url, body, options] = api.post.mock.calls[0]
        expect(url).toBe('audits/audit/files')
        expect(body).toBe(file)
        expect(options.headers).toEqual({ 'Content-Type': 'application/octet-stream', 'X-File-Name': 'preuve%20%C3%A9t%C3%A9.bin' })
        options.onUploadProgress({ loaded: 5, total: 10 })
        expect(progress).toHaveBeenLastCalledWith(50)
        options.onUploadProgress({ loaded: 5 })
        expect(progress).toHaveBeenLastCalledWith(0)
        await Service.upload('audit', file)
        expect(() => api.post.mock.calls[1][2].onUploadProgress({ loaded: 1, total: 1 })).not.toThrow()
    })
    test('fetches metadata and downloads binary content from the owning audit', async () => {
        await Service.list('audit')
        expect(api.get).toHaveBeenCalledWith('audits/audit/files')
        await Service.download('audit', 'file')
        expect(api.head).toHaveBeenCalledWith('audits/audit/files/file/download')
        await Service.remove('audit', 'file')
        expect(api.delete).toHaveBeenCalledWith('audits/audit/files/file')
    })
    test('starts a native download only after a successful permission check', async () => {
        let destination
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { destination = this.href })
        await Service.download('audit', 'file')
        expect(destination).toBe('http://localhost/api/audits/audit/files/file/download')
        api.head.mockRejectedValueOnce(new Error('forbidden'))
        await expect(Service.download('audit', 'file')).rejects.toThrow('forbidden')
        expect(click).toHaveBeenCalledTimes(1)
        click.mockRestore()
    })
})
