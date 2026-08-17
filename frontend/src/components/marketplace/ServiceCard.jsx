import { useState } from 'react'
import PropTypes from 'prop-types'

import { createReservationRequest } from '../../api/reservations'
import { useI18n } from '../../hooks/useI18n'
import { formatCurrency } from '../../utils/formatDate'
import ReportButton from '../reports/ReportButton'
import Button from '../ui/Button'
import { FavoriteButton, Info, LinkButton, ManualPaymentBadges, RatingSummary, SellerTrustBadges, TrustBadge } from './MarketplaceCommon'

function ServiceCard({ service, onReserved }) {
  const { t } = useI18n()
  const [isReserving, setIsReserving] = useState(false)
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState('')
  const serviceLabel = service.type === 'training'
    ? t('services.training')
    : t('services.petSitting')

  const handleReserve = async () => {
    setIsReserving(true)
    setFeedback('')

    try {
      await createReservationRequest({
        category: service.type,
        reservable_id: service.id,
        message,
      })
      setMessage('')
      setFeedback(t('reservations.requestSent'))
      onReserved?.()
    } catch {
      setFeedback(t('errors.generic'))
    } finally {
      setIsReserving(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,239,255,0.9))] p-5 shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-3 py-1 text-xs font-medium text-white">
            {serviceLabel}
          </span>
          <h3 className="mt-3 text-lg font-semibold text-stone-950 dark:text-white">{service.title}</h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-violet-100/72">
            {service.provider?.name}
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900 dark:bg-white/10 dark:text-violet-50">
          {service.price ? formatCurrency(service.price) : t('services.negotiable')}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-violet-100/78">
        {service.description}
      </p>

      <div className="mt-3">
        <RatingSummary averageRating={service.averageRating} reviewsCount={service.reviewsCount} compact />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <TrustBadge tone="violet">{service.city || t('common.city')}</TrustBadge>
        {service.whatsappEnabled ? <TrustBadge tone="emerald">{t('marketplaceBadges.whatsappAvailable')}</TrustBadge> : null}
      </div>
      <div className="mt-3">
        <SellerTrustBadges author={service.provider} />
      </div>
      <div className="mt-3">
        <ManualPaymentBadges />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Info label={t('common.city')} value={service.city || t('common.notProvided')} />
        <Info label={t('services.priceType')} value={t(`services.priceTypes.${service.priceType}`)} />
      </div>

      {!service.isOwner ? (
        <div className="mt-4 space-y-3">
          <textarea
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t('reservations.messagePlaceholder')}
            className="w-full rounded-[20px] border border-violet-100 bg-white/88 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-300 dark:border-violet-300/20 dark:bg-white/10 dark:text-white"
          />
          {feedback ? <p className="text-sm text-violet-700 dark:text-violet-100">{feedback}</p> : null}
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button type="button" onClick={handleReserve} disabled={isReserving} className="w-full sm:w-auto">
              {isReserving ? t('common.loading') : t('reservations.bookSession')}
            </Button>
            <FavoriteButton type="services" itemId={service.id} initialFavorited={service.isFavorited} />
            {service.contactPhone && service.whatsappEnabled ? (
              <a
                href={`https://wa.me/${String(service.contactPhone).replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-green-500 px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-green-500/20 transition hover:bg-green-400 dark:bg-green-400 dark:text-black"
              >
                {t('contact.openWhatsapp')}
              </a>
            ) : null}
          </div>
          <ReportButton reportableType="service" reportableId={service.id} isOwner={service.isOwner} />
        </div>
      ) : (
        <div className="mt-4">
          <LinkButton to="/my/services" variant="ghost">{t('services.myServices')}</LinkButton>
        </div>
      )}
    </article>
  )
}

ServiceCard.propTypes = {
  service: PropTypes.object.isRequired,
  onReserved: PropTypes.func,
}

export default ServiceCard
