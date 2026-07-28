import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'

import { exportAdminModerationActionsCsvRequest, downloadCsvResponse } from '../api/adminExports'
import { getAdminModerationActionsRequest } from '../api/moderationActions'
import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { extractDataArray } from '../utils/apiData'
import { formatDate } from '../utils/formatDate'
import { getErrorMessage } from '../utils/getErrorMessage'

function AdminModerationActionsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [actions, setActions] = useState([])
  const [filters, setFilters] = useState({ action: '', target_type: '', date_from: '', date_to: '' })
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadActions = async (nextFilters = filters) => {
    setIsLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value))
      const response = await getAdminModerationActionsRequest(params)
      setActions(extractDataArray(response))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('moderationActions.loadError')))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.isAdmin) {
      void loadActions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isAdmin])

  if (!user?.isAdmin) {
    return <Navigate to="/feed" replace />
  }

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    void loadActions(filters)
  }

  const handleExport = async () => {
    try {
      const response = await exportAdminModerationActionsCsvRequest()
      downloadCsvResponse(response, 'yazoo-moderation-actions.csv')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('moderationActions.exportError')))
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8 sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">{t('moderationActions.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-violet-50">{t('moderationActions.title')}</h1>
        <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-violet-100/76">{t('moderationActions.subtitle')}</p>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-3 md:grid-cols-4">
          <Input value={filters.action} onChange={handleFilterChange('action')} placeholder={t('moderationActions.filters.action')} />
          <Input value={filters.target_type} onChange={handleFilterChange('target_type')} placeholder={t('moderationActions.filters.targetType')} />
          <Input type="date" value={filters.date_from} onChange={handleFilterChange('date_from')} />
          <Input type="date" value={filters.date_to} onChange={handleFilterChange('date_to')} />
          <div className="flex flex-wrap gap-2 md:col-span-4">
            <Button type="submit">{t('common.filter')}</Button>
            <Button type="button" variant="ghost" onClick={handleExport}>{t('exports.moderationActions')}</Button>
          </div>
        </form>
      </header>

      {errorMessage ? <Message>{errorMessage}</Message> : null}

      <div className="space-y-4">
        {isLoading ? <EmptyState>{t('common.loading')}</EmptyState> : null}
        {!isLoading && actions.length === 0 ? <EmptyState>{t('moderationActions.empty')}</EmptyState> : null}
        {actions.map((action) => (
          <article key={action.id} className="rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-stone-950 dark:text-violet-50">{t(`moderationActions.actions.${action.action}`)}</p>
                <p className="mt-1 text-sm text-stone-500 dark:text-violet-100/62">{action.admin?.name ?? t('common.admin')}</p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 dark:bg-white/10 dark:text-violet-100">
                {action.targetType} #{action.targetId}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-violet-100/72">{action.reason || t('moderationActions.noReason')}</p>
            <p className="mt-2 text-xs text-stone-500 dark:text-violet-100/58">{formatDate(action.createdAt)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Input(props) {
  return (
    <input
      className="min-w-0 rounded-full border border-violet-100 bg-violet-50/60 px-4 py-2.5 text-sm text-stone-700 outline-none focus:border-violet-400 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
      {...props}
    />
  )
}

function Message({ children }) {
  return <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-300/18 dark:bg-rose-400/10 dark:text-rose-100">{children}</div>
}

function EmptyState({ children }) {
  return (
    <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/70 px-5 py-14 text-center text-sm text-stone-500 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-100/70">
      {children}
    </div>
  )
}

export default AdminModerationActionsPage
