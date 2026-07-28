import { useEffect, useState } from 'react'

import api from '../api/client'

export function useSmsAvailability() {
  const [smsAvailable, setSmsAvailable] = useState(null)

  useEffect(() => {
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
  }, [])

  return smsAvailable
}
