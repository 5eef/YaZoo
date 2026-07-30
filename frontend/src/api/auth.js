import api from './client'
import { getBackendBaseUrl } from '../lib/appConfig'

export const loginRequest = (payload) => api.post('/auth/login', payload)

export const registerRequest = (payload) => api.post('/auth/register', payload)

export const logoutRequest = () => api.post('/auth/logout')

export const meRequest = () => api.get('/auth/me')

export const requestPasswordReset = (payload) => api.post('/auth/password/forgot', payload)

export const resetPassword = (payload) => api.post('/auth/password/reset', payload)

export const getGoogleAuthUrl = () => `${getBackendBaseUrl()}/api/auth/google`

export const isGoogleAuthEnabled = () => {
  const rawValue = import.meta.env.VITE_GOOGLE_AUTH_ENABLED

  if (rawValue === undefined) {
    return true
  }

  return !['0', 'false', 'off', 'no'].includes(String(rawValue).toLowerCase())
}
