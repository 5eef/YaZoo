import api from './client'

export const listVeterinariansRequest = (params = {}) => api.get('/veterinarians', { params })
export const getVeterinarianRequest = (veterinarianId) => api.get(`/veterinarians/${veterinarianId}`)
export const createVeterinarianRequest = (payload) => api.post('/veterinarians', payload)
export const updateVeterinarianRequest = (veterinarianId, payload) => {
  if (payload instanceof FormData) {
    payload.set('_method', 'PATCH')
    return api.post(`/veterinarians/${veterinarianId}`, payload)
  }
  return api.patch(`/veterinarians/${veterinarianId}`, payload)
}
export const deleteVeterinarianRequest = (veterinarianId) => api.delete(`/veterinarians/${veterinarianId}`)
