import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import PropTypes from 'prop-types'

import { downloadCsvResponse, exportAdminStatsCsvRequest } from '../api/adminExports'
import { getAdminStatsRequest } from '../api/admin'
import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { getErrorMessage } from '../utils/getErrorMessage'

const STAT_KEYS = [
  'total_users',
  'total_posts',
  'total_animals',
  'total_products',
  'total_services',
  'total_veterinarians',
  'total_conversations',
  'total_messages',
  'total_reports_pending',
  'total_reservations',
  'users_last_7_days',
  'posts_last_7_days',
  'reports_last_7_days',
]

function AdminStatsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [stats, setStats] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const response = await getAdminStatsRequest()
      setStats(response.data ?? {})
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('adminStats.loadError')))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.isAdmin) {
      void loadStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isAdmin])

  if (!user?.isAdmin) {
    return <Navigate to="/feed" replace />
  }

  const handleExportStats = async () => {
    try {
      const response = await exportAdminStatsCsvRequest()
      downloadCsvResponse(response, 'yazoo-admin-stats.csv')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('exports.error')))
    }
  }

  return (
    <section className="space-y-6">
      <section className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
          {t('adminStats.eyebrow')}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-stone-950 dark:text-violet-50 sm:text-3xl">
          {t('adminStats.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600 dark:text-violet-100/75">
          {t('adminStats.subtitle')}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <LinkButton to="/admin/moderation">{t('common.adminContent')}</LinkButton>
          <LinkButton to="/admin/orders">{t('common.adminOrders')}</LinkButton>
          <Button type="button" variant="secondary" onClick={handleExportStats}>{t('exports.stats')}</Button>
          <Button type="button" variant="ghost" onClick={loadStats}>{t('common.refresh')}</Button>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[26px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <StateBox>{t('common.loading')}</StateBox>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_KEYS.map((key) => (
            <article
              key={key}
              className="rounded-[26px] border border-white/80 bg-white/86 p-5 shadow-[0_18px_40px_rgba(124,58,237,0.08)] dark:border-violet-300/12 dark:bg-white/8"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-violet-100/58">
                {t(`adminStats.labels.${key}`)}
              </p>
              <p className="mt-3 text-3xl font-semibold text-stone-950 dark:text-violet-50">
                {stats[key] ?? 0}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function LinkButton({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:bg-white/10 dark:text-violet-50"
    >
      {children}
    </Link>
  )
}

function StateBox({ children }) {
  return (
    <div className="rounded-[26px] border border-dashed border-violet-200 bg-white/72 px-4 py-12 text-center text-sm text-stone-500 dark:border-violet-300/20 dark:bg-white/8 dark:text-violet-100/70">
      {children}
    </div>
  )
}

LinkButton.propTypes = {
  to: PropTypes.string,
  children: PropTypes.node,
}

StateBox.propTypes = {
  children: PropTypes.node,
}

export default AdminStatsPage
