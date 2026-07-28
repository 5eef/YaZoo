import PropTypes from 'prop-types'
import { NavLink } from 'react-router'

import { useI18n } from '../../hooks/useI18n'
import { formatBadgeCount } from '../../utils/formatBadgeCount'
import AppIcon from '../ui/AppIcon'
import Avatar from '../ui/Avatar'
import UnreadBadge from './UnreadBadge'

function MobileBottomDock({ user, onCreateStory, t, messagesCount, notificationsCount }) {
  return (
    <nav className="fixed bottom-3 left-1/2 z-30 flex w-[calc(100%-1rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-[24px] border border-white/55 bg-[linear-gradient(135deg,_rgba(255,255,255,0.46),_rgba(248,240,255,0.32),_rgba(255,255,255,0.18))] px-1.5 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_20px_44px_rgba(124,58,237,0.14)] backdrop-blur-2xl dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(24,16,38,0.84),_rgba(49,24,83,0.58),_rgba(12,8,20,0.72))] lg:hidden">
      <MobileDockLink to="/feed" label={t('common.feed')} icon="home" />
      <MobileDockLink
        to="/notifications"
        label={t('common.notificationsShort')}
        icon="bell"
        badgeCount={notificationsCount}
        badgeLabel={t('notifications.unreadAria', { count: notificationsCount })}
      />
      <MobileDockStoryButton onClick={onCreateStory} label={t('common.story')} />
      <MobileDockLink
        to="/messages"
        label={t('common.messagesShort')}
        icon="chat"
        badgeCount={messagesCount}
        badgeLabel={t('messages.unreadAria', { count: messagesCount })}
      />
      <MobileDockProfileLink user={user} label={t('common.profile')} />
    </nav>
  )
}

function MobileDockLink({ to, label, icon, badgeCount = 0, badgeLabel = '' }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex min-w-[56px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
          isActive
            ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]'
            : 'text-stone-500 hover:bg-violet-50'
        }`
      }
    >
      <AppIcon name={icon} className="h-5 w-5" />
      {badgeCount > 0 ? <UnreadBadge label={badgeLabel}>{formatBadgeCount(badgeCount)}</UnreadBadge> : null}
      <span className="max-w-[4.25rem] truncate whitespace-nowrap">{label}</span>
    </NavLink>
  )
}

function MobileDockProfileLink({ user, label }) {
  const { t } = useI18n()

  return (
    <NavLink
      to="/profile"
      className={({ isActive }) =>
        `relative flex min-w-[56px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
          isActive
            ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]'
            : 'text-stone-500 hover:bg-violet-50'
        }`
      }
    >
      <Avatar
        name={user?.name ?? t('common.user')}
        src={user?.avatar || ''}
        className="h-5 w-5 border border-white/80 text-[10px]"
      />
      <span className="max-w-[4.25rem] truncate whitespace-nowrap">{label}</span>
    </NavLink>
  )
}

function MobileDockStoryButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-[64px] flex-col items-center gap-1 rounded-[20px] bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-3 py-2 text-[11px] font-semibold text-white transition hover:brightness-105"
      aria-label={label}
    >
      <AppIcon name="story" className="h-5 w-5" />
      <span className="max-w-[4.25rem] truncate whitespace-nowrap">{label}</span>
    </button>
  )
}

MobileBottomDock.propTypes = {
  user: PropTypes.object,
  onCreateStory: PropTypes.func,
  t: PropTypes.func,
  messagesCount: PropTypes.number,
  notificationsCount: PropTypes.number,
}

MobileDockLink.propTypes = {
  to: PropTypes.string,
  label: PropTypes.string,
  icon: PropTypes.string,
  badgeCount: PropTypes.number,
  badgeLabel: PropTypes.string,
}

MobileDockProfileLink.propTypes = {
  user: PropTypes.object,
  label: PropTypes.string,
}

MobileDockStoryButton.propTypes = {
  onClick: PropTypes.func,
  label: PropTypes.string,
}

export default MobileBottomDock
