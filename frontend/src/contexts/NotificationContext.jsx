import { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

import { getUnreadNotificationsCountRequest } from '../api/notifications'
import { useAuth } from '../hooks/useAuth'
import { getNotificationsPollMs, isRealtimeEnabled as resolveRealtimeEnabled } from '../lib/appConfig'
import { subscribeRealtimeStatus, subscribeToPrivateChannel } from '../lib/realtime'
import { NotificationContext } from './notification-context'
import { useVisiblePolling } from '../hooks/useVisiblePolling'

const realtimeEnabled = resolveRealtimeEnabled()
const notificationsPollMs = getNotificationsPollMs()

export function NotificationProvider({ children }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [latestNotification, setLatestNotification] = useState(null)
  const [realtimeStatus, setRealtimeStatus] = useState(
    realtimeEnabled ? 'idle' : 'disabled',
  )

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return 0
    }

    try {
      const response = await getUnreadNotificationsCountRequest()
      const nextUnreadCount = response.data.data.unreadCount ?? 0

      setUnreadCount(nextUnreadCount)

      return nextUnreadCount
    } catch {
      return unreadCount
    }
  }, [isAuthenticated, unreadCount])

  const clearLatestNotification = useCallback(() => {
    setLatestNotification(null)
  }, [])

  useEffect(() => {
    if (!realtimeEnabled) {
      return undefined
    }

    return subscribeRealtimeStatus(setRealtimeStatus)
  }, [])

  useEffect(() => {
    if (!realtimeEnabled || !isAuthenticated || !user?.id) {
      return undefined
    }

    return subscribeToPrivateChannel(
      `users.${user.id}`,
      'notification.created',
      (payload) => {
        if (typeof payload?.unreadCount === 'number') {
          setUnreadCount(payload.unreadCount)
        }

        if (payload?.notification) {
          setLatestNotification(payload.notification)
        }
      },
    )
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    let cancelled = false

    const syncUnreadCount = async () => {
      if (!isAuthenticated) {
        if (!cancelled) {
          setUnreadCount(0)
        }

        return
      }

      try {
        const response = await getUnreadNotificationsCountRequest()

        if (!cancelled) {
          setUnreadCount(response.data.data.unreadCount ?? 0)
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0)
        }
      }
    }

    if (isBootstrapping) {
      return () => {
        cancelled = true
      }
    }

    void syncUnreadCount()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isBootstrapping, realtimeStatus])

  useVisiblePolling(async () => {
    const response = await getUnreadNotificationsCountRequest()
    setUnreadCount(response.data.data.unreadCount ?? 0)
  }, { enabled: isAuthenticated && !isBootstrapping && realtimeStatus !== 'connected', intervalMs: notificationsPollMs })

  const value = useMemo(
    () => ({
      unreadCount,
      latestNotification: isAuthenticated ? latestNotification : null,
      refreshUnreadCount,
      setUnreadCount,
      clearLatestNotification,
      realtimeStatus,
      isRealtimeEnabled: realtimeEnabled,
    }),
    [
      clearLatestNotification,
      isAuthenticated,
      latestNotification,
      realtimeStatus,
      refreshUnreadCount,
      unreadCount,
    ],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

NotificationProvider.propTypes = {
  children: PropTypes.node,
}
