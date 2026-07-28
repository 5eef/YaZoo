import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import {
  getNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from '../api/notifications'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import SkeletonBlock from '../components/ui/SkeletonBlock'
import { useI18n } from '../hooks/useI18n'
import { useNotifications } from '../hooks/useNotifications'
import { asArray, extractDataArray, extractDataObject } from '../utils/apiData'
import { formatDate } from '../utils/formatDate'
import { getErrorMessage } from '../utils/getErrorMessage'

function NotificationsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('q') ?? ''
  const { refreshUnreadCount, latestNotification } = useNotifications()
  const [notifications, setNotifications] = useState([])
  const [search, setSearch] = useState(queryFromUrl)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState([])
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')

  const safeNotifications = asArray(notifications)
  const unreadCount = safeNotifications.filter((notification) => !notification.isRead).length
  const readCount = safeNotifications.length - unreadCount
  const filteredNotifications = filterByReadState(safeNotifications, activeFilter)
  const visibleNotifications = filterNotifications(filteredNotifications, search, t)

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await getNotificationsRequest()

      setNotifications(extractDataArray(response))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('notifications.loadError')),
      )
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    setSearch(queryFromUrl)
  }, [queryFromUrl])

  useEffect(() => {
    if (!latestNotification) {
      return
    }

    setNotifications((currentNotifications) =>
      upsertNotification(currentNotifications, latestNotification),
    )
  }, [latestNotification])

  const handleMarkRead = async (notificationId, { silent = false } = {}) => {
    setProcessingIds((current) => [...current, notificationId])

    if (!silent) {
      setErrorMessage('')
      setSuccessMessage('')
    }

    try {
      const response = await markNotificationReadRequest(notificationId)
      const updatedNotification = extractDataObject(response, null)

      if (!updatedNotification) {
        return
      }

      setNotifications((current) =>
        asArray(current).map((notification) =>
          notification.id === updatedNotification.id
            ? updatedNotification
            : notification,
        ),
      )

      if (!silent) {
        setSuccessMessage(response.data.message)
      }

      await refreshUnreadCount()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('notifications.markReadError')),
      )
    } finally {
      setProcessingIds((current) => current.filter((id) => id !== notificationId))
    }
  }

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await markAllNotificationsReadRequest()

      setNotifications((current) =>
        asArray(current).map((notification) => ({
          ...notification,
          isRead: true,
        })),
      )
      setSuccessMessage(response.data.message)
      await refreshUnreadCount()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('notifications.markAllError')),
      )
    } finally {
      setIsMarkingAll(false)
    }
  }

  const handleOpenNotification = async (notification) => {
    if (!notification.isRead) {
      await handleMarkRead(notification.id, { silent: true })
    }

    navigate(notification.actionUrl ?? '/feed')
  }

  const handleSearch = (event) => {
    event.preventDefault()

    if (search.trim()) {
      setSearchParams({ q: search.trim() })
    } else {
      setSearchParams({})
    }
  }

  const handleResetSearch = () => {
    setSearch('')
    setSearchParams({})
  }

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(221,214,254,0.5),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.98)_0%,_rgba(247,241,255,0.9)_48%,_rgba(237,233,254,0.84)_100%)] p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:rounded-[32px] sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr] xl:items-center">
          <div>
            <p className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              {t('notifications.title')}
            </p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              {t('notifications.heroTitle')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              {t('notifications.heroDescription')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroStatCard label={t('common.total')} value={notifications.length} />
            <HeroStatCard label={t('notifications.unread')} value={unreadCount} />
            <HeroStatCard label={t('notifications.processed')} value={readCount} />
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)]">
        <div className="flex flex-col gap-4 border-b border-violet-100 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-violet-700">
              {t('notifications.center')}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-950">
              {t('notifications.title')}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {t('notifications.unreadCount', { count: unreadCount, plural: unreadCount > 1 ? 's' : '' })}
            </p>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <div className="rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
              {t('notifications.processedCount', { count: readCount, plural: readCount > 1 ? 's' : '' })}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll || unreadCount === 0}
              className="w-full sm:w-auto"
            >
              {isMarkingAll ? t('common.updating') : t('notifications.markAllRead')}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('notifications.searchPlaceholder')}
            className="flex-1 rounded-[22px] border border-violet-100 bg-[linear-gradient(135deg,_rgba(248,245,255,0.98),_rgba(255,255,255,0.94))] px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-300 focus:bg-white"
          />
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button type="submit" className="w-full sm:w-auto">
              {t('common.search')}
            </Button>
            {queryFromUrl ? (
              <Button type="button" variant="ghost" onClick={handleResetSearch} className="w-full sm:w-auto">
                {t('common.reset')}
              </Button>
            ) : null}
          </div>
        </form>

        <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
          {['all', 'unread', 'read'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeFilter === filter
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
              }`}
            >
              {t(`notifications.tabs.${filter}`)}
            </button>
          ))}
        </div>

        {isLoading ? <SkeletonBlock count={3} label={t('notifications.loading')} variant="notifications" /> : null}

        {!isLoading && notifications.length === 0 ? (
          <StateBox>{t('notifications.empty')}</StateBox>
        ) : null}

        {!isLoading && notifications.length > 0 && visibleNotifications.length === 0 ? (
          <StateBox>{t('notifications.noSearchResults')}</StateBox>
        ) : null}

        {!isLoading && visibleNotifications.length > 0 ? (
          <div className="mt-5 space-y-4">
            {visibleNotifications.map((notification) => {
              const isProcessing = processingIds.includes(notification.id)
              const isUnread = !notification.isRead
              const displayNotification = getDisplayNotification(notification, t)

              return (
                <article
                  key={notification.id}
                  className={`rounded-[28px] border p-5 shadow-[0_18px_36px_rgba(124,58,237,0.08)] transition duration-200 ${
                    isUnread
                      ? 'border-violet-200 bg-[linear-gradient(135deg,_rgba(244,237,255,0.96),_rgba(255,255,255,0.96),_rgba(237,233,254,0.78))]'
                      : 'border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,239,255,0.72))]'
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {displayNotification.avatarName || displayNotification.avatarSrc ? (
                        <Avatar
                          name={displayNotification.avatarName}
                          src={displayNotification.avatarSrc}
                          className="mt-1 shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] px-3 py-1 text-xs font-medium text-white shadow-[0_10px_20px_rgba(124,58,237,0.16)]">
                          {displayNotification.typeLabel}
                        </span>
                        {isUnread ? (
                          <span className="rounded-full bg-white/88 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                            {t('common.new')}
                          </span>
                        ) : (
                          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                            {t('notifications.read')}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-lg font-semibold text-stone-950">
                        {displayNotification.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {displayNotification.body}
                      </p>
                      <p className="mt-3 text-xs text-stone-400">
                        {formatDate(notification.createdAt)}
                      </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:flex sm:flex-wrap">
                      <Button
                        type="button"
                        onClick={() => handleOpenNotification(notification)}
                        className="w-full sm:w-auto"
                      >
                        {t('common.open')}
                      </Button>

                      {!notification.isRead ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleMarkRead(notification.id)}
                          disabled={isProcessing}
                          className="w-full sm:w-auto"
                        >
                          {isProcessing ? t('common.updating') : t('notifications.markRead')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function HeroStatCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/88 px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
    </div>
  )
}

function StateBox({ children }) {
  return (
    <div className="mt-5 rounded-[24px] border border-dashed border-violet-200 bg-white/84 px-4 py-16 text-center text-sm text-stone-500">
      {children}
    </div>
  )
}

function formatNotificationType(type, t) {
  const labels = {
    user_followed: t('notifications.types.follow'),
    new_message: t('messages.title'),
    post_comment: t('comments.title'),
    post_like: 'Like',
    community_join_request: t('communities.title'),
    community_joined: t('communities.title'),
    community_request_approved: t('communities.title'),
    community_request_rejected: t('communities.title'),
    reservation_requested: t('reservations.title'),
    reservation_approved: t('reservations.title'),
    reservation_rejected: t('reservations.title'),
    reservation_delivery_updated: t('marketplace.delivery'),
    reservation_completed: t('reservations.title'),
    reservation_cancelled: t('reservations.title'),
  }

  return labels[type] ?? t('notifications.title')
}

function getDisplayNotification(notification, t) {
  const typeLabel = formatNotificationType(notification.type, t)

  if (notification.type === 'user_followed') {
    const followerName =
      notification.meta?.follower_name ??
      notification.meta?.actor_name ??
      t('common.user')

    return {
      typeLabel,
      title: t('notifications.followTitle'),
      body: t('notifications.followBody', { name: followerName }),
      avatarName: followerName,
      avatarSrc: notification.meta?.follower_avatar ?? notification.meta?.actor_avatar_url ?? '',
    }
  }

  return {
    typeLabel,
    title: notification.title,
    body: notification.body,
    avatarName: notification.meta?.actor_name ?? notification.meta?.user_name ?? '',
    avatarSrc: notification.meta?.actor_avatar_url ?? notification.meta?.avatar ?? '',
  }
}

function upsertNotification(currentNotifications, nextNotification) {
  if (!nextNotification?.id) {
    return asArray(currentNotifications)
  }

  const remainingNotifications = asArray(currentNotifications).filter(
    (notification) => notification.id !== nextNotification.id,
  )

  return [nextNotification, ...remainingNotifications].sort(
    (firstNotification, secondNotification) =>
      new Date(secondNotification.createdAt ?? 0).getTime() -
      new Date(firstNotification.createdAt ?? 0).getTime(),
  )
}

function filterNotifications(notifications, searchTerm, t) {
  const safeNotifications = asArray(notifications)

  if (!searchTerm) {
    return safeNotifications
  }

  const normalizedSearch = normalizeSearchText(searchTerm)

  return safeNotifications.filter((notification) =>
    [
      getDisplayNotification(notification, t).title,
      getDisplayNotification(notification, t).body,
      notification.type,
      formatNotificationType(notification.type, t),
      notification.actionUrl,
      ...flattenMetaValues(notification.meta),
    ].some((value) => normalizeSearchText(value).includes(normalizedSearch)),
  )
}

function filterByReadState(notifications, filter) {
  const safeNotifications = asArray(notifications)

  if (filter === 'unread') {
    return safeNotifications.filter((notification) => !notification.isRead)
  }

  if (filter === 'read') {
    return safeNotifications.filter((notification) => notification.isRead)
  }

  return safeNotifications
}

function flattenMetaValues(meta) {
  if (!meta || typeof meta !== 'object') {
    return []
  }

  return Object.values(meta).flatMap((value) => {
    if (value && typeof value === 'object') {
      return flattenMetaValues(value)
    }

    return [value]
  })
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default NotificationsPage
