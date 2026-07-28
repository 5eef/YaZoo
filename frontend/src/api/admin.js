import api from './client'

export const getAdminOrdersDashboardRequest = () => api.get('/admin/orders')

export const getAdminModerationRequest = () => api.get('/admin/moderation')

export const getAdminModerationSectionRequest = (type, params = {}) =>
  api.get(`/admin/moderation/${type}`, { params })

export const getAdminStatsRequest = () => api.get('/admin/stats')

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
