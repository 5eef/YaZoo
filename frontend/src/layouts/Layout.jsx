import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import PropTypes from 'prop-types'

import { getConversationsRequest, getUnreadMessagesCountRequest } from '../api/messages'
import {
  getNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from '../api/notifications'
import DesktopFloatingActions from '../components/navigation/DesktopFloatingActions'
import DesktopSidebar from '../components/navigation/DesktopSidebar'
import MobileBottomDock from '../components/navigation/MobileBottomDock'
import UnreadBadge from '../components/navigation/UnreadBadge'
import GlobalSearchInput from '../components/search/GlobalSearchInput'
import AppIcon from '../components/ui/AppIcon'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Footer from '../components/ui/Footer'
import OnboardingPrompt from '../components/ui/OnboardingPrompt'
import ScrollTopButton from '../components/ui/ScrollTopButton'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { useNotifications } from '../hooks/useNotifications'
import { asArray, extractDataArray, extractDataObject } from '../utils/apiData'
import { formatDate } from '../utils/formatDate'
import { formatBadgeCount } from '../utils/formatBadgeCount'
import { sortMessageConversations } from '../utils/messages'

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isBootstrapping, logout, user } = useAuth()
  const { isRtl, t } = useI18n()
  const { latestNotification, refreshUnreadCount, unreadCount } = useNotifications()
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [messagePreview, setMessagePreview] = useState([])
  const [isMessagesOpen, setIsMessagesOpen] = useState(false)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const desktopMessagesDockRef = useRef(null)
  const [notificationPreview, setNotificationPreview] = useState([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false)
  const [notificationFilter, setNotificationFilter] = useState('all')
  const notificationMenuRef = useRef(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const mobileMenuTriggerRef = useRef(null)
  const mobileMenuCloseRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    const focusTimerId = globalThis.setTimeout(() => {
      mobileMenuCloseRef.current?.focus()
    }, 30)

    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown)
      globalThis.clearTimeout(focusTimerId)
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (!isMobileMenuOpen) {
      mobileMenuTriggerRef.current?.focus()
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        !desktopMessagesDockRef.current?.contains(event.target)
      ) {
        setIsMessagesOpen(false)
      }

      if (!notificationMenuRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false)
      }
    }

    globalThis.addEventListener('pointerdown', handlePointerDown)

    return () => {
      globalThis.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (location.pathname.startsWith('/messages')) {
      setIsMessagesOpen(false)
    }
  }, [location.pathname])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMessagesOpen(false)
        setIsNotificationsOpen(false)
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)

    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('q') ?? ''
    const timeoutId = globalThis.setTimeout(() => {
      setGlobalSearch(query)
    }, 0)

    return () => {
      globalThis.clearTimeout(timeoutId)
    }
  }, [location.search])

  useEffect(() => {
    if (!latestNotification) {
      return
    }

    setNotificationPreview((current) => upsertNotificationPreview(current, latestNotification))
  }, [latestNotification])

  const loadNotificationPreview = useCallback(async () => {
    if (!isAuthenticated) {
      setNotificationPreview([])
      return
    }

    setIsNotificationsLoading(true)

    try {
      const response = await getNotificationsRequest()
      setNotificationPreview(extractDataArray(response).slice(0, 8))
    } catch {
      setNotificationPreview([])
    } finally {
      setIsNotificationsLoading(false)
    }
  }, [isAuthenticated])

  const handleToggleNotifications = async () => {
    const nextOpen = !isNotificationsOpen

    setIsNotificationsOpen(nextOpen)
    setIsMessagesOpen(false)

    if (nextOpen) {
      await loadNotificationPreview()
    }
  }

  const handleMarkNotificationRead = async (notification) => {
    if (!notification?.id || notification.isRead) {
      return
    }

    try {
      const response = await markNotificationReadRequest(notification.id)
      const updatedNotification = extractDataObject(response, notification)

      setNotificationPreview((current) =>
        asArray(current).map((item) =>
          item.id === updatedNotification.id ? updatedNotification : item,
        ),
      )
      await refreshUnreadCount()
    } catch {
      await refreshUnreadCount()
    }
  }

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsReadRequest()
      setNotificationPreview((current) =>
        asArray(current).map((notification) => ({
          ...notification,
          isRead: notification.type === 'new_message' ? notification.isRead : true,
        })),
      )
      await refreshUnreadCount()
    } catch {
      await refreshUnreadCount()
    }
  }

  const refreshUnreadMessagesCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadMessagesCount(0)
      return
    }

    try {
      const response = await getUnreadMessagesCountRequest()
      setUnreadMessagesCount(response.data.data.unreadCount ?? response.data.data.unread_count ?? 0)
    } catch {
      setUnreadMessagesCount(0)
    }
  }, [isAuthenticated])

  const loadMessagePreview = useCallback(async () => {
    if (!isAuthenticated) {
      setMessagePreview([])
      return
    }

    setIsMessagesLoading(true)

    try {
      const response = await getConversationsRequest()
      setMessagePreview(sortMessageConversations(extractDataArray(response)).slice(0, 6))
    } catch {
      setMessagePreview([])
    } finally {
      setIsMessagesLoading(false)
    }
  }, [isAuthenticated])

  const handleToggleMessages = async () => {
    const nextOpen = !isMessagesOpen

    setIsMessagesOpen(nextOpen)
    setIsNotificationsOpen(false)

    if (nextOpen) {
      await loadMessagePreview()
    }
  }

  useEffect(() => {
    if (isBootstrapping) {
      return undefined
    }

    const timeoutId = globalThis.setTimeout(refreshUnreadMessagesCount, 0)

    if (!isAuthenticated) {
      return () => {
        globalThis.clearTimeout(timeoutId)
      }
    }

    const intervalId = globalThis.setInterval(refreshUnreadMessagesCount, 45_000)

    return () => {
      globalThis.clearTimeout(timeoutId)
      globalThis.clearInterval(intervalId)
    }
  }, [isAuthenticated, isBootstrapping, location.pathname, refreshUnreadMessagesCount])

  useEffect(() => {
    if (latestNotification?.type !== 'new_message') {
      return
    }

    refreshUnreadMessagesCount()

    if (isMessagesOpen) {
      loadMessagePreview()
    }
  }, [isMessagesOpen, latestNotification, loadMessagePreview, refreshUnreadMessagesCount])

  const goToSearch = useCallback(
    (query) => {
      const safeQuery = query.trim()

      if (!safeQuery) {
        navigate('/search')
      } else {
        navigate(`/search?q=${encodeURIComponent(safeQuery)}`)
      }

      setIsMobileMenuOpen(false)
    },
    [navigate],
  )

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fffaff_0%,_#f7f1ff_100%)] px-4">
        <div className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)]">
          <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-violet-100" />
          <div className="mx-auto mt-4 h-4 w-40 animate-pulse rounded-full bg-violet-100" />
          <div className="mx-auto mt-3 h-3 w-56 animate-pulse rounded-full bg-violet-50" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const handleCreateStory = () => {
    navigate('/feed', {
      state: {
        openStoryComposer: true,
      },
    })
  }

  const handleGlobalSearch = (event) => {
    event.preventDefault()
    goToSearch(globalSearch)
  }

  const primaryNavigationItems = [
    { to: '/feed', label: t('common.feed'), icon: 'home' },
    { to: '/marketplace', label: t('common.marketplace'), icon: 'marketplace' },
    { to: '/communities', label: t('common.communities'), icon: 'communities' },
    { to: '/messages', label: t('common.messages'), icon: 'chat' },
    { to: '/reservations', label: t('common.reservations'), icon: 'reservations' },
    { to: '/veterinarian-appointments', label: t('vetAppointments.nav'), icon: 'reservations' },
    { to: '/orders/history', label: t('common.history'), icon: 'history' },
  ]
  const secondaryNavigationItems = [
    { to: '/trust', label: t('common.trustSafety'), icon: 'shield' },
    { to: '/settings', label: t('common.settings'), icon: 'settings' },
  ]
  const adminNavigationItems = []

  if (user?.isAdmin) {
    adminNavigationItems.push(
      { to: '/admin/moderation', label: t('common.adminContent'), icon: 'admin' },
      { to: '/admin/stats', label: t('common.adminStats'), icon: 'admin' },
      { to: '/admin/users', label: t('common.adminUsers'), icon: 'admin' },
      { to: '/admin/moderation-actions', label: t('common.adminModerationActions'), icon: 'admin' },
      { to: '/admin/animals/review', label: t('common.adminAnimalReview'), icon: 'admin' },
      { to: '/admin/professional-verifications', label: t('common.adminProfessionalVerifications'), icon: 'admin' },
      { to: '/admin/orders', label: t('common.adminOrders'), icon: 'admin' },
      { to: '/admin/security', label: t('adminMfa.nav'), icon: 'shield' },
    )
  }
  const navigationItems = [
    ...primaryNavigationItems,
    ...secondaryNavigationItems,
    ...adminNavigationItems,
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(244,208,255,0.24),_transparent_20%),linear-gradient(180deg,_#fffaff_0%,_#f7f1ff_100%)] transition-colors dark:bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.26),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(76,29,149,0.28),_transparent_24%),linear-gradient(180deg,_#08050d_0%,_#12091f_54%,_#1b1030_100%)]">
      <a href="#main-content" className="yz-skip-link">
        {t('accessibility.skipToContent')}
      </a>
      <DesktopSidebar
        adminItems={adminNavigationItems}
        isRtl={isRtl}
        messagesCount={unreadMessagesCount}
        primaryItems={primaryNavigationItems}
        secondaryItems={secondaryNavigationItems}
        t={t}
        user={user}
      />

      <div className="w-full overflow-x-clip px-3 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pt-4 lg:px-6 lg:pb-8 xl:pl-[6.5rem]">
        <header
          data-testid="app-header"
          className="sticky top-3 z-30 rounded-[26px] border border-white/55 bg-[linear-gradient(135deg,_rgba(255,255,255,0.52),_rgba(248,240,255,0.36),_rgba(255,255,255,0.24))] p-3 shadow-[0_20px_48px_rgba(124,58,237,0.1)] backdrop-blur-2xl transition-colors dark:border-violet-300/15 dark:bg-[linear-gradient(135deg,_rgba(24,16,38,0.82),_rgba(49,24,83,0.54),_rgba(12,8,20,0.72))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.38)] sm:p-4"
        >
          <div className="flex items-center gap-3">
            <NavLink to="/feed" className="flex min-w-0 items-center gap-3">
              <img src="/yazoo-logo.webp" alt={t('layout.logoLabel')} className="h-12 w-12 shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="yz-wordmark truncate text-base">YaZoo</p>
                <p className="truncate text-xs text-stone-700 dark:text-violet-100/78">{t('common.tagline')}</p>
              </div>
            </NavLink>

            <form onSubmit={handleGlobalSearch} className="hidden min-w-[220px] flex-1 md:block">
              <GlobalSearchInput value={globalSearch} onChange={setGlobalSearch} onSearch={goToSearch} />
            </form>

            <div className="ms-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                ref={mobileMenuTriggerRef}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/55 bg-white/35 text-stone-700 transition hover:border-violet-200 hover:bg-white/55 hover:text-violet-900 lg:hidden"
                aria-label={t('layout.menuOpen')}
                aria-expanded={isMobileMenuOpen}
                aria-controls="yazoo-mobile-navigation"
              >
                <AppIcon name="menu" className="h-5 w-5" />
              </button>

              <DesktopActionLink to="/feed" icon="home" label={t('common.feed')} className="hidden lg:inline-flex" />
              <NotificationMenu
                refObject={notificationMenuRef}
                filter={notificationFilter}
                isLoading={isNotificationsLoading}
                isOpen={isNotificationsOpen}
                notifications={notificationPreview}
                onFilterChange={setNotificationFilter}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onMarkRead={handleMarkNotificationRead}
                onToggle={handleToggleNotifications}
                t={t}
                unreadCount={unreadCount}
              />

              <Link
                to="/profile"
                className="hidden items-center gap-2 rounded-full border border-white/50 bg-white/35 px-3 py-1.5 transition hover:bg-white/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 dark:border-violet-300/15 dark:bg-white/8 dark:hover:bg-white/14 lg:flex"
                aria-label={t('profile.viewProfile')}
              >
                <Avatar
                  name={user?.name ?? t('common.user')}
                  src={user?.avatar || ''}
                  className="h-7 w-7 border border-white/80 text-[10px]"
                />
                <span className="max-w-[120px] truncate text-xs font-medium text-stone-700 dark:text-violet-50">
                  {user?.name ?? t('common.user')}
                </span>
              </Link>

              <Button type="button" variant="secondary" onClick={logout} className="hidden lg:inline-flex">
                {t('common.logout')}
              </Button>
            </div>
          </div>

          <form onSubmit={handleGlobalSearch} className="mt-3 md:hidden">
            <GlobalSearchInput value={globalSearch} onChange={setGlobalSearch} onSearch={goToSearch} />
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
            <InlinePill>
              {t('layout.unread', { count: unreadCount, suffix: unreadCount > 1 ? 's' : '' })}
            </InlinePill>
            {user?.isAdmin ? <InlinePill tone="violet">{t('common.adminContent')}</InlinePill> : null}
          </div>
        </header>

        <DesktopNav items={navigationItems} />

        <main id="main-content" className="mt-4 min-w-0 rounded-[30px] border border-white/55 bg-[linear-gradient(180deg,_rgba(255,255,255,0.6),_rgba(248,241,255,0.42),_rgba(255,255,255,0.28))] p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] shadow-[0_24px_70px_rgba(124,58,237,0.1)] backdrop-blur-2xl transition-colors dark:border-violet-300/14 dark:bg-[linear-gradient(180deg,_rgba(5,3,10,0.9),_rgba(24,11,43,0.82),_rgba(8,5,13,0.88))] dark:shadow-[0_30px_80px_rgba(0,0,0,0.44)] sm:rounded-[34px] sm:p-5 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-5">
          <Outlet />
          <Footer mode="app" className="mt-8" />
        </main>
      </div>

      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        items={navigationItems}
        user={user}
        onClose={() => setIsMobileMenuOpen(false)}
        onLogout={logout}
        onCreateStory={handleCreateStory}
        closeButtonRef={mobileMenuCloseRef}
        isRtl={isRtl}
        t={t}
      />

      <MobileBottomDock
        user={user}
        marketplacePublishing={user?.marketplacePublishing}
        t={t}
        messagesCount={unreadMessagesCount}
      />
      {!location.pathname.startsWith('/messages') ? (
        <DesktopFloatingActions
          conversations={messagePreview}
          isLoading={isMessagesLoading}
          isMessagesOpen={isMessagesOpen}
          isRtl={isRtl}
          marketplacePublishing={user?.marketplacePublishing}
          onToggleMessages={handleToggleMessages}
          refObject={desktopMessagesDockRef}
          t={t}
          unreadCount={unreadMessagesCount}
        />
      ) : null}
      <ScrollTopButton />
      <OnboardingPrompt userId={user?.id} />
    </div>
  )
}

