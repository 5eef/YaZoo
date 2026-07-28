import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'

import { getAdminOrdersDashboardRequest } from '../api/admin'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { formatDate } from '../utils/formatDate'
import { getErrorMessage } from '../utils/getErrorMessage'

function AdminOrdersDashboardPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState({
    stats: {},
    activeOrders: [],
    recentCompletedOrders: [],
    topSellers: [],
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.isAdmin) {
      return undefined
    }

    let cancelled = false

    const bootstrap = async () => {
      try {
        const response = await getAdminOrdersDashboardRequest()

        if (!cancelled) {
          setDashboard(response.data)
          setErrorMessage('')
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            getErrorMessage(error, t('ordersUi.admin.loadError')),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [t, user?.isAdmin])

  if (!user?.isAdmin) {
    return <Navigate to="/feed" replace />
  }

  const stats = dashboard.stats ?? {}
  const overviewStats = [
    { label: t('ordersUi.common.orders'), value: stats.totalOrders ?? 0 },
    { label: t('ordersUi.common.pending'), value: stats.pendingReservations ?? 0 },
    { label: t('ordersUi.common.approved'), value: stats.approvedOrders ?? 0 },
    { label: t('ordersUi.common.completed'), value: stats.completedOrders ?? 0 },
    { label: t('ordersUi.common.revenueTotal'), value: formatPrice(stats.revenueTotal ?? 0) },
    { label: t('ordersUi.common.revenueThisMonth'), value: formatPrice(stats.revenueThisMonth ?? 0) },
    { label: t('ordersUi.common.inTransit'), value: stats.inTransitDeliveries ?? 0 },
    { label: t('ordersUi.common.readyForPickup'), value: stats.readyForPickup ?? 0 },
    { label: t('ordersUi.common.toPrepare'), value: stats.deliveriesToPrepare ?? 0 },
    { label: t('ordersUi.common.animals'), value: stats.animalOrders ?? 0 },
    { label: t('ordersUi.common.products'), value: stats.productOrders ?? 0 },
    { label: t('ordersUi.common.activeSellers'), value: stats.sellers ?? 0 },
  ]

  const refreshDashboard = async () => {
    setIsLoading(true)

    try {
      const response = await getAdminOrdersDashboardRequest()

      setDashboard(response.data)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('ordersUi.admin.loadError')),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="w-full max-w-full min-w-0 space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-0">
      <section className="w-full max-w-full overflow-hidden rounded-[28px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(221,214,254,0.5),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.98)_0%,_rgba(247,241,255,0.9)_48%,_rgba(237,233,254,0.84)_100%)] p-4 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8 sm:rounded-[32px] sm:p-6">
        <div className="grid min-w-0 gap-6 xl:grid-cols-[1.12fr_0.88fr] xl:items-center">
          <div className="min-w-0">
            <p className="inline-flex max-w-full rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700 dark:border-violet-300/20 dark:bg-white/10 dark:text-violet-100 sm:tracking-[0.18em]">
              {t('ordersUi.admin.eyebrow')}
            </p>
            <h2 className="mt-4 break-words text-2xl font-semibold leading-tight text-stone-950 dark:text-violet-50 sm:text-3xl">
              {t('ordersUi.admin.title')}
            </h2>
            <p className="mt-3 max-w-2xl break-words text-sm leading-7 text-stone-600 dark:text-violet-100/72">
              {t('ordersUi.admin.description')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroStatCard label={t('ordersUi.common.active')} value={dashboard.activeOrders?.length ?? 0} />
            <HeroStatCard label={t('ordersUi.common.completed')} value={stats.completedOrders ?? 0} />
            <HeroStatCard label={t('ordersUi.common.revenueThisMonth')} value={formatPrice(stats.revenueThisMonth ?? 0)} />
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="w-full max-w-full rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.12em] text-violet-700 dark:text-violet-200 sm:tracking-[0.18em]">
              {t('ordersUi.admin.overviewEyebrow')}
            </p>
            <h2 className="mt-2 break-words text-xl font-semibold text-stone-950 dark:text-violet-50">
              {t('ordersUi.admin.overviewTitle')}
            </h2>
            <p className="mt-1 break-words text-sm text-stone-500 dark:text-violet-100/66">
              {t('ordersUi.admin.overviewDescription')}
            </p>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Link
              to="/admin/moderation"
              className="inline-flex w-full items-center justify-center rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 sm:w-auto"
            >
              {t('ordersUi.admin.moderationLink')}
            </Link>
            <Button type="button" variant="ghost" onClick={refreshDashboard} className="w-full sm:w-auto">
              {t('common.refresh')}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((entry) => (
            <StatCard key={entry.label} label={entry.label} value={entry.value} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="min-w-0 rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8 sm:p-5">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.12em] text-violet-700 dark:text-violet-200 sm:tracking-[0.18em]">
                {t('ordersUi.admin.prioritiesEyebrow')}
              </p>
              <h3 className="mt-2 break-words text-lg font-semibold text-stone-950 dark:text-violet-50">
                {t('ordersUi.admin.activeOrdersTitle')}
              </h3>
              <p className="mt-1 break-words text-sm text-stone-500 dark:text-violet-100/66">
                {t('ordersUi.admin.activeOrdersDescription')}
              </p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-white/10 dark:text-violet-50">
              {dashboard.activeOrders?.length ?? 0} {t('ordersUi.common.active')}
            </span>
          </div>

          {isLoading ? (
            <StateBox>{t('admin.activeOrdersLoading')}</StateBox>
          ) : null}

          {!isLoading && !(dashboard.activeOrders?.length > 0) ? (
            <StateBox>{t('admin.activeOrdersEmpty')}</StateBox>
          ) : null}

          {!isLoading && dashboard.activeOrders?.length > 0 ? (
            <div className="mt-5 space-y-4">
              {dashboard.activeOrders.map((order) => (
                <OrderCard key={`active-${order.id}`} order={order} />
              ))}
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8 sm:p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-violet-700 dark:text-violet-200 sm:tracking-[0.18em]">
            {t('ordersUi.admin.performanceEyebrow')}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-stone-950 dark:text-violet-50">{t('admin.topSellers')}</h3>
          <p className="mt-1 break-words text-sm text-stone-500 dark:text-violet-100/66">
            {t('ordersUi.admin.performanceDescription')}
          </p>

          {isLoading ? <StateBox>{t('admin.performancesLoading')}</StateBox> : null}

          {!isLoading && !(dashboard.topSellers?.length > 0) ? (
            <StateBox>{t('admin.topSellersEmpty')}</StateBox>
          ) : null}

          {!isLoading && dashboard.topSellers?.length > 0 ? (
            <div className="mt-5 space-y-3">
              {dashboard.topSellers.map((entry, index) => (
                <article
                  key={`seller-${entry.seller?.id ?? index}`}
                  className="rounded-[24px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,239,255,0.78))] px-4 py-4 shadow-sm dark:border-violet-300/14 dark:bg-white/8"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-sm font-semibold text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]">
                      {index + 1}
                    </div>
                    <Avatar name={entry.seller?.name ?? t('ordersUi.common.seller')} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-950 dark:text-violet-50">
                        {entry.seller?.name ?? t('ordersUi.common.unknownSeller')}
                      </p>
                      <p className="truncate text-xs text-stone-500 dark:text-violet-100/62">
                        {entry.seller?.email ?? t('ordersUi.common.unavailableEmail')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniStat
                      label={t('ordersUi.common.revenueTotal')}
                      value={formatPrice(entry.revenueTotal ?? 0)}
                    />
                    <MiniStat
                      label={t('ordersUi.common.orders')}
                      value={entry.completedOrders ?? 0}
                    />
                    <MiniStat
                      label={t('ordersUi.common.averageBasket')}
                      value={formatPrice(entry.averageOrderValue ?? 0)}
                    />
                    <MiniStat
                      label={t('ordersUi.common.city')}
                      value={entry.seller?.city || t('ordersUi.common.notProvidedFemale')}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </section>

      <section className="w-full max-w-full rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8 sm:p-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.12em] text-violet-700 dark:text-violet-200 sm:tracking-[0.18em]">
              {t('ordersUi.admin.recentEyebrow')}
            </p>
            <h3 className="mt-2 break-words text-lg font-semibold text-stone-950 dark:text-violet-50">
              {t('ordersUi.admin.recentTitle')}
            </h3>
            <p className="mt-1 break-words text-sm text-stone-500 dark:text-violet-100/66">
              {t('ordersUi.admin.recentDescription')}
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-white/10 dark:text-violet-50">
            {stats.completedOrders ?? 0} {t('ordersUi.common.completedShort')}
          </span>
        </div>

        {isLoading ? <StateBox>{t('admin.completedOrdersLoading')}</StateBox> : null}

        {!isLoading && !(dashboard.recentCompletedOrders?.length > 0) ? (
          <StateBox>{t('admin.completedOrdersEmpty')}</StateBox>
        ) : null}

        {!isLoading && dashboard.recentCompletedOrders?.length > 0 ? (
          <div className="mt-5 space-y-4">
            {dashboard.recentCompletedOrders.map((order) => (
              <OrderCard key={`completed-${order.id}`} order={order} showInvoice />
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
      <p className="truncate text-xs uppercase tracking-[0.12em] text-stone-500 dark:text-violet-100/60 sm:tracking-[0.18em]">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold text-stone-950 dark:text-violet-50">{value}</p>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-[24px] border border-violet-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] px-4 py-4 shadow-sm dark:border-violet-300/14 dark:bg-white/8">
      <p className="break-words text-xs uppercase tracking-[0.12em] text-stone-500 dark:text-violet-100/60 sm:tracking-[0.18em]">{label}</p>
      <p className="mt-2 break-words text-3xl font-semibold text-stone-950 dark:text-violet-50">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="min-w-0 rounded-[20px] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] px-3 py-3 dark:bg-white/10">
      <p className="break-words text-xs uppercase tracking-[0.12em] text-stone-500 dark:text-violet-100/60 sm:tracking-[0.16em]">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-stone-900 dark:text-violet-50">{value}</p>
    </div>
  )
}

function StateBox({ children }) {
  return (
    <div className="mt-5 rounded-[24px] border border-dashed border-violet-200 bg-white/84 px-5 py-10 text-center text-sm text-stone-500 dark:border-violet-300/18 dark:bg-white/8 dark:text-violet-100/70">
      {children}
    </div>
  )
}

function OrderCard({ order, showInvoice = false }) {
  const { t } = useI18n()

  return (
    <article className="w-full max-w-full overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,239,255,0.9))] shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
      {order.listing?.imageUrl ? (
        <div className="h-48 bg-stone-200">
          <img
            src={order.listing.imageUrl}
            alt={order.listing.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <Badge tone="primary">{formatReservationKind(order.kind, t)}</Badge>
              <Badge tone="soft">{formatReservationStatus(order.reservationStatus, t)}</Badge>
              <Badge tone="light">{formatDeliveryStatus(order.deliveryStatus, t)}</Badge>
            </div>
            <h4 className="mt-3 break-words text-lg font-semibold text-stone-950 dark:text-violet-50">
              {order.listing?.title ?? t('ordersUi.common.listing')}
            </h4>
            <p className="mt-1 break-words text-sm text-stone-500 dark:text-violet-100/62">
              {t('ordersUi.common.createdOn', { date: formatDate(order.createdAt) })}
              {order.completedAt ? ` | ${t('ordersUi.common.completedOn', { date: formatDate(order.completedAt) })}` : ''}
            </p>
          </div>

          <div className="w-full rounded-[22px] bg-[linear-gradient(135deg,_rgba(124,58,237,0.1),_rgba(216,180,254,0.22),_rgba(255,255,255,0.94))] px-4 py-3 text-left dark:bg-white/10 sm:w-auto sm:text-right">
            <p className="text-xs uppercase tracking-[0.12em] text-stone-500 dark:text-violet-100/60 sm:tracking-[0.16em]">
              {t('ordersUi.common.total')}
            </p>
            <p className="mt-1 break-words text-lg font-semibold text-stone-950 dark:text-violet-50">
              {formatPrice(order.grandTotal ?? 0)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <PersonCard label={t('ordersUi.common.buyer')} unknownLabel={t('ordersUi.common.unknownBuyer')} person={order.buyer} />
          <PersonCard label={t('ordersUi.common.seller')} unknownLabel={t('ordersUi.common.unknownSeller')} person={order.seller} />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat label={t('ordersUi.common.payment')} value={formatPaymentStatus(order.paymentStatus, t)} />
          <MiniStat label={t('ordersUi.common.mode')} value={formatDeliveryMethod(order.deliveryMethod, t)} />
          <MiniStat label={t('ordersUi.common.quantity')} value={order.quantity ?? 0} />
          <MiniStat label={t('ordersUi.common.location')} value={order.listing?.location || t('ordersUi.common.notProvided')} />
        </div>

        <div className="grid gap-3 sm:flex sm:flex-wrap">
          {order.listing?.routePath ? (
            <Link
              to={order.listing.routePath}
              className="inline-flex w-full items-center justify-center rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 sm:w-auto"
            >
              {t('ordersUi.common.viewListing')}
            </Link>
          ) : null}

          {showInvoice && order.invoiceNumber ? (
            <Link
              to={`/reservations/${order.id}/invoice`}
              className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 sm:w-auto"
            >
              {t('ordersUi.common.viewInvoice')}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function PersonCard({ label, unknownLabel, person }) {
  const { t } = useI18n()

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[22px] bg-white/90 px-4 py-3 shadow-sm dark:bg-white/10">
      <Avatar name={person?.name ?? label} size="sm" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.12em] text-stone-500 dark:text-violet-100/60 sm:tracking-[0.16em]">{label}</p>
        <p className="truncate text-sm font-medium text-stone-900 dark:text-violet-50">
          {person?.name ?? unknownLabel}
        </p>
        <p className="truncate text-xs text-stone-500 dark:text-violet-100/62">
          {person?.email ?? t('ordersUi.common.unavailableEmail')}
        </p>
      </div>
    </div>
  )
}

function Badge({ children, tone = 'soft' }) {
  const classes = {
    primary: 'bg-[linear-gradient(135deg,#7c3aed,#a855f7)] text-white',
    soft: 'bg-violet-50 text-violet-800 dark:bg-white/10 dark:text-violet-50',
    light: 'bg-white/90 text-stone-700 ring-1 ring-inset ring-violet-100 dark:bg-white/10 dark:text-violet-50 dark:ring-violet-300/14',
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${classes[tone]}`}>
      {children}
    </span>
  )
}

function formatPrice(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatReservationKind(kind, t) {
  return t(`ordersUi.statuses.kind.${kind}`) === `ordersUi.statuses.kind.${kind}`
    ? t('ordersUi.statuses.kind.fallback')
    : t(`ordersUi.statuses.kind.${kind}`)
}

function formatReservationStatus(status, t) {
  const key = `ordersUi.statuses.reservation.${status}`
  const label = t(key)
  return label === key ? t('ordersUi.statuses.reservation.fallback') : label
}

function formatDeliveryStatus(status, t) {
  const key = `ordersUi.statuses.delivery.${status}`
  const label = t(key)
  return label === key ? t('ordersUi.statuses.delivery.fallback') : label
}

function formatPaymentStatus(status, t) {
  const key = `ordersUi.statuses.paymentShort.${status}`
  const label = t(key)
  return label === key ? t('ordersUi.statuses.payment.fallback') : label
}

function formatDeliveryMethod(method, t) {
  const key = `ordersUi.statuses.deliveryMethod.${method === 'pickup' ? 'pickup' : 'delivery'}`
  return t(key)
}

export default AdminOrdersDashboardPage
