import { Link } from 'react-router'
import PropTypes from 'prop-types'

import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'
import { updateProfileRequest } from '../api/profile'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { useTheme } from '../hooks/useTheme'

function SettingsPage() {
  const { logout, setUser, user } = useAuth()
  const { setLocale, t } = useI18n()
  const { theme, resolvedTheme, setTheme } = useTheme()

  const handleLocaleChange = async (nextLocale) => {
    setLocale(nextLocale)

    if (!user?.id) {
      return
    }

    setUser((currentUser) => (
      currentUser ? { ...currentUser, preferredLocale: nextLocale } : currentUser
    ))

    try {
      await updateProfileRequest(user.id, {
        name: user.name ?? 'Utilisateur',
        phone: user.phone ?? '',
        country: user.country ?? '',
        city: user.city ?? '',
        bio: user.bio ?? '',
        preferred_locale: nextLocale,
      })
    } catch {
      // Keep the local preference responsive even if the profile save is temporarily unavailable.
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      <section className="min-w-0 overflow-hidden rounded-[26px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_30%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(246,239,255,0.9))] p-4 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/16 dark:bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.28),_transparent_30%),linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:rounded-[30px] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name ?? t('common.user')} src={user?.avatar || ''} className="h-16 w-16" />
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-violet-700 dark:text-violet-200">
                {t('common.settings')}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-violet-50">
                {t('settings.title')}
              </h1>
              <p className="mt-1 text-sm text-stone-600 dark:text-violet-100/68">
                {t('settings.description')}
              </p>
            </div>
          </div>

          <Link
            to="/profile"
            className="rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-50 dark:hover:bg-white/12"
          >
            {t('settings.editProfile')}
          </Link>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:gap-5">
        <SettingsCard title={t('common.language')} description={t('settings.languageDescription')}>
          <LanguageSwitcher onLocaleChange={handleLocaleChange} />
        </SettingsCard>

        <SettingsCard
          title={t('settings.themeTitle')}
          description={t('settings.themeDescription', {
            mode: resolvedTheme === 'dark' ? t('common.dark') : t('common.light'),
          })}
        >
          <div className="flex flex-wrap gap-2">
            {[
              ['system', t('common.system')],
              ['light', t('common.light')],
              ['dark', t('common.dark')],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  theme === value
                    ? 'bg-violet-600 text-white shadow-[0_14px_28px_rgba(124,58,237,0.18)]'
                    : 'border border-violet-100 bg-white/78 text-violet-900 hover:bg-violet-50 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-50 dark:hover:bg-white/12'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard title={t('settings.accountTitle')} description={t('settings.accountDescription')}>
          <div className="grid gap-3 text-sm text-stone-600 dark:text-violet-100/70">
            <p>{t('common.name')} : <span className="font-semibold text-stone-950 dark:text-violet-50">{user?.name ?? t('common.user')}</span></p>
            <p>{t('common.email')} : <span className="font-semibold text-stone-950 dark:text-violet-50">{user?.email ?? t('common.notProvided')}</span></p>
            <p>{t('common.city')} : <span className="font-semibold text-stone-950 dark:text-violet-50">{user?.city ?? t('common.notProvided')}</span></p>
          </div>
        </SettingsCard>

        <SettingsCard title={t('settings.securityTitle')} description={t('settings.securityDescription')}>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/settings/privacy"
              className="rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-50"
            >
              {t('privacy.settings.shortTitle')}
            </Link>
            <Link
              to="/settings/professional-verification"
              className="rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-50"
            >
              {t('professionalVerification.shortTitle')}
            </Link>
            <Button type="button" variant="secondary" onClick={logout}>
              {t('common.logout')}
            </Button>
            <Link
              to="/contact"
              className="rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-50"
            >
              {t('settings.contactSupport')}
            </Link>
          </div>
        </SettingsCard>
      </div>
    </section>
  )
}

function SettingsCard({ title, description, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.9))] sm:rounded-[28px] sm:p-5">
      <h2 className="text-lg font-semibold text-stone-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-violet-100/78">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

SettingsCard.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node,
}

export default SettingsPage
