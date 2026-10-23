import { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { confirmManualPayment, createReservationReview, getPayment, listReservationPayments } from '../../api/demoIntegration'
import { useI18n } from '../../hooks/useI18n'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/getErrorMessage'
import Button from '../ui/Button'
import { createReservationPaymentRequest } from '../../api/reservations'

export default function ReservationFollowUp({ reservation, onUpdated }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [payments, setPayments] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [notes, setNotes] = useState({})
  const [provider, setProvider] = useState('cash_on_pickup')
  const lock = useRef(false)
  async function perform(action) {
    if (lock.current) return
    lock.current = true; setBusy(true); setMessage('')
    try { await action() } catch (error) { setMessage(getErrorMessage(error, t('integration.failed'))) }
    finally { lock.current = false; setBusy(false) }
  }
  const load = async () => setPayments((await listReservationPayments(reservation.id)).data.data ?? [])
  async function review(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await perform(async () => {
      await createReservationReview(reservation.id, { rating: Number(form.get('rating')), comment: form.get('comment') })
      setReviewed(true); setMessage(t('integration.saved')); await onUpdated?.()
    })
  }
  return <section className="space-y-3 rounded-[22px] border border-violet-100 p-4 dark:border-violet-300/20">
    <Button variant="secondary" disabled={busy} onClick={() => perform(load)}>{t('integration.payments')}</Button>
    {reservation.isBuyer && reservation.reservationStatus === 'approved' && reservation.paymentStatus !== 'paid' && <div className="space-y-2">
      <p className="text-sm">{t('integration.manualNotice')}</p>
      <label>{t('integration.manualRequest')}<select value={provider} onChange={event => setProvider(event.target.value)} className="m-2 max-w-full rounded-xl border border-violet-200 bg-white p-2 dark:bg-stone-950">
        <option value="cash_on_pickup">{t('integration.cash')}</option><option value="manual_bank_transfer">{t('integration.bank')}</option>
      </select></label>
      <Button disabled={busy} variant="secondary" onClick={() => perform(async () => {
        if (!globalThis.confirm(t('integration.manualNotice'))) return
        await createReservationPaymentRequest(reservation.id, { provider })
        await load(); await onUpdated?.(); setMessage(t('integration.saved'))
      })}>{t('integration.manualRequest')}</Button>
    </div>}
    {payments?.length === 0 && <p>{t('integration.empty')}</p>}
    {payments?.map(payment => <div key={payment.id} className="flex flex-wrap items-center gap-3 text-sm">
      <span>{payment.provider} · {payment.status} · {payment.amount} {payment.currency}</span>
      <Button variant="ghost" disabled={busy} onClick={() => perform(async () => {
        const detail = (await getPayment(payment.id)).data.data
        setMessage(`${detail.internalReference ?? detail.id} · ${detail.status}`)
      })}>{t('integration.details')}</Button>
      {(user?.isAdmin || (reservation.isSeller && payment.provider === 'cash_on_pickup')) && ['cash_on_pickup', 'manual_bank_transfer'].includes(payment.provider) && ['pending', 'awaiting_verification'].includes(payment.status) && !['cancelled', 'rejected'].includes(reservation.reservationStatus) && <div className="w-full space-y-2">
      <label className="block">{t('integration.note')}<textarea maxLength={2000} value={notes[payment.id] ?? ''} onChange={event => setNotes(current => ({ ...current, [payment.id]: event.target.value }))} className="mt-2 w-full rounded-xl border border-violet-200 bg-white p-3 dark:bg-stone-950" /></label>
      <Button disabled={busy || (payment.provider === 'manual_bank_transfer' && !notes[payment.id]?.trim())} onClick={() => perform(async () => {
        if (!globalThis.confirm(t('integration.confirmReceipt'))) return
        await confirmManualPayment(payment.id, { note: notes[payment.id]?.trim() || null })
        await load(); await onUpdated?.(); setMessage(t('integration.saved'))
      })}>{t('integration.receipt')}</Button></div>}
    </div>)}
    {reservation.reviews?.hasPendingReview && !reviewed && <form onSubmit={review} className="grid gap-3">
      <label>{t('common.rating')}<select name="rating" defaultValue="5" className="mx-2 rounded-xl border border-violet-200 bg-white p-2 dark:bg-stone-950">{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label>
      <label>{t('integration.review')}<textarea name="comment" required minLength={10} maxLength={2000} className="mt-2 w-full rounded-xl border border-violet-200 bg-white p-3 dark:bg-stone-950" /></label>
      <Button type="submit" disabled={busy}>{t('integration.publishReview')}</Button>
    </form>}
    {message && <p role="status" className="break-words text-sm">{message}</p>}
  </section>
}
ReservationFollowUp.propTypes = { reservation: PropTypes.object.isRequired, onUpdated: PropTypes.func }
