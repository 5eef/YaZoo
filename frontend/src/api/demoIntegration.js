import api from './client'

export const listReservationPayments = id => api.get(`/reservations/${id}/payments`)
export const getPayment = id => api.get(`/payments/${id}`)
export const confirmManualPayment = (id, payload) => api.patch(`/payments/${id}/manual-confirm`, payload)
export const createReservationReview = (id, payload) => api.post(`/reservations/${id}/reviews`, payload)
export const listAdminReviews = (page = 1) => api.get('/admin/reviews', { params: { page } })
export const moderateReview = (id, payload) => api.patch(`/admin/reviews/${id}/status`, payload)
export const listDeletionRequests = () => api.get('/admin/privacy/delete-requests')
export const reviewDeletionRequest = (id, payload) => api.patch(`/admin/privacy/delete-requests/${id}/status`, payload)
export const createAdminUser = payload => api.post('/admin/users', payload)
export const resendVerificationEmail = () => api.post('/auth/email/verification-notification')
export const deleteAvailability = id => api.delete(`/veterinarian-availability/${id}`)
