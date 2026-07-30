import api from './client'

export const exportAdminStatsCsvRequest = (days = 30) =>
  api.get('/admin/exports/stats.csv', { params: { days }, responseType: 'blob' })

export const exportAdminReportsCsvRequest = () =>
  api.get('/admin/exports/reports.csv', { responseType: 'blob' })

export const exportAdminModerationActionsCsvRequest = () =>
  api.get('/admin/exports/moderation-actions.csv', { responseType: 'blob' })

export const exportAdminProfessionalVerificationsCsvRequest = () =>
  api.get('/admin/exports/professional-verifications.csv', { responseType: 'blob' })

export function downloadCsvResponse(response, filename) {
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
