import { useEffect, useState } from 'react'

import api from '../api/client'
import { useDemoBackendStatus } from './useDemoBackendStatus'

export function useSmsAvailability() {
  const [smsAvailable, setSmsAvailable] = useState(null)
  const { status: backendStatus } = useDemoBackendStatus()

  useEffect(() => {
    if (backendStatus !== 'ready') {
      return undefined
    }

    let active = true

    api
      .get('/legal/config', {
        skipAuthSessionExpired: true,
        skipGlobalErrorToast: true,
      })
      .then((response) => {
        if (active) {
          setSmsAvailable(response.data?.smsAvailable === true)
        }
      })
      .catch(() => {
        if (active) {
          setSmsAvailable(false)
        }
      })

    return () => {
      active = false
    }
  }, [backendStatus])

  return smsAvailable
}
