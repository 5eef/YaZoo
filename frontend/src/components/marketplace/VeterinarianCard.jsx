import PropTypes from 'prop-types'
import { Link } from 'react-router'

import { useI18n } from '../../hooks/useI18n'
import ReportButton from '../reports/ReportButton'
import { FavoriteButton, RatingSummary, SellerTrustBadges, TrustBadge } from './MarketplaceCommon'

function VeterinarianCard({ veterinarian }) {
  const { t } = useI18n()
  const mapsUrl = getLocationUrl(veterinarian)
  const whatsappNumber = sanitizePhone(veterinarian.whatsapp || veterinarian.phone)

  return (
    <article className="min-w-0 overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,239,255,0.9))] p-4 shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:p-5">
      <div className="flex min-w-0 gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[24px] border border-violet-100 bg-violet-50 dark:border-violet-300/18 dark:bg-white/10">
          {veterinarian.imageUrl ? (
            <img
              src={veterinarian.imageUrl}
              alt={veterinarian.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-violet-700 dark:text-violet-100">
              {getInitial(veterinarian.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 text-start">
          <p className="inline-flex max-w-full rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50">
            {t('marketplaceBadges.veterinarianCategory')}
          </p>
          <h3 className="mt-2 truncate text-lg font-semibold text-stone-950 dark:text-white">
            {veterinarian.name}
          </h3>
          {veterinarian.clinicName ? (
            <p className="truncate text-sm font-medium text-violet-800 dark:text-violet-100">
              {veterinarian.clinicName}
            </p>
          ) : null}
          <p className="mt-1 truncate text-sm text-stone-500 dark:text-violet-100/72">
            {[veterinarian.city, veterinarian.address].filter(Boolean).join(' - ') || t('veterinarians.noLocation')}
          </p>
        </div>
      </div>

      <p className="mt-4 min-w-0 break-words text-start text-sm leading-6 text-stone-600 dark:text-violet-100/78">
        {veterinarian.description || t('marketplace.noDescription')}
      </p>

      <div className="mt-3">
        <RatingSummary averageRating={veterinarian.averageRating} reviewsCount={veterinarian.reviewsCount} compact />
      </div>

      {veterinarian.specialties?.length ? (
        <div className="mt-4 flex max-w-full flex-wrap gap-2">
          {veterinarian.specialties.map((specialty) => (
            <span
              key={specialty}
              className="min-w-0 rounded-full border border-violet-100 bg-white/82 px-3 py-1 text-xs font-semibold text-violet-900 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
            >
              {specialty}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <TrustBadge tone="violet">{veterinarian.city || t('veterinarians.noLocation')}</TrustBadge>
        {veterinarian.phone ? <TrustBadge tone="emerald">{t('marketplaceBadges.phoneContact')}</TrustBadge> : null}
        {veterinarian.whatsapp ? <TrustBadge tone="emerald">{t('marketplaceBadges.whatsappAvailable')}</TrustBadge> : null}
      </div>

      <div className="mt-3">
        <SellerTrustBadges author={veterinarian.owner} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {veterinarian.phone ? (
          <ContactLink href={`tel:${veterinarian.phone}`} label={t('veterinarians.call')} value={veterinarian.phone} />
        ) : null}
        {whatsappNumber ? (
          <ContactLink href={`https://wa.me/${whatsappNumber}`} label={t('veterinarians.openWhatsApp')} value={t('veterinarians.whatsapp')} external />
        ) : null}
        {veterinarian.email ? (
          <ContactLink href={`mailto:${veterinarian.email}`} label={t('veterinarians.sendEmail')} value={veterinarian.email} />
        ) : null}
        {mapsUrl ? (
          <ContactLink href={mapsUrl} label={t('veterinarians.viewLocation')} value={t('veterinarians.location')} external />
        ) : null}
      </div>
      <div className="mt-4">
        <Link
          to={`/veterinarian-appointments?veterinarian=${veterinarian.id}${veterinarian.isOwner ? '&owner=1' : ''}`}
          className="mb-3 inline-flex rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
        >
          {veterinarian.isOwner ? t('vetAppointments.manageSlots') : t('vetAppointments.book')}
        </Link>
        {!veterinarian.isOwner ? (
          <div className="mb-3">
            <FavoriteButton type="veterinarians" itemId={veterinarian.id} initialFavorited={veterinarian.isFavorited} />
          </div>
        ) : null}
        <ReportButton
          reportableType="veterinarian"
          reportableId={veterinarian.id}
          isOwner={veterinarian.isOwner}
        />
      </div>
    </article>
  )
}

function ContactLink({ href, label, value, external = false }) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="min-w-0 rounded-[20px] border border-violet-100 bg-white/86 px-4 py-3 text-start text-sm transition hover:border-violet-200 hover:bg-violet-50 dark:border-violet-300/18 dark:bg-white/10 dark:hover:bg-white/14"
    >
      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-violet-100/60">
        {label}
      </span>
      <span className="mt-1 block truncate font-semibold text-violet-900 dark:text-violet-50" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
        {value}
      </span>
    </a>
  )
}

function getLocationUrl(veterinarian) {
  if (veterinarian.locationUrl) return veterinarian.locationUrl

  if (veterinarian.latitude !== null && veterinarian.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${veterinarian.latitude},${veterinarian.longitude}`)}`
  }

  if (veterinarian.address || veterinarian.city) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([veterinarian.address, veterinarian.city].filter(Boolean).join(', '))}`
  }

  return null
}

function sanitizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')

  return digits || null
}

function getInitial(value) {
  return String(value ?? '?').trim().charAt(0).toUpperCase() || '?'
}

VeterinarianCard.propTypes = {
  veterinarian: PropTypes.object.isRequired,
}

ContactLink.propTypes = {
  href: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  external: PropTypes.bool,
}

export default VeterinarianCard
