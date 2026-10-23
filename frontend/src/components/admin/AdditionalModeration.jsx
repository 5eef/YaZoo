import { useRef, useState } from 'react'
import { listAdminReviews, listDeletionRequests, moderateReview, reviewDeletionRequest } from '../../api/demoIntegration'
import { useI18n } from '../../hooks/useI18n'
import { getErrorMessage } from '../../utils/getErrorMessage'
import Button from '../ui/Button'

export default function AdditionalModeration() {
  const { t } = useI18n()
  const [reviews, setReviews] = useState(null)
  const [requests, setRequests] = useState(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  async function perform(action) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await action() } catch (failure) { setError(getErrorMessage(failure, t('integration.failed'))) }
    finally { lock.current = false; setBusy(false) }
  }
  async function loadReviews(next = page) {
    const response = await listAdminReviews(next)
    setReviews(response.data.data ?? []); setPage(next); setLastPage(response.data.meta?.last_page ?? 1)
  }
  const loadRequests = async () => setRequests((await listDeletionRequests()).data.data ?? [])
  async function update(event, type, id) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await perform(async () => {
      if (!globalThis.confirm(t('integration.confirmChange'))) return
      if (type === 'review') {
        await moderateReview(id, { status: form.get('status'), moderation_reason: form.get('reason') }); await loadReviews()
      } else {
        await reviewDeletionRequest(id, { status: form.get('status'), admin_note: form.get('reason') }); await loadRequests()
      }
    })
  }
  const card = 'space-y-3 rounded-[26px] border border-violet-100 bg-white/90 p-5 dark:border-violet-300/20 dark:bg-white/8'
  return <section className={card}>
    <h2 className="text-xl font-semibold">{t('integration.additionalModeration')}</h2>
    <div className="flex flex-wrap gap-3">
      <Button disabled={busy} variant="secondary" onClick={() => perform(() => loadReviews(1))}>{t('integration.reviews')}</Button>
      <Button disabled={busy} variant="secondary" onClick={() => perform(loadRequests)}>{t('integration.deletions')}</Button>
    </div>
    {error && <p role="alert">{error}</p>}
    {[['review', reviews], ['request', requests]].map(([type, items]) => items && <div key={type} className="space-y-3">
      <h3 className="font-semibold">{t(type === 'review' ? 'integration.reviews' : 'integration.deletions')}</h3>
      {items.length === 0 && <p>{t('integration.empty')}</p>}
      {type === 'request' && <p className="text-sm">{t('integration.deletionLimit')}</p>}
      {items.map(item => <form key={item.id} onSubmit={event => update(event, type, item.id)} className={card}>
        <p className="break-words">#{item.id} · {item.user?.name ?? item.reviewer?.name} · {item.status}</p>
        <p className="break-words">{item.comment ?? item.reason}</p>
        <label>{t('integration.status')}<select name="status" defaultValue={item.status} className="m-2 max-w-full rounded-xl border border-violet-200 bg-white p-2 dark:bg-stone-950">
          {(type === 'review' ? ['published', 'pending_moderation', 'hidden', 'reported'] : ['pending', 'reviewed', 'rejected']).map(status => <option key={status}>{status}</option>)}
          {type === 'request' && item.status === 'completed' && <option disabled>completed</option>}
        </select></label>
        <label className="block">{t('integration.note')}<textarea name="reason" maxLength={type === 'review' ? 1000 : 2000} className="mt-2 w-full rounded-xl border border-violet-200 bg-white p-3 dark:bg-stone-950" /></label>
        <Button type="submit" disabled={busy || item.status === 'completed'}>{t('integration.save')}</Button>
      </form>)}
      {type === 'review' && <div className="flex gap-3"><Button disabled={busy || page <= 1} onClick={() => perform(() => loadReviews(page - 1))}>{t('integration.previous')}</Button><span>{page} / {lastPage}</span><Button disabled={busy || page >= lastPage} onClick={() => perform(() => loadReviews(page + 1))}>{t('integration.next')}</Button></div>}
    </div>)}
  </section>
}