function DesktopNav({ items }) {
  return (
    <nav className="mt-3 hidden overflow-x-auto rounded-[24px] border border-white/55 bg-[linear-gradient(135deg,_rgba(255,255,255,0.44),_rgba(248,240,255,0.32),_rgba(255,255,255,0.2))] p-2 shadow-[0_16px_36px_rgba(124,58,237,0.08)] backdrop-blur-2xl transition-colors dark:border-violet-300/12 dark:bg-[linear-gradient(135deg,_rgba(24,16,38,0.64),_rgba(49,24,83,0.34),_rgba(12,8,20,0.56))] lg:block xl:hidden">
      <div className="mx-auto flex min-w-max items-center justify-center gap-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]'
                  : 'text-stone-600 hover:bg-white/55 hover:text-violet-900 dark:text-violet-100/78 dark:hover:bg-white/10 dark:hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function MobileMenuDrawer({
  isOpen,
  items,
  user,
  onClose,
  onLogout,
  onCreateStory,
  closeButtonRef,
  isRtl,
  t,
}) {
  const closedTransform = isRtl ? '-translate-x-full' : 'translate-x-full'
  const sideClass = isRtl
    ? 'left-0 border-r'
    : 'right-0 border-l'

  return (
    <div className={`fixed inset-0 z-40 lg:hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('layout.menuClose')}
        className={`absolute inset-0 bg-violet-950/30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />

      <aside
        id="yazoo-mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label={t('layout.mainMenu')}
        className={`absolute top-0 h-full w-[86%] max-w-sm overflow-y-auto border-white/55 bg-[linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(246,239,255,0.95))] p-4 shadow-[0_30px_70px_rgba(124,58,237,0.2)] backdrop-blur-2xl transition-transform duration-300 dark:border-violet-300/16 dark:bg-[linear-gradient(180deg,_rgba(12,8,20,0.98),_rgba(32,16,55,0.96))] ${sideClass} ${isOpen ? 'translate-x-0' : closedTransform}`}
          >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              onClick={onClose}
              className="shrink-0 rounded-[20px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
              aria-label={t('profile.viewProfile')}
            >
              <Avatar
                name={user?.name ?? t('common.user')}
                src={user?.avatar || ''}
                className="border border-white/80"
              />
            </Link>
            <div>
              <p className="text-sm font-semibold text-stone-950 dark:text-violet-50">{user?.name ?? t('common.user')}</p>
              <p className="text-xs text-stone-500">
                {t('layout.quickNavigation')} <span className="yz-wordmark text-xs font-semibold">YaZoo</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            ref={closeButtonRef}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/55 bg-white/55 text-stone-700 transition hover:border-violet-200 hover:text-violet-900"
            aria-label={t('layout.menuClose')}
          >
            <AppIcon name="close" className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-5 space-y-2">
          {items.map((item) => (
            <NavLink
              key={`mobile-menu-${item.to}`}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]'
                    : 'text-stone-700 hover:bg-violet-50 hover:text-violet-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 grid gap-3">
          <Button
            type="button"
            onClick={() => {
              onClose()
              onCreateStory()
            }}
          >
            {t('creation.createStory')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onClose()
              onLogout()
            }}
          >
            {t('common.logout')}
          </Button>
        </div>
      </aside>
    </div>
  )
}

function DesktopActionLink({ to, icon, label, badgeCount = 0, badgeLabel = '', className = '' }) {
  const formattedBadge = formatBadgeCount(badgeCount)

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${className} relative h-10 w-10 items-center justify-center rounded-2xl border transition ${
          isActive
            ? 'border-violet-300 bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_10px_22px_rgba(124,58,237,0.18)]'
            : 'border-white/55 bg-white/35 text-stone-700 hover:border-violet-200 hover:bg-white/55 hover:text-violet-900'
        }`
      }
      aria-label={label}
      title={label}
    >
      <AppIcon name={icon} className="h-5 w-5" />
      {badgeCount > 0 ? <UnreadBadge label={badgeLabel}>{formattedBadge}</UnreadBadge> : null}
    </NavLink>
  )
}

function NotificationMenu({
  filter,
  isLoading,
  isOpen,
  notifications,
  onFilterChange,
  onMarkAllRead,
  onMarkRead,
  onToggle,
  refObject,
  t,
  unreadCount,
}) {
  const safeNotifications = asArray(notifications).filter(
    (notification) => notification.type !== 'new_message',
  )
  const visibleNotifications =
    filter === 'unread'
      ? safeNotifications.filter((notification) => !notification.isRead)
      : safeNotifications

  return (
    <div ref={refObject} className="relative hidden lg:block">
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
          isOpen
            ? 'border-violet-300 bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_10px_22px_rgba(124,58,237,0.18)]'
            : 'border-white/55 bg-white/35 text-stone-700 hover:border-violet-200 hover:bg-white/55 hover:text-violet-900 dark:border-violet-300/15 dark:bg-white/8 dark:text-violet-50 dark:hover:bg-white/14'
        }`}
        aria-label={t('common.notifications')}
        aria-expanded={isOpen}
        title={t('common.notifications')}
      >
        <AppIcon name="bell" className="h-5 w-5" />
        {unreadCount > 0 ? (
          <UnreadBadge label={t('notifications.unreadAria', { count: unreadCount })}>
            {formatBadgeCount(unreadCount)}
          </UnreadBadge>
        ) : null}
      </button>

      {isOpen ? (
        <section className="absolute end-0 top-[calc(100%+0.75rem)] z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-white/70 bg-white/96 text-start shadow-[0_28px_70px_rgba(35,13,68,0.22)] backdrop-blur-2xl dark:border-violet-300/16 dark:bg-[#150c23]/96">
          <header className="border-b border-violet-100/70 px-4 py-4 dark:border-violet-300/14">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-950 dark:text-violet-50">
                {t('notifications.title')}
              </h2>
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-100 dark:hover:bg-white/10"
              >
                {t('notifications.markAllRead')}
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              {['all', 'unread'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onFilterChange(tab)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filter === tab
                      ? 'bg-violet-600 text-white'
                      : 'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-white/10 dark:text-violet-100'
                  }`}
                >
                  {t(`notifications.tabs.${tab}`)}
                </button>
              ))}
            </div>
          </header>

          <div className="max-h-[28rem] overflow-y-auto p-2">
            {isLoading ? <NotificationState>{t('notifications.loading')}</NotificationState> : null}
            {!isLoading && visibleNotifications.length === 0 ? (
              <NotificationState>{t('notifications.empty')}</NotificationState>
            ) : null}
            {!isLoading && visibleNotifications.length > 0 ? (
              <div className="space-y-1">
                {visibleNotifications.map((notification) => {
                  const display = getNotificationMenuDisplay(notification, t)

                  return (
                    <Link
                      key={notification.id}
                      to={notification.actionUrl ?? '/notifications'}
                      onClick={() => {
                        onMarkRead(notification)
                      }}
                      className={`flex min-w-0 gap-3 rounded-[22px] px-3 py-3 transition hover:bg-violet-50 dark:hover:bg-white/10 ${
                        notification.isRead ? '' : 'bg-violet-50/70 dark:bg-violet-500/12'
                      }`}
                    >
                      <Avatar
                        name={display.avatarName}
                        src={display.avatarSrc}
                        className="h-11 w-11 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-stone-950 dark:text-violet-50">
                          {display.title}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-stone-600 dark:text-violet-100/72">
                          {display.body}
                        </span>
                        <span className="mt-1 block text-[11px] font-medium text-violet-700 dark:text-violet-200">
                          {formatDate(notification.createdAt)}
                        </span>
                      </span>
                      {!notification.isRead ? (
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-600" />
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </div>

          <footer className="border-t border-violet-100/70 p-3 dark:border-violet-300/14">
            <Link
              to="/notifications"
              className="block rounded-[18px] bg-violet-50 px-4 py-2.5 text-center text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:bg-white/10 dark:text-violet-50 dark:hover:bg-white/14"
            >
              {t('notifications.viewAll')}
            </Link>
          </footer>
        </section>
      ) : null}
    </div>
  )
}

function NotificationState({ children }) {
  return (
    <div className="px-4 py-10 text-center text-sm text-stone-500 dark:text-violet-100/70">
      {children}
    </div>
  )
}

function getNotificationMenuDisplay(notification, t) {
  if (notification.type === 'user_followed') {
    const followerName =
      notification.meta?.follower_name ??
      notification.meta?.actor_name ??
      t('common.user')

    return {
      title: t('notifications.followTitle'),
      body: t('notifications.followBody', { name: followerName }),
      avatarName: followerName,
      avatarSrc: notification.meta?.follower_avatar ?? notification.meta?.actor_avatar_url ?? '',
    }
  }

  const actorName =
    notification.meta?.actor_name ??
    notification.meta?.member_name ??
    notification.meta?.user_name ??
    notification.meta?.buyer_name ??
    notification.meta?.seller_name ??
    ''

  return {
    title: notification.title ?? t('notifications.title'),
    body: notification.body ?? '',
    avatarName: actorName || notification.title || t('notifications.title'),
    avatarSrc: notification.meta?.actor_avatar_url ?? notification.meta?.avatar ?? '',
  }
}

function upsertNotificationPreview(currentNotifications, nextNotification) {
  if (!nextNotification?.id || nextNotification.type === 'new_message') {
    return asArray(currentNotifications)
  }

  const remainingNotifications = asArray(currentNotifications).filter(
    (notification) => notification.id !== nextNotification.id,
  )

  return [nextNotification, ...remainingNotifications].slice(0, 8)
}

function InlinePill({ children, tone = 'stone' }) {
  const tones = {
    stone: 'border border-white/50 bg-white/32 text-stone-700 backdrop-blur-xl',
    violet: 'border border-violet-200/40 bg-violet-500/10 text-violet-950 backdrop-blur-xl',
    emerald: 'border border-emerald-200/45 bg-emerald-500/10 text-emerald-900 backdrop-blur-xl',
    amber: 'border border-amber-200/50 bg-amber-400/12 text-amber-900 backdrop-blur-xl',
  }

  return (
    <div className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium shadow-[0_8px_20px_rgba(124,58,237,0.06)] ${tones[tone]}`}>
      {children}
    </div>
  )
}

DesktopNav.propTypes = {
  items: PropTypes.array,
}

MobileMenuDrawer.propTypes = {
  isOpen: PropTypes.bool,
  items: PropTypes.array,
  user: PropTypes.object,
  onClose: PropTypes.func,
  onLogout: PropTypes.func,
  onCreateStory: PropTypes.func,
  closeButtonRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  isRtl: PropTypes.bool,
  t: PropTypes.func,
}

DesktopActionLink.propTypes = {
  to: PropTypes.string,
  icon: PropTypes.string,
  label: PropTypes.string,
  badgeCount: PropTypes.number,
  badgeLabel: PropTypes.string,
  className: PropTypes.string,
}

NotificationMenu.propTypes = {
  filter: PropTypes.string,
  isLoading: PropTypes.bool,
  isOpen: PropTypes.bool,
  notifications: PropTypes.array,
  onFilterChange: PropTypes.func,
  onMarkAllRead: PropTypes.func,
  onMarkRead: PropTypes.func,
  onToggle: PropTypes.func,
  refObject: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  t: PropTypes.func,
  unreadCount: PropTypes.number,
}

NotificationState.propTypes = {
  children: PropTypes.node,
}

InlinePill.propTypes = {
  children: PropTypes.node,
  tone: PropTypes.string,
}

export default Layout
