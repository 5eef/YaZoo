import api from './client'

export const getAdminOrdersDashboardRequest = () => api.get('/admin/orders')

export const getAdminModerationRequest = () => api.get('/admin/moderation')

export const getAdminModerationSectionRequest = (type, params = {}) =>
  api.get(`/admin/moderation/${type}`, { params })

export const getAdminStatsRequest = (days = 30) => api.get('/admin/stats', { params: { days } })

export const getAdminMfaStatusRequest = () => api.get('/admin/mfa')
export const enrollAdminMfaRequest = (password) => api.post('/admin/mfa/enroll', { password })
export const confirmAdminMfaRequest = (code) => api.post('/admin/mfa/confirm', { code })
export const challengeAdminMfaRequest = (code) => api.post('/admin/mfa/challenge', { code })
export const regenerateAdminMfaRecoveryCodesRequest = (payload) =>
  api.post('/admin/mfa/recovery-codes', payload)
export const disableAdminMfaRequest = (payload) => api.delete('/admin/mfa', { data: payload })

export const getAdminReportsRequest = (params = {}) =>
  api.get('/admin/reports', { params })

export const updateAdminReportStatusRequest = (reportId, status) =>
  api.patch(`/admin/reports/${reportId}/status`, { status })

export const getAdminAnimalReviewsRequest = (params = {}) =>
  api.get('/admin/animals/review', { params })

export const updateAdminAnimalLegalStatusRequest = (animalId, payload) =>
  api.patch(`/admin/animals/${animalId}/legal-status`, payload)

export const deleteAdminPostRequest = (postId) => api.delete(`/admin/posts/${postId}`)

export const deleteAdminAnimalRequest = (animalId) =>
  api.delete(`/admin/animals/${animalId}`)

export const deleteAdminProductRequest = (productId) =>
  api.delete(`/admin/products/${productId}`)

export const deleteAdminCommunityRequest = (communityId) =>
  api.delete(`/admin/communities/${communityId}`)
