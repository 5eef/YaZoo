import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import {
  createVeterinarianAppointmentRequest,
  createVeterinarianAvailabilityRequest,
  listVeterinarianAppointmentsRequest,
  listVeterinarianAvailabilityRequest,
  reviewVeterinarianAppointmentRequest,
  updateVeterinarianAppointmentStatusRequest,
} from '../api/veterinarianAppointments'
import Button from '../components/ui/Button'
import { useI18n } from '../hooks/useI18n'
import { getErrorMessage } from '../utils/getErrorMessage'
import { formatDate } from '../utils/formatDate'

function VeterinarianAppointmentsPage() {
  const { t, locale } = useI18n()
  const [searchParams] = useSearchParams()
  const veterinarianId = searchParams.get('veterinarian')
  const isOwner = searchParams.get('owner') === '1'
  const [appointments, setAppointments] = useState([])
  const [slots, setSlots] = useState([])
  const [selection, setSelection] = useState('')
  const [animalType, setAnimalType] = useState('')
  const [reason, setReason] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [message, setMessage] = useState('')
  const [ratings, setRatings] = useState({})

  const load = async () => {
    const response = await listVeterinarianAppointmentsRequest()
    setAppointments(response.data?.data ?? [])
    if (veterinarianId) {
      const availability = await listVeterinarianAvailabilityRequest(veterinarianId)
      setSlots(availability.data?.data ?? [])
    }
  }

  useEffect(() => {
    void load().catch((error) => setMessage(getErrorMessage(error, t('vetAppointments.loadError'))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veterinarianId])

  const submitAppointment = async (event) => {
    event.preventDefault()
    try {
      await createVeterinarianAppointmentRequest(veterinarianId, {
        availability_slot_id: Number(selection), animal_type: animalType, reason,
      })
      setMessage(t('vetAppointments.requested'))
      setSelection('')
      setAnimalType('')
      setReason('')
      await load()
    } catch (error) {
      setMessage(getErrorMessage(error, t('vetAppointments.actionError')))
    }
  }

  const submitSlot = async (event) => {
    event.preventDefault()
    try {
      await createVeterinarianAvailabilityRequest(veterinarianId, {
        starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(),
      })
      setStartsAt('')
      setEndsAt('')
      setMessage(t('vetAppointments.slotCreated'))
      await load()
    } catch (error) {
      setMessage(getErrorMessage(error, t('vetAppointments.actionError')))
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await updateVeterinarianAppointmentStatusRequest(id, { status })
      setMessage(t('vetAppointments.updated'))
      await load()
    } catch (error) {
      setMessage(getErrorMessage(error, t('vetAppointments.actionError')))
    }
  }

  const review = async (id) => {
    try {
      await reviewVeterinarianAppointmentRequest(id, { rating: Number(ratings[id] ?? 5) })
      setMessage(t('vetAppointments.reviewed'))
      await load()
    } catch (error) {
      setMessage(getErrorMessage(error, t('vetAppointments.actionError')))
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-xl dark:border-violet-300/15 dark:bg-white/8">
        <h1 className="text-3xl font-semibold text-stone-950 dark:text-white">{t('vetAppointments.title')}</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-violet-100/75">{t('vetAppointments.description')}</p>
      </header>

      {veterinarianId && !isOwner ? (
        <form onSubmit={submitAppointment} className="grid gap-4 rounded-[28px] bg-white/90 p-5 dark:bg-white/8 md:grid-cols-2">
          <label className="text-sm text-stone-700 dark:text-violet-100">{t('vetAppointments.slot')}
            <select required value={selection} onChange={(event) => setSelection(event.target.value)} className="mt-2 w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 dark:bg-stone-950">
              <option value="">{t('vetAppointments.choose')}</option>
              {slots.map((slot) => <option key={slot.id} value={slot.id}>{formatDate(slot.startsAt, locale)}</option>)}
            </select>
          </label>
          <label className="text-sm text-stone-700 dark:text-violet-100">{t('vetAppointments.animalType')}
            <input required value={animalType} onChange={(event) => setAnimalType(event.target.value)} className="mt-2 w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 dark:bg-stone-950" />
          </label>
          <label className="text-sm text-stone-700 dark:text-violet-100 md:col-span-2">{t('vetAppointments.reason')}
            <textarea required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 dark:bg-stone-950" />
          </label>
          <Button type="submit" disabled={!selection}>{t('vetAppointments.request')}</Button>
        </form>
      ) : null}

      {veterinarianId && isOwner ? (
        <form onSubmit={submitSlot} className="grid gap-4 rounded-[28px] bg-white/90 p-5 dark:bg-white/8 md:grid-cols-2">
          <label className="text-sm text-stone-700 dark:text-violet-100">{t('vetAppointments.startsAt')}<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 dark:bg-stone-950" /></label>
          <label className="text-sm text-stone-700 dark:text-violet-100">{t('vetAppointments.endsAt')}<input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-2 w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 dark:bg-stone-950" /></label>
          <Button type="submit">{t('vetAppointments.addSlot')}</Button>
        </form>
      ) : null}

      <div aria-live="polite" className="text-sm text-violet-800 dark:text-violet-100">{message}</div>
      <div className="grid gap-4">
        {appointments.map((appointment) => (
          <article key={appointment.id} className="rounded-[26px] border border-white/80 bg-white/90 p-5 dark:border-violet-300/15 dark:bg-white/8">
            <h2 className="font-semibold text-stone-950 dark:text-white">{appointment.veterinarianName}</h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-violet-100/75">{formatDate(appointment.startsAt, locale)} · {appointment.animalType}</p>
            <p className="mt-1 text-sm text-stone-700 dark:text-violet-100">{appointment.reason}</p>
            <p className="mt-2 text-xs font-semibold uppercase text-violet-700">{t(`vetAppointments.status.${appointment.status}`)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {appointment.canManage && appointment.status === 'pending' ? <Button type="button" onClick={() => updateStatus(appointment.id, 'confirmed')}>{t('vetAppointments.confirm')}</Button> : null}
              {appointment.canCancel ? <Button type="button" variant="ghost" onClick={() => updateStatus(appointment.id, 'cancelled')}>{t('common.cancel')}</Button> : null}
              {appointment.canManage && appointment.status === 'confirmed' ? <Button type="button" variant="secondary" onClick={() => updateStatus(appointment.id, 'completed')}>{t('vetAppointments.complete')}</Button> : null}
              {appointment.canReview ? (
                <div className="flex items-center gap-2">
                  <label htmlFor={`appointment-rating-${appointment.id}`} className="text-sm font-medium text-stone-700 dark:text-violet-100">
                    {t('common.rating')}
                  </label>
                  <select
                    id={`appointment-rating-${appointment.id}`}
                    value={ratings[appointment.id] ?? 5}
                    onChange={(event) => setRatings((current) => ({ ...current, [appointment.id]: Number(event.target.value) }))}
                    className="h-11 rounded-xl border border-violet-200 bg-white px-3 text-sm text-stone-800 dark:border-violet-300/20 dark:bg-white/10 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
                  </select>
                  <Button type="button" variant="secondary" onClick={() => review(appointment.id)}>{t('vetAppointments.review')}</Button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default VeterinarianAppointmentsPage
