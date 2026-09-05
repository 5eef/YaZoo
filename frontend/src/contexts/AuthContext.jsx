import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'

import {
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
} from '../api/auth'
import { AUTH_SESSION_EXPIRED_EVENT, ensureCsrfCookie } from '../api/client'
import { setMonitoringUser } from '../lib/monitoring'
import { disconnectRealtime } from '../lib/realtime'
import { normalizeAuthUserMedia } from '../utils/media'
import { AuthContext } from './auth-context'
import { I18nContext } from './i18n-context'
import { useDemoBackendStatus } from '../hooks/useDemoBackendStatus'

const DEVICE_NAME = 'yazoo-web'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const { status: backendStatus } = useDemoBackendStatus()
  const i18n = useContext(I18nContext)
  const setLocale = useMemo(() => i18n?.setLocale ?? (() => {}), [i18n?.setLocale])
  const authRevision = useRef(0)
  const bootstrapPromiseRef = useRef(null)

  const applyAuthenticatedUser = useCallback((nextUser) => {
    const normalizedUser = normalizeAuthUserMedia(nextUser)

    setUser(normalizedUser)

    if (normalizedUser?.preferredLocale) {
      setLocale(normalizedUser.preferredLocale)
    }
  }, [setLocale])

  useEffect(() => {
    if (backendStatus === 'unavailable') {
      setIsBootstrapping(false)
      return undefined
    }

    if (backendStatus !== 'ready') {
      return undefined
    }

    let cancelled = false

    if (!bootstrapPromiseRef.current) {
      const revisionAtStart = authRevision.current
      bootstrapPromiseRef.current = (async () => {
        await ensureCsrfCookie()
        const response = await meRequest()

        return {
          authenticated: true,
          revisionAtStart,
          user: response.data.user,
        }
      })().catch(() => ({ authenticated: false, revisionAtStart }))
    }

    bootstrapPromiseRef.current
      .then((result) => {
        if (cancelled || authRevision.current !== result.revisionAtStart) {
          return
        }

        if (result.authenticated) {
          applyAuthenticatedUser(result.user)
          setIsAuthenticated(true)
        } else if (authRevision.current === 0) {
          setUser(null)
          setIsAuthenticated(false)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [applyAuthenticatedUser, backendStatus])

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null)
      setIsAuthenticated(false)
    }

    globalThis.addEventListener?.(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)

    return () => {
      globalThis.removeEventListener?.(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
  }, [])

  useEffect(() => {
    setMonitoringUser(user)

    if (!user) {
      disconnectRealtime()
    }
  }, [user])

  const login = async ({ email, password }) => {
    const response = await loginRequest({
      email,
      password,
      device_name: DEVICE_NAME,
    })

    authRevision.current += 1
    applyAuthenticatedUser(response.data.user)
    setIsAuthenticated(true)

    return response.data
  }

  const register = async (payload) => {
    const response = await registerRequest({
      ...payload,
      device_name: DEVICE_NAME,
    })

    authRevision.current += 1
    applyAuthenticatedUser(response.data.user)
    setIsAuthenticated(true)

    return response.data
  }

  const logout = async () => {
    try {
      await logoutRequest()
    } finally {
      authRevision.current += 1
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token: null,
        isAuthenticated,
        isBootstrapping,
        login,
        logout,
        register,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node,
}
