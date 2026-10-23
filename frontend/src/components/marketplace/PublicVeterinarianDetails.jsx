import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'
import { loginFor } from '../../lib/authDestination'
import { FavoriteButton, RatingSummary } from './MarketplaceCommon'

export default function PublicVeterinarianDetails({ listing }) {
  const { isAuthenticated } = useAuth()
  const { t, locale } = useI18n()
  const [slot, setSlot] = useState('')
  const destination = `/veterinarian-appointments?veterinarian=${listing.id}${slot ? `&slot=${slot}` : ''}`
  const action = (path) => isAuthenticated ? path : loginFor(path)
  const date = (value) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: listing.timezone || 'Africa/Casablanca' }).format(new Date(value))
  const linkClass = 'inline-flex items-center justify-center rounded-full bg-violet-700 px-4 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
  return <section className="mt-6 min-w-0 space-y-4">
    {listing.isDemo && <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950">{t('startup.demoData')}</p>}
    {listing.specialties?.length > 0 && <div><h2 className="font-semibold">{t('veterinarians.specialties')}</h2><ul className="mt-2 flex flex-wrap gap-2">{listing.specialties.map((value) => <li key={value} className="rounded-full bg-violet-100 px-3 py-1 text-sm text-violet-950 dark:bg-white/10 dark:text-violet-100">{value}</li>)}</ul></div>}
    {listing.workingHours?.length > 0 && <div><h2 className="font-semibold">{t('veterinarians.workingHours')}</h2><ul className="text-sm">{listing.workingHours.map((value, index) => <li key={index}>{typeof value === 'string' ? value : Object.values(value).join(' – ')}</li>)}</ul></div>}
    {listing.address && <p className="break-words text-sm">{listing.address}</p>}
    {listing.services?.length > 0 && <div><h2 className="font-semibold">{t('common.services')}</h2><ul>{listing.services.map((service) => <li key={service.id}><Link className="text-sm underline" to={`/discover/services/${service.id}`}>{service.title}</Link></li>)}</ul></div>}
    {(listing.latitude != null && listing.longitude != null) && <a className={linkClass} target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${encodeURIComponent(`${listing.latitude},${listing.longitude}`)}`}>{t('veterinarians.viewLocation')}</a>}
    <RatingSummary averageRating={listing.averageRating} reviewsCount={listing.reviewsCount} />
    {listing.reviews?.map((review, index) => <blockquote key={index} className="rounded-xl border border-violet-200 p-3 text-sm"><p>{review.rating}/5</p><p>{review.comment}</p></blockquote>)}
    <label className="block text-sm font-semibold">{t('vetAppointments.slot')} ({listing.timezone || 'Africa/Casablanca'})
      <select className="mt-2 block w-full min-w-0 rounded-xl border border-violet-300 bg-white p-3 text-stone-950 dark:bg-stone-950 dark:text-white" value={slot} onChange={(event) => setSlot(event.target.value)}>
        <option value="">{t('vetAppointments.choose')}</option>
        {(listing.availability ?? []).map((value) => <option key={value.id} value={value.id} disabled={!value.isAvailable}>{date(value.startsAt)}{!value.isAvailable ? ` — ${t('publicVet.unavailable')}` : ''}</option>)}
      </select>
    </label>
    {!listing.availability?.some((value) => value.isAvailable) && <p role="status" className="text-sm">{t('publicVet.noSlots')}</p>}
    <div className="flex flex-wrap gap-3">
      <Link className={linkClass} to={action(destination)}>{t('vetAppointments.book')}</Link>
      {listing.ownerId && <><Link className={linkClass} to={action(`/messages?user=${listing.ownerId}`)}>{t('publicVet.message')}</Link><Link className={linkClass} to={action(`/profile/${listing.ownerId}`)}>{t('publicVet.social')}</Link></>}
      {isAuthenticated ? <FavoriteButton type="veterinarians" itemId={listing.id} /> : <Link className={linkClass} to={loginFor(`/discover/veterinarians/${listing.id}`)}>{t('socialTrust.saveFavorite')}</Link>}
    </div>
  </section>
}
