import { useEffect, useState } from 'react'

import api from '../api/client'

const emptyLegalConfig = Object.freeze({
  entityName: '',
  legalStatus: '',
  address: '',
  ice: '',
  privacyContactEmail: '',
  dataControllerName: '',
  dataRetentionDays: null,
  dataRequestResponseDays: null,
  contactEmail: '',
  contactPhone: '',
  contactWhatsapp: '',
  contactAvailable: null,
  smsAvailable: false,
})

let cachedConfig = null
let pendingRequest = null

function loadLegalConfig() {
  if (cachedConfig) {
    return Promise.resolve(cachedConfig)
  }

  pendingRequest ??= api.get('/legal/config', {
    skipAuthSessionExpired: true,
    skipGlobalErrorToast: true,
  }).then((response) => {
    cachedConfig = { ...emptyLegalConfig, ...(response.data ?? {}) }
    return cachedConfig
  }).finally(() => {
    pendingRequest = null
  })

  return pendingRequest
}

export function useLegalConfig() {
  const [config, setConfig] = useState(() => cachedConfig ?? emptyLegalConfig)
  const [isLoading, setIsLoading] = useState(() => cachedConfig === null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    loadLegalConfig()
      .then((nextConfig) => {
        if (!cancelled) {
          setConfig(nextConfig)
          setError(null)
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { config, isLoading, error }
}

export function resetLegalConfigCacheForTests() {
  cachedConfig = null
  pendingRequest = null
}
