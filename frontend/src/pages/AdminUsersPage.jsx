import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'

import {
  getAdminUsersRequest,
  updateAdminUserBanRequest,
  updateAdminUserSuspensionRequest,
} from '../api/adminUsers'
import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { extractDataArray } from '../utils/apiData'
import { formatDate } from '../utils/formatDate'
import { getErrorMessage } from '../utils/getErrorMessage'

function AdminUsersPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const loadUsers = async (params = {}) => {
    setIsLoading(true)
    try {
      const response = await getAdminUsersRequest(params)
      setUsers(extractDataArray(response))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('adminUsers.loadError')))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.isAdmin) {
      void loadUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isAdmin])

  if (!user?.isAdmin) {
    return <Navigate to="/feed" replace />
  }

  const handleSearch = (event) => {
    event.preventDefault()
    void loadUsers(query.trim() ? { q: query.trim() } : {})
  }

  const handleModeration = async ({ targetUser, action, reason }) => {
    setUpdatingId(targetUser.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const request = action === 'suspend' || action === 'unsuspend'
        ? updateAdminUserSuspensionRequest
        : updateAdminUserBanRequest
      const response = await request(targetUser.id, { action, reason })
      const updatedUser = response.data.user

      setUsers((current) => current.map((item) => (item.id === targetUser.id ? updatedUser : item)))
      setSuccessMessage(t('adminUsers.updateSuccess'))
      setModal(null)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('adminUsers.updateError')))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8 sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">{t('adminUsers.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-violet-50">{t('adminUsers.title')}</h1>
        <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-violet-100/76">{t('adminUsers.subtitle')}</p>
        <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 rounded-full border border-violet-100 bg-violet-50/60 px-4 py-2.5 text-sm text-stone-700 outline-none focus:border-violet-400 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
            placeholder={t('adminUsers.searchPlaceholder')}
          />
          <Button type="submit">{t('common.search')}</Button>
          <Button type="button" variant="ghost" onClick={() => { setQuery(''); void loadUsers() }}>{t('common.refresh')}</Button>
        </form>
      </header>

      {errorMessage ? <Message tone="error">{errorMessage}</Message> : null}
      {successMessage ? <Message tone="success">{successMessage}</Message> : null}

      <div className="space-y-4">
        {isLoading ? <EmptyState>{t('common.loading')}</EmptyState> : null}
        {!isLoading && users.length === 0 ? <EmptyState>{t('adminUsers.empty')}</EmptyState> : null}
        {users.map((item) => (
          <article key={item.id} className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-stone-950 dark:text-violet-50">#{item.id} - {item.name}</p>
                <p className="text-sm text-stone-500 dark:text-violet-100/62">{item.email ?? item.phone ?? t('common.notProvided')}</p>
              </div>
              <StatusPill user={item} t={t} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
              <Meta label={t('common.city')} value={item.city || t('common.notProvided')} />
              <Meta label={t('common.country')} value={item.country || t('common.notProvided')} />
              <Meta label={t('common.createdAt')} value={formatDate(item.createdAt)} />
              <Meta label={t('common.role')} value={item.isAdmin ? t('common.admin') : t('common.user')} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={updatingId === item.id || item.id === user.id}
                onClick={() => setModal({ targetUser: item, action: item.isSuspended ? 'unsuspend' : 'suspend' })}
              >
                {item.isSuspended ? t('adminUsers.unsuspend') : t('adminUsers.suspend')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={updatingId === item.id || item.id === user.id}
                onClick={() => setModal({ targetUser: item, action: item.isBanned ? 'unban' : 'ban' })}
              >
                {item.isBanned ? t('adminUsers.unban') : t('adminUsers.ban')}
              </Button>
            </div>
          </article>
        ))}
      </div>

      {modal ? (
        <ReasonModal
          modal={modal}
          isSubmitting={updatingId === modal.targetUser.id}
          onClose={() => setModal(null)}
          onSubmit={handleModeration}
          t={t}
        />
      ) : null}
    </section>
  )
}

function ReasonModal({ modal, isSubmitting, onClose, onSubmit, t }) {
  const [reason, setReason] = useState('')
  const requiresReason = modal.action === 'suspend' || modal.action === 'ban'

  const handleSubmit = (event) => {
    event.preventDefault()
    if (requiresReason && !reason.trim()) return
    void onSubmit({ ...modal, reason: reason.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_30px_80px_rgba(0,0,0,0.22)] dark:border-violet-300/14 dark:bg-[#150c23]">
        <h2 className="text-xl font-semibold text-stone-950 dark:text-violet-50">{t(`adminUsers.actions.${modal.action}`)}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-violet-100/72">{modal.targetUser.name}</p>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          required={requiresReason}
          className="mt-4 w-full rounded-[22px] border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none focus:border-violet-400 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
          placeholder={t('adminUsers.reasonPlaceholder')}
        />
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={isSubmitting || (requiresReason && !reason.trim())}>{t('common.confirm')}</Button>
        </div>
      </form>
    </div>
  )
}

function StatusPill({ user, t }) {
  const label = user.isBanned
    ? t('adminUsers.statuses.banned')
    : user.isSuspended
      ? t('adminUsers.statuses.suspended')
      : t('adminUsers.statuses.active')
  const tone = user.isBanned || user.isSuspended
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/18 dark:bg-rose-400/10 dark:text-rose-100'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/18 dark:bg-emerald-400/10 dark:text-emerald-100'

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{label}</span>
}

function Meta({ label, value }) {
  return (
    <div className="rounded-[20px] bg-violet-50/70 px-4 py-3 dark:bg-white/10">
      <dt className="text-xs uppercase tracking-[0.14em] text-stone-500 dark:text-violet-100/56">{label}</dt>
      <dd className="mt-1 break-words font-medium text-stone-900 dark:text-violet-50">{value}</dd>
    </div>
  )
}

function Message({ tone, children }) {
  const styles = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/18 dark:bg-emerald-400/10 dark:text-emerald-100'
    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/18 dark:bg-rose-400/10 dark:text-rose-100'

  return <div className={`rounded-[24px] border px-5 py-4 text-sm ${styles}`}>{children}</div>
}

function EmptyState({ children }) {
  return (
    <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/70 px-5 py-14 text-center text-sm text-stone-500 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-100/70">
      {children}
    </div>
  )
}

export default AdminUsersPage
