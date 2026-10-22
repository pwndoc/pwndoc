import { api } from 'boot/axios'

export default {
  downloadUrl(auditId, fileId) {
    const base = api.defaults.baseURL.replace(/\/$/, '')
    return new URL(`${base}/audits/${auditId}/files/${fileId}/download`, window.location.origin).href
  },
  list(auditId) {
    return api.get(`audits/${auditId}/files`)
  },
  upload(auditId, file, onProgress) {
    return api.post(`audits/${auditId}/files`, file, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name)
      },
      onUploadProgress(event) {
        onProgress?.(event.total ? Math.round(event.loaded * 100 / event.total) : 0)
      }
    })
  },
  async download(auditId, fileId) {
    const path = `audits/${auditId}/files/${fileId}/download`
    // Preflight through axios handles expired sessions and displays access errors.
    // The browser then streams the file directly to disk rather than buffering a
    // potentially large Blob in the application's JavaScript heap.
    await api.head(path)
    const link = document.createElement('a')
    link.href = this.downloadUrl(auditId, fileId)
    document.body.appendChild(link)
    link.click()
    link.remove()
  },
  remove(auditId, fileId) {
    return api.delete(`audits/${auditId}/files/${fileId}`)
  }
}
