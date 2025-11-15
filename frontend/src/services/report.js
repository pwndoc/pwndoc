import { api } from 'src/boot/axios'

export default {
    // Generate and download DOCX report for audit
    generateReport: (auditId) => {
        return api.get(`/audits/${auditId}/generate`, {
            responseType: 'blob' // Important for binary file download
        })
    },

    // Helper function to trigger browser download
    downloadReport: async (auditId, filename) => {
        try {
            const response = await api.get(`/audits/${auditId}/generate`, {
                responseType: 'blob'
            })

            // Extract filename from Content-Disposition header if provided
            const contentDisposition = response.headers['content-disposition']
            let downloadFilename = filename || 'report.docx'

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
                if (filenameMatch && filenameMatch[1]) {
                    downloadFilename = filenameMatch[1]
                }
            }

            // Create blob link and trigger download
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            })

            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', downloadFilename)
            document.body.appendChild(link)
            link.click()

            // Cleanup
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            return { success: true, filename: downloadFilename }
        } catch (error) {
            console.error('Error downloading report:', error)
            throw error
        }
    }
}
