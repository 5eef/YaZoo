import PropTypes from 'prop-types'
import { Link, NavLink } from 'react-router'

import AppIcon from '../ui/AppIcon'
import Avatar from '../ui/Avatar'

function DesktopSidebar({
  adminItems = [],
  isRtl = false,
  messagesCount = 0,
  primaryItems,
  secondaryItems,
  t,
  user,
}) {
  return (
    <aside
      className="yz-desktop-sidebar fixed left-0 top-0 z-50 hidden h-dvh w-20 flex-col overflow-hidden border-r border-white/60 bg-[linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(246,239,255,0.82))] shadow-[12px_0_34px_rgba(76,29,149,0.08)] backdrop-blur-2xl dark:border-violet-300/14 dark:bg-[linear-gradient(180deg,_rgba(13,8,22,0.96),_rgba(31,15,54,0.92))] xl:flex"
      data-testid="desktop-sidebar"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={t('layout.mainMenu')}
    >
      <Link
        to="/feed"
        className="m-2 flex h-16 shrink-0 items-center overflow-hidden rounded-[22px] px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        aria-label={t('layout.logoLabel')}
        title={t('layout.logoLabel')}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center">
          <img
            src="/yazoo-logo.webp"
            alt=""
            className="h-11 w-11 object-contain"
          />
        </span>
        <span className="yz-desktop-sidebar-label ms-2 min-w-0 overflow-hidden whitespace-nowrap">
          <span className="yz-wordmark block text-base">YaZoo</span>
          <span className="block truncate text-[11px] text-stone-500 dark:text-violet-100/65">
            {t('common.tagline')}
          </span>
        </span>
      </Link>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
        <div className="space-y-1">
          {primaryItems.map((item) => (
            <SidebarNavItem
              key={item.to}
              item={item}
              badgeCount={item.to === '/messages' ? messagesCount : 0}
              badgeLabel={
                item.to === '/messages'
                  ? t('messages.unreadAria', { count: messagesCount })
                  : ''
              }
            />
          ))}
        </div>

        {adminItems.length > 0 ? (
          <details className="mt-3 border-t border-violet-100/70 pt-3 dark:border-violet-300/12">
            <summary
              className="flex h-12 cursor-pointer list-none items-center overflow-hidden rounded-[18px] text-stone-600 transition hover:bg-white/65 hover:text-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 dark:text-violet-100/78 dark:hover:bg-white/10 dark:hover:text-white"
              title={t('common.adminContent')}
            >
              <span className="flex h-12 w-16 shrink-0 items-center justify-center">
                <AppIcon name="admin" className="h-6 w-6" />
              </span>
              <span className="yz-desktop-sidebar-label min-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold">
                {t('common.adminContent')}
              </span>
            </summary>
            <div className="mt-1 space-y-1">
              {adminItems.map((item) => (
                <SidebarNavItem key={item.to} item={item} compact />
              ))}
            </div>
          </details>
        ) : null}
      </nav>

      <div className="shrink-0 border-t border-violet-100/70 px-2 py-2 dark:border-violet-300/12">
        <div className="space-y-1">
          {secondaryItems.map((item) => (
            <SidebarNavItem key={item.to} item={item} />
          ))}
        </div>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `mt-2 flex h-14 items-center overflow-hidden rounded-[20px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
              isActive
                ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]'
                : 'text-stone-700 hover:bg-white/65 dark:text-violet-50 dark:hover:bg-white/10'
            }`
          }
          aria-label={t('profile.viewProfile')}
          title={t('profile.viewProfile')}
        >
          <span className="flex h-14 w-16 shrink-0 items-center justify-center">
            <Avatar
              name={user?.name ?? t('common.user')}
              src={user?.avatar || ''}
              className="h-9 w-9 border border-white/80 text-[10px]"
            />
          </span>
          <span className="yz-desktop-sidebar-label min-w-0 overflow-hidden whitespace-nowrap">
            <span className="block truncate text-sm font-semibold">
              {user?.name ?? t('common.user')}
            </span>
            <span className="block truncate text-[11px] opacity-70">
              {t('common.profile')}
            </span>
          </span>
        </NavLink>
      </div>
    </aside>
  )
}

function SidebarNavItem({ badgeCount = 0, badgeLabel = '', compact = false, item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `relative flex h-12 items-center overflow-hidden rounded-[18px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
          isActive
            ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]'
            : 'text-stone-600 hover:bg-white/65 hover:text-violet-900 dark:text-violet-100/78 dark:hover:bg-white/10 dark:hover:text-white'
        } ${compact ? 'text-xs' : 'text-sm'}`
      }
      aria-label={item.label}
      title={item.label}
    >
      <span className="relative flex h-12 w-16 shrink-0 items-center justify-center">
        <AppIcon name={item.icon} className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
        {badgeCount > 0 ? (
          <span
            className="absolute end-0 top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white shadow-[0_8px_18px_rgba(225,29,72,0.28)] ring-2 ring-white dark:ring-[#160d24]"
            aria-label={badgeLabel}
            dir="ltr"
          >
            {formatBadgeCount(badgeCount)}
          </span>
        ) : null}
      </span>
      <span className="yz-desktop-sidebar-label min-w-0 overflow-hidden whitespace-nowrap font-medium">
        <span className="block truncate">{item.label}</span>
      </span>
    </NavLink>
  )
}

function formatBadgeCount(count) {
  return count > 99 ? '99+' : String(count)
}

const navItemShape = PropTypes.shape({
  icon: PropTypes.string,
  label: PropTypes.string,
  to: PropTypes.string,
})

DesktopSidebar.propTypes = {
  adminItems: PropTypes.arrayOf(navItemShape),
  isRtl: PropTypes.bool,
  messagesCount: PropTypes.number,
  primaryItems: PropTypes.arrayOf(navItemShape).isRequired,
  secondaryItems: PropTypes.arrayOf(navItemShape).isRequired,
  t: PropTypes.func.isRequired,
  user: PropTypes.object,
}

SidebarNavItem.propTypes = {
  badgeCount: PropTypes.number,
  badgeLabel: PropTypes.string,
  compact: PropTypes.bool,
  item: navItemShape.isRequired,
}

export default DesktopSidebar
