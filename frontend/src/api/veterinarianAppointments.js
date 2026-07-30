import api from './client'

export const listVeterinarianAppointmentsRequest = (params = {}) =>
  api.get('/veterinarian-appointments', { params })
export const listVeterinarianAvailabilityRequest = (veterinarianId) =>
  api.get(`/veterinarians/${veterinarianId}/availability`)
export const createVeterinarianAvailabilityRequest = (veterinarianId, payload) =>
  api.post(`/veterinarians/${veterinarianId}/availability`, payload)
export const createVeterinarianAppointmentRequest = (veterinarianId, payload) =>
  api.post(`/veterinarians/${veterinarianId}/appointments`, payload)
export const updateVeterinarianAppointmentStatusRequest = (appointmentId, payload) =>
  api.patch(`/veterinarian-appointments/${appointmentId}/status`, payload)
export const reviewVeterinarianAppointmentRequest = (appointmentId, payload) =>
  api.post(`/veterinarian-appointments/${appointmentId}/review`, payload)
