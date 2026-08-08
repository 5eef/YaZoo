import axios from 'axios'

import { getErrorMessage } from '../utils/getErrorMessage'
import { getApiBaseUrl, getBackendBaseUrl } from '../lib/appConfig'
import { getCurrentLocale, translate } from '../lib/i18n'
import { getCurrentSocketId } from '../lib/realtime'
import { emitErrorToast } from '../lib/toastBus'

export const AUTH_SESSION_EXPIRED_EVENT = 'yazoo:auth-session-expired'

const API_TIMEOUT_MS = 30000
const CSRF_TIMEOUT_MS = 10000

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

export const ensureCsrfCookie = () =>
  axios.get(`${getBackendBaseUrl()}/sanctum/csrf-cookie`, {
    withCredentials: true,
    timeout: CSRF_TIMEOUT_MS,
    headers: {
      Accept: 'application/json',
    },
  })

api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers?.delete === 'function') {
      config.headers.delete('Content-Type')
    } else {
      delete config.headers['Content-Type']
    }
  }

  const socketId = getCurrentSocketId()
  const locale = getCurrentLocale()

  if (typeof config.headers?.set === 'function') {
    config.headers.set('Accept-Language', locale)
  } else {
    config.headers = {
      ...(config.headers ?? {}),
      'Accept-Language': locale,
    }
  }

  if (socketId) {
    if (typeof config.headers?.set === 'function') {
      config.headers.set('X-Socket-ID', socketId)
    } else {
      config.headers = {
        ...(config.headers ?? {}),
        'X-Socket-ID': socketId,
      }
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldEmitAuthSessionExpired(error)) {
      globalThis.dispatchEvent?.(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT))
    }

    if (shouldShowGlobalErrorToast(error)) {
      emitErrorToast(
        getErrorMessage(error, getGlobalFallbackMessage(error?.response?.status)),
      )
    }

    return Promise.reject(error)
  },
)

function shouldEmitAuthSessionExpired(error) {
  if (error?.config?.skipAuthSessionExpired) {
    return false
  }

  if (error?.response?.status !== 401) {
    return false
  }

  const requestUrl = String(error?.config?.url ?? '')

  return !['/auth/login', '/auth/register', '/auth/me'].some((segment) =>
    requestUrl.includes(segment),
  )
}

function shouldShowGlobalErrorToast(error) {
  if (error?.config?.skipGlobalErrorToast) {
    return false
  }

  const status = error?.response?.status
  const requestUrl = String(error?.config?.url ?? '')

  if (!status) {
    return true
  }

  if (status === 401) {
    return !['/auth/login', '/auth/register', '/auth/me'].some((segment) =>
      requestUrl.includes(segment),
    )
  }

  return status === 429 || status >= 500
}

function getGlobalFallbackMessage(status) {
  const locale = getCurrentLocale()

  if (status === 401) {
    return translate(locale, 'errors.sessionExpired')
  }

  if (status === 429) {
    return translate(locale, 'errors.tooManyRequests')
  }

  if (status && status >= 500) {
    return translate(locale, 'errors.serverTemporary')
  }

  return translate(locale, 'errors.network')
}

export default api
