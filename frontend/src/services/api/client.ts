import axios from 'axios'

import { getApiBaseUrl } from '../../lib/appConfig'
import { getCurrentLocale } from '../../lib/i18n'

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }

  const locale = getCurrentLocale()
  config.headers.set('Accept-Language', locale)

  return config
})
