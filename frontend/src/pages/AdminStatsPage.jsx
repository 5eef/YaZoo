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
  'users_registered', 'active_users_7_days', 'active_users_30_days',
  'professionals_submitted', 'professionals_approved', 'professionals_rejected', 'professionals_expired',
  'listings_submitted', 'listings_approved', 'listings_rejected', 'listings_pending',
  'moderation_average_hours', 'moderation_median_hours',
  'reservations_created', 'reservations_approved', 'reservations_completed', 'reservations_cancelled',
  'completed_reservation_gmv_mad', 'active_sellers', 'active_buyers', 'average_published_review',
  'pending_reports', 'pending_deletion_requests', 'appointments_created', 'appointments_pending',
  'appointments_confirmed', 'appointments_completed', 'appointments_cancelled', 'revenue_yazoo',
]

function AdminStatsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [stats, setStats] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState(30)

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const response = await getAdminStatsRequest(days)
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
  }, [days, user?.isAdmin])

  if (!user?.isAdmin) {
    return <Navigate to="/feed" replace />
  }

  const handleExportStats = async () => {
    try {
      const response = await exportAdminStatsCsvRequest(days)
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
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-violet-100">
            {t('adminKpi.period')}
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-full border border-violet-200 bg-white px-3 py-2 dark:bg-stone-950">
              {[7, 30, 90].map((value) => <option key={value} value={value}>{value} {t('adminKpi.days')}</option>)}
            </select>
          </label>
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
                {t(`adminKpi.labels.${key}`)}
              </p>
              <p className="mt-3 text-3xl font-semibold text-stone-950 dark:text-violet-50">
                {stats[key] === null || stats[key] === 'not_measured' ? t('adminKpi.notMeasured') : stats[key]}
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
