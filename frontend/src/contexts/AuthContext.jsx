import { Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
import { invalidateSessionRequests } from '../api/sessionEpoch'
import { emitErrorToast } from '../lib/toastBus'
import { getCurrentLocale, translate } from '../lib/i18n'

const DEVICE_NAME = 'yazoo-web'
const SESSION_BARRIER = 'yazoo:session-barrier'
function hasSessionBarrier() {
  try { return Boolean(localStorage.getItem(SESSION_BARRIER)) } catch { return false }
}
function writeSessionBarrier(blocked) {
  try { localStorage.setItem(SESSION_BARRIER, blocked ? `blocked:${Date.now()}` : '') } catch { /* Storage may be unavailable. */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [hasEndedSession, setHasEndedSession] = useState(hasSessionBarrier)
  const { status: backendStatus } = useDemoBackendStatus()
  const i18n = useContext(I18nContext)
  const setLocale = useMemo(() => i18n?.setLocale ?? (() => {}), [i18n?.setLocale])
  const authRevision = useRef(0)
  const bootstrapPromiseRef = useRef(null)
  const logoutPromiseRef = useRef(null)
  const pendingCredentials = useRef(null)
  const [sessionEpoch, setSessionEpoch] = useState(0)
  const clearPrivateSession = useCallback(() => {
    authRevision.current += 1
    invalidateSessionRequests()
    disconnectRealtime()
    setMonitoringUser(null)
    setUser(null)
    setIsAuthenticated(false)
    setIsBootstrapping(false)
    setHasEndedSession(true)
    setSessionEpoch((current) => current + 1)
  }, [])

  const applyAuthenticatedUser = useCallback((nextUser) => {
    const normalizedUser = normalizeAuthUserMedia(nextUser)

    setUser(normalizedUser)

    if (normalizedUser?.preferredLocale) {
      setLocale(normalizedUser.preferredLocale)
    }
  }, [setLocale])

  useEffect(() => {
    if (hasSessionBarrier()) {
      setIsBootstrapping(false)
      return undefined
    }
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
      writeSessionBarrier(true)
      clearPrivateSession()
    }
    const handleStorage = (event) => {
      if (event.key === SESSION_BARRIER) clearPrivateSession()
    }
    const handlePageShow = (event) => {
      if (event.persisted || hasSessionBarrier()) clearPrivateSession()
    }

    globalThis.addEventListener?.(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)
    globalThis.addEventListener?.('storage', handleStorage)
    globalThis.addEventListener?.('pageshow', handlePageShow)

    return () => {
      globalThis.removeEventListener?.(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)
      globalThis.removeEventListener?.('storage', handleStorage)
      globalThis.removeEventListener?.('pageshow', handlePageShow)
    }
  }, [clearPrivateSession])

  useEffect(() => {
    setMonitoringUser(user)

    if (!user) {
      disconnectRealtime()
    }
  }, [user])

  const login = async ({ email, password }) => {
    if (logoutPromiseRef.current) await logoutPromiseRef.current
    const revision = ++authRevision.current
    const request = loginRequest({
      email,
      password,
      device_name: DEVICE_NAME,
    })
    pendingCredentials.current = request
    const response = await request

    if (revision !== authRevision.current) throw new Error('Obsolete authentication response')
    invalidateSessionRequests()
    writeSessionBarrier(false)
    setSessionEpoch((current) => current + 1)
    applyAuthenticatedUser(response.data.user)
    setIsAuthenticated(true)
    setHasEndedSession(false)

    return response.data
  }

  const register = async (payload) => {
    if (logoutPromiseRef.current) await logoutPromiseRef.current
    const revision = ++authRevision.current
    const request = registerRequest({
      ...payload,
      device_name: DEVICE_NAME,
    })
    pendingCredentials.current = request
    const response = await request

    if (revision !== authRevision.current) throw new Error('Obsolete authentication response')
    invalidateSessionRequests()
    writeSessionBarrier(false)
    setSessionEpoch((current) => current + 1)
    applyAuthenticatedUser(response.data.user)
    setIsAuthenticated(true)
    setHasEndedSession(false)

    return response.data
  }

  const logout = () => {
    if (logoutPromiseRef.current) return logoutPromiseRef.current
    writeSessionBarrier(true)
    clearPrivateSession()
    // One mutation only. A failed/ambiguous result stays locally locked across reloads.
    logoutPromiseRef.current = (async () => {
      try {
        // A pending login can still set an HttpOnly cookie even if its UI response is obsolete.
        if (pendingCredentials.current) await Promise.allSettled([pendingCredentials.current])
        await logoutRequest()
        try {
          await meRequest()
        } catch (error) {
          if (error?.response?.status === 401) return { remoteRevoked: true }
          throw error
        }
        throw new Error('Session still active after logout')
      } catch {
        emitErrorToast(translate(getCurrentLocale(), 'auth.logoutUnverified'))
        return { remoteRevoked: false }
      } finally {
        logoutPromiseRef.current = null
      }
    })()
    return logoutPromiseRef.current
  }

  const revisionAtRender = authRevision.current
  const updateCurrentUser = (nextUser) => {
    if (authRevision.current === revisionAtRender) setUser(nextUser)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token: null,
        isAuthenticated,
        isBootstrapping,
        hasEndedSession,
        login,
        logout,
        register,
        setUser: updateCurrentUser,
      }}
    >
      <Fragment key={sessionEpoch}>{children}</Fragment>
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node,
}
