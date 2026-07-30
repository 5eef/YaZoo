import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import {
  approveReservationRequest,
  cancelReservationRequest,
  completeReservationRequest,
  createReservationPaymentRequest,
  getPaymentConfigRequest,
  getReservationsRequest,
  rejectReservationRequest,
  updateReservationDeliveryStatusRequest,
} from '../api/reservations'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import SkeletonBlock from '../components/ui/SkeletonBlock'
import { useI18n } from '../hooks/useI18n'
import { asArray } from '../utils/apiData'
import { formatDate } from '../utils/formatDate'
import { getErrorMessage } from '../utils/getErrorMessage'

function ReservationsPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('q') ?? ''
  const [buyerReservations, setBuyerReservations] = useState([])
  const [sellerReservations, setSellerReservations] = useState([])
  const [activeTab, setActiveTab] = useState('buyer')
  const [search, setSearch] = useState(queryFromUrl)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState('')
  const [paymentConfig, setPaymentConfig] = useState(null)

  const loadReservations = useCallback(async () => {
    try {
      const response = await getReservationsRequest()

      setBuyerReservations(asArray(response.data.buyerReservations))
      setSellerReservations(asArray(response.data.sellerReservations))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('ordersUi.reservations.loadError')),
      )
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  useEffect(() => {
    let isMounted = true

    getPaymentConfigRequest()
      .then((response) => {
        if (isMounted) {
          setPaymentConfig(response.data)
        }
      })
      .catch(() => {
        if (isMounted) {
          setPaymentConfig(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setSearch(queryFromUrl)
  }, [queryFromUrl])

  const reservations =
    activeTab === 'buyer' ? buyerReservations : sellerReservations
  const visibleReservations = filterReservations(reservations, queryFromUrl)

  const handleSearch = (event) => {
    event.preventDefault()

    if (search.trim()) {
      setSearchParams({ q: search.trim() })
    } else {
      setSearchParams({})
    }
  }

  const handleResetSearch = () => {
    setSearch('')
    setSearchParams({})
  }

  const handleAction = async (action, reservation, payload = null) => {
    const confirmed = globalThis.confirm(buildConfirmMessage(action, reservation, t))

    if (!confirmed) {
      return
    }

    setProcessingId(`${action}-${reservation.id}`)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (action === 'approve') {
        await approveReservationRequest(reservation.id)
      }

      if (action === 'reject') {
        await rejectReservationRequest(reservation.id)
      }

      if (action === 'cancel') {
        await cancelReservationRequest(reservation.id)
      }

      if (action === 'complete') {
        await completeReservationRequest(reservation.id)
      }

      if (action === 'delivery') {
        await updateReservationDeliveryStatusRequest(reservation.id, payload)
      }

      if (action === 'pay_online') {
        const response = await createReservationPaymentRequest(reservation.id, {
          provider: 'cmi',
        })
        const checkoutUrl = response.data?.initiation?.checkoutUrl

        if (checkoutUrl) {
          globalThis.location.assign(checkoutUrl)
          return
        }
      }

      setSuccessMessage(buildSuccessMessage(action, payload, t))
      await loadReservations()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('ordersUi.reservations.actionError')),
      )
    } finally {
      setProcessingId('')
    }
  }

  return (
    <section className="w-full max-w-full min-w-0 space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-0">
      <section className="w-full max-w-full overflow-hidden rounded-[28px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(221,214,254,0.48),_transparent_26%),linear-gradient(135deg,_rgba(255,255,255,0.98)_0%,_rgba(247,241,255,0.9)_48%,_rgba(237,233,254,0.84)_100%)] p-4 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8 sm:rounded-[32px] sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr] xl:items-center">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700 dark:border-violet-300/20 dark:bg-white/10 dark:text-violet-100 sm:tracking-[0.18em]">
              {t('ordersUi.reservations.eyebrow')}
            </p>
            <h1 className="mt-4 break-words text-2xl font-semibold leading-tight text-stone-950 dark:text-violet-50 sm:text-3xl">
              {t('ordersUi.reservations.title')}
            </h1>
            <p className="mt-3 max-w-2xl break-words text-sm leading-7 text-stone-600 dark:text-violet-100/72">
              {t('ordersUi.reservations.description')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroStatCard label={t('ordersUi.history.purchases')} value={buyerReservations.length} />
            <HeroStatCard label={t('ordersUi.history.sales')} value={sellerReservations.length} />
            <HeroStatCard label={t('ordersUi.history.activeSection')} value={activeTab === 'buyer' ? t('ordersUi.history.purchases') : t('ordersUi.history.sales')} />
          </div>
        </div>
      </section>

      {paymentConfig && !paymentConfig.providers?.cmi?.enabled ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
          {t('ordersUi.timeline.paymentOnlinePreparing')} {t('ordersUi.timeline.paymentBankTransfer')} {t('ordersUi.timeline.paymentCashOnPickup')}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="w-full max-w-full rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8 sm:p-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.12em] text-violet-700 dark:text-violet-200 sm:tracking-[0.18em]">
              {t('ordersUi.reservations.eyebrow')}
            </p>
            <h2 className="mt-2 break-words text-xl font-semibold text-stone-950 dark:text-violet-50">
              {t('ordersUi.reservations.centerTitle')}
            </h2>
            <p className="mt-1 break-words text-sm text-stone-500 dark:text-violet-100/66">
              {t('ordersUi.reservations.centerDescription')}
            </p>
          </div>

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-none sm:flex sm:flex-wrap">
            <LinkButton to="/orders/history" variant="ghost" className="w-full sm:w-auto">
              {t('ordersUi.reservations.history')}
            </LinkButton>

            <button
              type="button"
              onClick={() => setActiveTab('buyer')}
              className={`w-full rounded-full px-4 py-2 text-sm font-medium transition sm:w-auto ${
                activeTab === 'buyer'
                  ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]'
                  : 'bg-violet-50 text-violet-800 hover:bg-violet-100'
              }`}
            >
              {t('ordersUi.history.purchases')} ({buyerReservations.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('seller')}
              className={`w-full rounded-full px-4 py-2 text-sm font-medium transition sm:w-auto ${
                activeTab === 'seller'
                  ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]'
                  : 'bg-violet-50 text-violet-800 hover:bg-violet-100'
              }`}
            >
              {t('ordersUi.history.sales')} ({sellerReservations.length})
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('reservations.searchPlaceholder')}
            className="min-w-0 flex-1 rounded-[22px] border border-violet-100 bg-[linear-gradient(135deg,_rgba(248,245,255,0.98),_rgba(255,255,255,0.94))] px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-300 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
          />
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button type="submit" className="w-full sm:w-auto">
              {t('common.search')}
            </Button>
            {queryFromUrl ? (
              <Button type="button" variant="ghost" onClick={handleResetSearch} className="w-full sm:w-auto">
                {t('common.reset')}
              </Button>
            ) : null}
          </div>
        </form>

        {isLoading ? (
          <div className="mt-5">
            <SkeletonBlock count={4} label={t('ordersUi.reservations.loading')} variant="reservations" />
          </div>
        ) : null}

        {!isLoading && reservations.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-violet-200 bg-white/84 px-5 py-12 text-center text-sm text-stone-500">
            {t('ordersUi.reservations.empty')}
          </div>
        ) : null}

        {!isLoading && reservations.length > 0 && visibleReservations.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-violet-200 bg-white/84 px-5 py-12 text-center text-sm text-stone-500">
            {t('ordersUi.reservations.emptySearch')}
          </div>
        ) : null}

        {!isLoading && visibleReservations.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {visibleReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                processingId={processingId}
                onAction={handleAction}
                paymentConfig={paymentConfig}
              />
            ))}
          </div>
        ) : null}
      </section>
    </section>
  )
}

function HeroStatCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-[24px] border border-violet-100 bg-white/88 px-4 py-4 shadow-sm dark:border-violet-300/14 dark:bg-white/10">
      <p className="break-words text-xs uppercase tracking-[0.12em] text-stone-500 dark:text-violet-100/60 sm:tracking-[0.18em]">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold text-stone-950 dark:text-violet-50">{value}</p>
    </div>
  )
}

function ReservationCard({ reservation, processingId, onAction, paymentConfig }) {
  const { t } = useI18n()
  const counterpart = reservation.isBuyer ? reservation.seller : reservation.buyer
  const imageUrl = reservation.listing?.imageUrl
  const message = reservation.isBuyer
    ? t('ordersUi.reservations.buyerMessage', { title: reservation.listing.title })
    : t('ordersUi.reservations.sellerMessage', { title: reservation.listing.title })
  const contactPath = counterpart?.id
    ? `/messages?user=${encodeURIComponent(counterpart.id)}&message=${encodeURIComponent(message)}`
    : null

  return (
    <article className="w-full max-w-full overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,239,255,0.9))] shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
      {imageUrl ? (
        <div className="h-48 bg-stone-200 sm:h-60 md:h-72 lg:h-80">
          <img
            src={imageUrl}
            alt={reservation.listing.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <StatusChip>{formatReservationStatus(reservation.reservationStatus, t)}</StatusChip>
              <StatusChip tone="light">
                {formatDeliveryStatus(reservation.deliveryStatus, t)}
              </StatusChip>
              <StatusChip tone="light">{formatReservationKind(reservation.kind, t)}</StatusChip>
            </div>
            <h3 className="mt-3 break-words text-lg font-semibold text-stone-950 dark:text-violet-50">
              {reservation.listing.title}
            </h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-violet-100/62">
              {formatDate(reservation.createdAt)}
            </p>
          </div>

          <div className="w-full rounded-[22px] bg-[linear-gradient(135deg,_rgba(124,58,237,0.1),_rgba(216,180,254,0.22),_rgba(255,255,255,0.94))] px-4 py-3 text-left dark:bg-white/10 sm:w-auto sm:text-right">
            <p className="text-xs uppercase tracking-[0.12em] text-stone-500 dark:text-violet-100/60 sm:tracking-[0.16em]">{t('common.totalVat')}</p>
            <p className="mt-1 break-words text-lg font-semibold text-stone-950 dark:text-violet-50">
              {formatPrice(reservation.grandTotal)}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3 rounded-[22px] bg-white/90 px-4 py-3 shadow-sm dark:bg-white/10">
          <Avatar name={counterpart?.name ?? t('ordersUi.common.contactVerb')} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-900 dark:text-violet-50">
              {counterpart?.name ?? t('ordersUi.common.unavailableContact')}
            </p>
            <p className="truncate text-xs text-stone-500 dark:text-violet-100/62">
              {counterpart?.email ?? t('ordersUi.common.unavailableEmail')}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Info label={t('ordersUi.common.payment')} value={formatPaymentMethod(reservation.paymentMethod, t)} />
          <Info label={t('ordersUi.common.paymentStatus')} value={formatPaymentStatus(reservation.paymentStatus, t)} />
          {reservation.payment ? (
            <Info
              label={t('ordersUi.common.gatewayPayment')}
              value={`${formatPaymentProvider(reservation.payment.provider, t)} - ${formatPaymentStatus(reservation.payment.status, t)}`}
            />
          ) : null}
          <Info label={t('invoice.delivery')} value={formatDeliveryMethod(reservation.deliveryMethod, t)} />
          <Info label={t('ordersUi.common.quantity')} value={reservation.quantity} />
          <Info label={t('ordersUi.common.subtotal')} value={formatPrice(reservation.totalPrice)} />
          <Info label={t('ordersUi.common.deliveryFee')} value={formatPrice(reservation.deliveryFee)} />
        </div>

        <ReservationTimeline reservation={reservation} paymentConfig={paymentConfig} />

        <div className="rounded-[22px] bg-white/90 px-4 py-4 shadow-sm dark:bg-white/10">
          <p className="text-xs uppercase tracking-[0.12em] text-stone-500 dark:text-violet-100/60 sm:tracking-[0.16em]">
            {t('ordersUi.reservations.addressPickup')}
          </p>
          <p className="mt-2 break-words text-sm font-medium text-stone-900 dark:text-violet-50">
            {reservation.deliveryMethod === 'delivery'
              ? [reservation.delivery.contactName, reservation.delivery.phone, reservation.delivery.city]
                  .filter(Boolean)
                  .join(' - ')
              : t('ordersUi.common.localPickup')}
          </p>
          <p className="mt-1 break-words text-sm text-stone-600 dark:text-violet-100/70">
            {reservation.delivery.address || reservation.listing.location || t('ordersUi.reservations.noAddress')}
          </p>
          {reservation.delivery.notes ? (
            <p className="mt-2 break-words text-sm text-stone-500 dark:text-violet-100/62">{reservation.delivery.notes}</p>
          ) : null}
        </div>

        {reservation.note ? (
          <p className="break-words text-sm leading-6 text-stone-600 dark:text-violet-100/70">{reservation.note}</p>
        ) : null}

        <div className="grid gap-3 sm:flex sm:flex-wrap">
          {reservation.listing.routePath ? (
            <LinkButton to={reservation.listing.routePath} variant="secondary" className="w-full sm:w-auto">
              {t('ordersUi.common.viewListing')}
            </LinkButton>
          ) : null}

          {contactPath ? (
            <LinkButton to={contactPath} variant="ghost" className="w-full sm:w-auto">
              {t('ordersUi.common.contactVerb')}
            </LinkButton>
          ) : null}

          {reservation.canViewInvoice ? (
            <LinkButton to={`/reservations/${reservation.id}/invoice`} variant="ghost" className="w-full sm:w-auto">
              {t('ordersUi.common.invoice')}
            </LinkButton>
          ) : null}

          {reservation.canApprove ? (
            <ActionButton
              processingId={processingId}
              buttonKey={`approve-${reservation.id}`}
              onClick={() => onAction('approve', reservation)}
              className="w-full sm:w-auto"
            >
              {t('ordersUi.reservations.actions.approve')}
            </ActionButton>
          ) : null}

          {reservation.canReject ? (
            <ActionButton
              processingId={processingId}
              buttonKey={`reject-${reservation.id}`}
              onClick={() => onAction('reject', reservation)}
              variant="ghost"
              className="w-full sm:w-auto"
            >
              {t('ordersUi.reservations.actions.reject')}
            </ActionButton>
          ) : null}

          {reservation.canCancel ? (
            <ActionButton
              processingId={processingId}
              buttonKey={`cancel-${reservation.id}`}
              onClick={() => onAction('cancel', reservation)}
              variant="ghost"
              className="w-full sm:w-auto"
            >
              {t('ordersUi.reservations.actions.cancel')}
            </ActionButton>
          ) : null}

          {canShowOnlinePaymentButton(reservation, paymentConfig) ? (
            <ActionButton
              processingId={processingId}
              buttonKey={`pay_online-${reservation.id}`}
              onClick={() => onAction('pay_online', reservation)}
              className="w-full sm:w-auto"
            >
              {t('ordersUi.reservations.actions.payOnline')}
            </ActionButton>
          ) : null}

          {reservation.canMarkShipped ? (
            <ActionButton
              processingId={processingId}
              buttonKey={`delivery-${reservation.id}`}
              onClick={() =>
                onAction('delivery', reservation, { delivery_status: 'shipped' })
              }
              className="w-full sm:w-auto"
            >
              {t('ordersUi.reservations.actions.markShipped')}
            </ActionButton>
          ) : null}

          {reservation.canMarkDelivered ? (
            <ActionButton
              processingId={processingId}
              buttonKey={`delivery-${reservation.id}`}
              onClick={() =>
                onAction('delivery', reservation, { delivery_status: 'delivered' })
              }
              className="w-full sm:w-auto"
            >
              {t('ordersUi.reservations.actions.markDelivered')}
            </ActionButton>
          ) : null}

          {reservation.canMarkPickedUp ? (
            <ActionButton
              processingId={processingId}
              buttonKey={`delivery-${reservation.id}`}
              onClick={() =>
                onAction('delivery', reservation, { delivery_status: 'picked_up' })
              }
              className="w-full sm:w-auto"
            >
              {t('ordersUi.reservations.actions.markPickedUp')}
            </ActionButton>
          ) : null}

          {reservation.canComplete ? (
            <ActionButton
              processingId={processingId}
              buttonKey={`complete-${reservation.id}`}
              onClick={() => onAction('complete', reservation)}
              className="w-full sm:w-auto"
            >
              {t('ordersUi.common.generatedInvoice')}
            </ActionButton>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function ActionButton({
  children,
  processingId,
  buttonKey,
  onClick,
  variant = 'primary',
  className = '',
}) {
  const { t } = useI18n()

  return (
    <Button
      type="button"
      variant={variant}
      disabled={processingId === buttonKey}
      onClick={onClick}
      className={className}
    >
      {processingId === buttonKey ? t('ordersUi.common.actionLoading') : children}
    </Button>
  )
}

function LinkButton({ children, to, variant = 'primary', className = '' }) {
  const variants = {
    primary:
      'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white hover:brightness-105 focus-visible:outline-violet-500',
    secondary:
      'bg-white text-violet-900 ring-1 ring-inset ring-violet-200 hover:bg-violet-50 focus-visible:outline-violet-300 dark:bg-white/10 dark:text-violet-50 dark:ring-violet-300/14',
    ghost:
      'bg-violet-50 text-violet-800 hover:bg-violet-100 focus-visible:outline-violet-200 dark:bg-white/10 dark:text-violet-50',
  }

  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  )
}

function StatusChip({ children, tone = 'dark' }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        tone === 'dark'
          ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7)] text-white'
          : 'bg-violet-50 text-violet-800 dark:bg-white/10 dark:text-violet-50'
      }`}
    >
      {children}
    </span>
  )
}

function Info({ label, value }) {
  return (
    <div className="min-w-0 rounded-[20px] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] px-4 py-3 dark:bg-white/10">
      <p className="break-words text-xs uppercase tracking-[0.12em] text-stone-500 dark:text-violet-100/60 sm:tracking-[0.16em]">{label}</p>
      <p className="mt-1 break-words font-medium text-stone-900 dark:text-violet-50">{value}</p>
    </div>
  )
}

function ReservationTimeline({ reservation, paymentConfig }) {
  const { t } = useI18n()
  const steps = buildReservationTimeline(reservation, paymentConfig, t)

  return (
    <div className="rounded-[22px] bg-white/90 px-4 py-4 shadow-sm dark:bg-white/10">
      <p className="text-xs uppercase tracking-[0.12em] text-stone-500 dark:text-violet-100/60 sm:tracking-[0.16em]">
        {t('ordersUi.timeline.title')}
      </p>
      <div className="mt-4 grid gap-3">
        {steps.map((step, index) => (
          <div key={step.key} className="flex gap-3">
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.state === 'done'
                  ? 'bg-emerald-500 text-white'
                  : step.state === 'current'
                    ? 'bg-violet-600 text-white'
                    : 'bg-violet-50 text-violet-700 dark:bg-white/10 dark:text-violet-50'
              }`}
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-stone-950 dark:text-violet-50">
                {step.label}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-stone-500 dark:text-violet-100/64">
                {step.help}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildConfirmMessage(action, reservation, t) {
  const title = reservation.listing.title

  return t(`ordersUi.reservations.confirm.${action}`, { title }) === `ordersUi.reservations.confirm.${action}`
    ? t('ordersUi.reservations.confirm.complete', { title })
    : t(`ordersUi.reservations.confirm.${action}`, { title })
}

function buildSuccessMessage(action, payload, t) {
  const deliveryStatus = payload?.delivery_status

  if (action === 'delivery') {
    const key = `ordersUi.reservations.success.${deliveryStatus}`
    const label = t(key)

    return label === key ? t('ordersUi.reservations.success.delivery') : label
  }

  const key = `ordersUi.reservations.success.${action}`
  const label = t(key)

  return label === key ? t('ordersUi.reservations.success.default') : label
}

function formatReservationKind(kind, t) {
  const key = `ordersUi.statuses.kind.${kind}`
  const label = t(key)

  return label === key ? t('ordersUi.statuses.kind.fallback') : label
}

function formatReservationStatus(status, t) {
  const key = `ordersUi.statuses.reservation.${status}`
  const label = t(key)

  return label === key ? t('ordersUi.statuses.reservation.pending') : label
}

function formatPaymentStatus(status, t) {
  const key = `ordersUi.statuses.payment.${status}`
  const label = t(key)

  return label === key ? t('ordersUi.statuses.payment.pending') : label
}

function formatPaymentMethod(method, t) {
  const key = `ordersUi.statuses.paymentMethod.${method}`
  const label = t(key)

  return label === key ? t('ordersUi.statuses.paymentMethod.cash_on_pickup') : label
}

function formatPaymentProvider(provider, t) {
  const key = `ordersUi.statuses.paymentProvider.${provider}`
  const label = t(key)

  return label === key ? provider : label
}

function formatDeliveryMethod(method, t) {
  return t(`ordersUi.statuses.deliveryMethod.${method === 'delivery' ? 'delivery' : 'pickup'}`)
}

function formatDeliveryStatus(status, t) {
  const key = `ordersUi.statuses.delivery.${status}`
  const label = t(key)

  return label === key ? t('ordersUi.statuses.delivery.pending') : label
}

function buildReservationTimeline(reservation, paymentConfig, t) {
  const reservationStatus = reservation.reservationStatus
  const deliveryStatus = reservation.deliveryStatus
  const paymentStatus = reservation.payment?.status ?? reservation.paymentStatus
  const isAccepted = !['pending', 'rejected', 'cancelled'].includes(reservationStatus)
  const isDelivered = ['delivered', 'picked_up'].includes(deliveryStatus)
  const isCompleted = reservationStatus === 'completed'
  const isCancelled = ['cancelled', 'rejected'].includes(reservationStatus)
  const cmiEnabled = Boolean(paymentConfig?.providers?.cmi?.enabled)
  const paymentHelp = paymentStatus === 'paid'
    ? t('ordersUi.timeline.paymentPaid')
    : reservation.paymentMethod === 'bank_transfer' || reservation.paymentMethod === 'manual_bank_transfer'
      ? t('ordersUi.timeline.paymentBankTransfer')
      : reservation.paymentMethod === 'cash_on_pickup'
        ? t('ordersUi.timeline.paymentCashOnPickup')
        : cmiEnabled
          ? t('ordersUi.timeline.paymentOnlineAvailable')
          : t('ordersUi.timeline.paymentOnlinePreparing')

  return [
    {
      key: 'requested',
      label: t('ordersUi.timeline.requested'),
      help: t('ordersUi.timeline.requestedHelp'),
      state: 'done',
    },
    {
      key: 'accepted',
      label: t('ordersUi.timeline.accepted'),
      help: isCancelled ? t('ordersUi.timeline.cancelledHelp') : t('ordersUi.timeline.acceptedHelp'),
      state: isAccepted || isCompleted ? 'done' : 'current',
    },
    {
      key: 'payment',
      label: t('ordersUi.timeline.payment'),
      help: paymentHelp,
      state: paymentStatus === 'paid' ? 'done' : isAccepted ? 'current' : 'upcoming',
    },
    {
      key: 'delivery',
      label: t('ordersUi.timeline.delivery'),
      help: reservation.deliveryMethod === 'delivery'
        ? t('ordersUi.timeline.deliveryHelp')
        : t('ordersUi.timeline.pickupHelp'),
      state: isDelivered || isCompleted ? 'done' : isAccepted ? 'current' : 'upcoming',
    },
    {
      key: 'completed',
      label: t('ordersUi.timeline.completed'),
      help: t('ordersUi.timeline.completedHelp'),
      state: isCompleted ? 'done' : 'upcoming',
    },
    {
      key: 'review',
      label: t('ordersUi.timeline.review'),
      help: t('ordersUi.timeline.reviewHelp'),
      state: reservation.buyerReview || reservation.sellerReview ? 'done' : isCompleted ? 'current' : 'upcoming',
    },
  ]
}

function formatPrice(value) {
  if (!value) {
    return '0 MAD'
  }

  return `${value} MAD`
}

function filterReservations(reservations, searchTerm) {
  if (!searchTerm) {
    return reservations
  }

  const normalizedSearch = normalizeSearchText(searchTerm)

  return asArray(reservations).filter((reservation) => {
    const counterpart = reservation.isBuyer ? reservation.seller : reservation.buyer

    return [
      reservation.listing?.title,
      reservation.listing?.location,
      reservation.delivery?.city,
      reservation.delivery?.address,
      counterpart?.name,
      counterpart?.email,
      reservation.reservationStatus,
      reservation.deliveryStatus,
      reservation.kind,
      reservation.note,
    ].some((value) => normalizeSearchText(value).includes(normalizedSearch))
  })
}

function canShowOnlinePaymentButton(reservation, paymentConfig) {
  return Boolean(
    paymentConfig?.providers?.cmi?.enabled
      && reservation.isBuyer
      && reservation.paymentStatus !== 'paid'
      && !['cancelled', 'rejected', 'completed'].includes(reservation.reservationStatus),
  )
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default ReservationsPage
