import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'

import {
  exportAdminReportsCsvRequest,
  downloadCsvResponse,
} from '../api/adminExports'
import { updateAdminContentModerationStatusRequest } from '../api/adminContentModeration'
import {
  deleteAdminAnimalRequest,
  deleteAdminCommunityRequest,
  deleteAdminPostRequest,
  deleteAdminProductRequest,
  getAdminReportsRequest,
  getAdminModerationRequest,
  getAdminModerationSectionRequest,
  updateAdminReportStatusRequest,
} from '../api/admin'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { formatDate } from '../utils/formatDate'
import { getErrorMessage } from '../utils/getErrorMessage'

const moderationTabs = [
  { key: 'posts', labelKey: 'admin.moderation.tabs.posts' },
  { key: 'animals', labelKey: 'admin.moderation.tabs.animals' },
  { key: 'products', labelKey: 'admin.moderation.tabs.products' },
  { key: 'services', labelKey: 'admin.moderation.tabs.services' },
  { key: 'veterinarians', labelKey: 'admin.moderation.tabs.veterinarians' },
  { key: 'communities', labelKey: 'admin.moderation.tabs.communities' },
  { key: 'reports', labelKey: 'admin.moderation.tabs.reports' },
]

const paginatedMarketplaceTabs = ['animals', 'products', 'services', 'veterinarians']

function AdminModerationPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState({
    stats: {},
    posts: [],
    animals: [],
    products: [],
    services: [],
    veterinarians: [],
    communities: [],
    reports: [],
  })
  const [activeTab, setActiveTab] = useState('posts')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [deletingKey, setDeletingKey] = useState('')
  const [moderatingKey, setModeratingKey] = useState('')
  const [marketplacePage, setMarketplacePage] = useState(1)
  const [marketplaceMeta, setMarketplaceMeta] = useState(null)
  const [isSectionLoading, setIsSectionLoading] = useState(false)

  useEffect(() => {
    if (!user?.isAdmin) {
      return undefined
    }

    let cancelled = false

    const bootstrap = async () => {
      try {
        const response = await getAdminModerationRequest()
        const reportsResponse = await getAdminReportsRequest()

        if (!cancelled) {
          setDashboard({
            ...response.data,
            reports: reportsResponse.data?.data ?? [],
          })
          setErrorMessage('')
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            getErrorMessage(error, t('admin.moderation.loadError')),
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

  useEffect(() => {
    if (!user?.isAdmin || !paginatedMarketplaceTabs.includes(activeTab)) {
      setMarketplaceMeta(null)
      return undefined
    }

    let cancelled = false
    setIsSectionLoading(true)

    getAdminModerationSectionRequest(activeTab, {
      page: marketplacePage,
      per_page: 12,
    })
      .then((response) => {
        if (cancelled) return

        setDashboard((current) => ({
          ...current,
          [activeTab]: response.data?.data ?? [],
        }))
        setMarketplaceMeta(response.data?.meta ?? null)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, t('admin.moderation.loadError')))
        }
      })
      .finally(() => {
        if (!cancelled) setIsSectionLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, marketplacePage, t, user?.isAdmin])

  if (!user?.isAdmin) {
    return <Navigate to="/feed" replace />
  }

  const items = dashboard[activeTab] ?? []
  const stats = dashboard.stats ?? {}
  const overviewStats = [
    { label: t('admin.moderation.stats.users'), value: stats.users ?? 0 },
    { label: t('admin.moderation.stats.admins'), value: stats.admins ?? 0 },
    { label: t('admin.moderation.stats.posts'), value: stats.posts ?? 0 },
    { label: t('admin.moderation.stats.animals'), value: stats.animals ?? 0 },
    { label: t('admin.moderation.stats.products'), value: stats.products ?? 0 },
    { label: t('admin.moderation.stats.services'), value: stats.services ?? 0 },
    { label: t('admin.moderation.stats.veterinarians'), value: stats.veterinarians ?? 0 },
    { label: t('admin.moderation.stats.communities'), value: stats.communities ?? 0 },
    {
      label: t('admin.moderation.stats.pendingCommunityRequests'),
      value: stats.pendingCommunityRequests ?? 0,
    },
  ]

  const loadDashboard = async () => {
    try {
      const response = await getAdminModerationRequest()
      const reportsResponse = await getAdminReportsRequest()

      setDashboard({
        ...response.data,
        reports: reportsResponse.data?.data ?? [],
      })
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('admin.moderation.loadError')),
      )
    }
  }

  const handleDelete = async (type, item) => {
    const confirmed = globalThis.confirm(
      t('admin.moderation.deleteConfirm', { label: buildDeleteLabel(type, item, t) }),
    )

    if (!confirmed) {
      return
    }

    setDeletingKey(`${type}-${item.id}`)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (type === 'posts') {
        await deleteAdminPostRequest(item.id)
      }

      if (type === 'animals') {
        await deleteAdminAnimalRequest(item.id)
      }

      if (type === 'products') {
        await deleteAdminProductRequest(item.id)
      }

      if (type === 'communities') {
        await deleteAdminCommunityRequest(item.id)
      }

      setSuccessMessage(t('admin.moderation.deleteSuccess', { label: buildDeleteLabel(type, item, t) }))
      await loadDashboard()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('admin.moderation.deleteError')),
      )
    } finally {
      setDeletingKey('')
    }
  }

  const handleReportStatusChange = async (reportId, status) => {
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await updateAdminReportStatusRequest(reportId, status)
      const updatedReport = response.data?.data
      setDashboard((current) => ({
        ...current,
        reports: (current.reports ?? []).map((report) =>
          report.id === reportId ? updatedReport : report,
        ),
      }))
      setSuccessMessage(t('admin.moderation.reportStatusUpdated'))
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('admin.moderation.reportStatusError')))
    }
  }

  const handleContentModeration = async (type, item, action) => {
    const frontendType = toContentType(type)
    if (!frontendType) return

    const note = globalThis.prompt(t('admin.moderation.moderationNotePrompt')) ?? ''
    setModeratingKey(`${type}-${item.id}-${action}`)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateAdminContentModerationStatusRequest(frontendType, item.id, {
        action,
        moderation_note: note,
      })
      setSuccessMessage(t('admin.moderation.contentStatusUpdated'))
      if (paginatedMarketplaceTabs.includes(type)) {
        const response = await getAdminModerationSectionRequest(type, {
          page: marketplacePage,
          per_page: 12,
        })
        setDashboard((current) => ({ ...current, [type]: response.data?.data ?? [] }))
        setMarketplaceMeta(response.data?.meta ?? null)
      } else {
        await loadDashboard()
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('admin.moderation.contentStatusError')))
    } finally {
      setModeratingKey('')
    }
  }

  const handleReportsExport = async () => {
    try {
      const response = await exportAdminReportsCsvRequest()
      downloadCsvResponse(response, 'yazoo-reports.csv')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('exports.error')))
    }
  }

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(221,214,254,0.5),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.98)_0%,_rgba(247,241,255,0.9)_48%,_rgba(237,233,254,0.84)_100%)] p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:rounded-[32px] sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr] xl:items-center">
          <div>
            <p className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-100">
              {t('admin.moderation.eyebrow')}
            </p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-stone-950 dark:text-violet-50 sm:text-3xl">
              {t('admin.moderation.title')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-violet-100/76">
              {t('admin.moderation.subtitle')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <HeroStatCard label={t('admin.moderation.stats.contents')} value={items.length} />
            <HeroStatCard label={t('admin.moderation.stats.posts')} value={stats.posts ?? 0} />
            <HeroStatCard label={t('admin.moderation.stats.pendingCommunityRequests')} value={stats.pendingCommunityRequests ?? 0} />
          </div>
        </div>
      </section>

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

      <section className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-violet-700">
              {t('admin.moderation.overviewEyebrow')}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-950 dark:text-violet-50">
              {t('admin.moderation.overviewTitle')}
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-violet-100/68">
              {t('admin.moderation.overviewSubtitle')}
            </p>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Link
              to="/admin/orders"
              className="inline-flex w-full items-center justify-center rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 sm:w-auto"
            >
              {t('common.adminOrders')}
            </Link>
            <Button type="button" variant="ghost" onClick={loadDashboard} className="w-full sm:w-auto">
              {t('common.refresh')}
            </Button>
            <Button type="button" variant="secondary" onClick={handleReportsExport} className="w-full sm:w-auto">
              {t('exports.reports')}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((entry) => (
            <StatCard key={entry.label} label={entry.label} value={entry.value} />
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
        <div className="grid gap-3 sm:flex sm:flex-wrap">
          {moderationTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key)
                setMarketplacePage(1)
              }}
              className={`w-full rounded-full px-4 py-2 text-sm font-medium transition sm:w-auto ${
                activeTab === tab.key
                  ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]'
                  : 'bg-violet-50 text-violet-800 hover:bg-violet-100'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {isLoading || isSectionLoading ? (
          <StateBox>{t('admin.moderationLoading')}</StateBox>
        ) : null}

        {!isLoading && !isSectionLoading && items.length === 0 ? (
          <StateBox>{t('admin.moderationEmpty')}</StateBox>
        ) : null}

        {!isLoading && activeTab === 'reports' && items.length > 0 ? (
          <ReportsPanel reports={items} onStatusChange={handleReportStatusChange} t={t} />
        ) : null}

        {!isLoading && activeTab !== 'reports' && items.length > 0 ? (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {items.map((item) => (
                <ModerationCard
                  key={`${activeTab}-${item.id}`}
                  item={item}
                  type={activeTab}
                  isDeleting={deletingKey === `${activeTab}-${item.id}`}
                  moderatingKey={moderatingKey}
                  onDelete={handleDelete}
                  onModerate={handleContentModeration}
                  t={t}
                />
              ))}
            </div>
            {marketplaceMeta?.lastPage > 1 ? (
              <div className="mt-5 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={marketplaceMeta.currentPage <= 1 || isSectionLoading}
                  onClick={() => setMarketplacePage((page) => Math.max(1, page - 1))}
                >
                  {t('landing.marketplacePrevious')}
                </Button>
                <span className="text-sm text-stone-600 dark:text-violet-100/76">
                  {marketplaceMeta.currentPage} / {marketplaceMeta.lastPage}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={marketplaceMeta.currentPage >= marketplaceMeta.lastPage || isSectionLoading}
                  onClick={() => setMarketplacePage((page) => page + 1)}
                >
                  {t('landing.marketplaceNext')}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </section>
  )
}

function HeroStatCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/88 px-4 py-4 shadow-sm dark:border-violet-300/14 dark:bg-white/8">
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-violet-100/58">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-950 dark:text-violet-50">{value}</p>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-violet-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] px-4 py-4 shadow-sm dark:border-violet-300/14 dark:bg-white/8">
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-violet-100/58">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-stone-950 dark:text-violet-50">{value}</p>
    </div>
  )
}

function StateBox({ children }) {
  return (
    <div className="mt-5 rounded-[24px] border border-dashed border-violet-200 bg-white/84 px-5 py-12 text-center text-sm text-stone-500 dark:border-violet-300/18 dark:bg-white/8 dark:text-violet-100/70">
      {children}
    </div>
  )
}

function ModerationCard({ item, type, onDelete, onModerate, isDeleting, moderatingKey, t }) {
  const imageUrl = item.imageUrl ?? null
  const mediaUrl = item.mediaUrl ?? null
  const mediaKind = item.mediaKind ?? null
  const meta = buildMeta(type, item, t)

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,239,255,0.9))] shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-[linear-gradient(180deg,_rgba(24,16,38,0.96),_rgba(36,20,61,0.92))]">
      {imageUrl ? (
        <div className="h-44 bg-stone-200 sm:h-48">
          <img src={imageUrl} alt={item.title} className="h-full w-full object-cover" />
        </div>
      ) : null}

      {!imageUrl && mediaKind === 'video' && mediaUrl ? (
        <div className="h-44 bg-stone-950 sm:h-48">
          <video
            src={mediaUrl}
            controls
            playsInline
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <TypeBadge type={type} t={t} />
            <h3 className="mt-3 text-lg font-semibold text-stone-950 dark:text-violet-50">{item.title}</h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-violet-100/62">{formatDate(item.createdAt)}</p>
            {item.moderationStatus ? (
              <p className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-100">
                {t('admin.moderation.meta.moderationStatus')}: {item.moderationStatus}
              </p>
            ) : null}
          </div>

          {['posts', 'animals', 'products', 'communities'].includes(type) ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isDeleting}
              onClick={() => onDelete(type, item)}
              className="w-full border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-rose-200 sm:w-auto"
            >
              {isDeleting ? t('admin.moderation.deleting') : t('common.delete')}
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-3 rounded-[22px] bg-white/90 px-4 py-3 shadow-sm dark:bg-white/8">
          <Avatar
            name={item.author?.name ?? t('admin.moderation.unknownAuthor')}
            src={item.author?.avatar ?? ''}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-900 dark:text-violet-50">
              {item.author?.name ?? t('admin.moderation.unknownAuthor')}
            </p>
            <p className="truncate text-xs text-stone-500 dark:text-violet-100/62">
              {item.author?.email ?? t('admin.moderation.emailUnavailable')}
            </p>
          </div>
        </div>

        {item.content ? (
          <p className="text-sm leading-6 text-stone-600 dark:text-violet-100/76">{item.content}</p>
        ) : null}

        {item.description ? (
          <p className="text-sm leading-6 text-stone-600 dark:text-violet-100/76">{item.description}</p>
        ) : null}

        {mediaKind === 'video' ? (
          <div className="rounded-full bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
            {t('admin.moderation.videoAttached')}
          </div>
        ) : null}

        {item.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
              className="rounded-full bg-white/92 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-100 dark:bg-white/10 dark:text-violet-100 dark:ring-violet-300/14"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {meta.map((entry) => (
            <div
              key={entry.label}
              className="rounded-[20px] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] px-4 py-3 dark:bg-white/8"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-violet-100/58">
                {entry.label}
              </p>
              <p className="mt-1 text-sm font-medium text-stone-900 dark:text-violet-50">
                {entry.value}
              </p>
            </div>
          ))}
        </div>

        {toContentType(type) ? (
          <div className="flex flex-wrap gap-2">
            {['approve', 'reject', 'suspend'].map((action) => (
              <Button
                key={action}
                type="button"
                variant="ghost"
                disabled={moderatingKey === `${type}-${item.id}-${action}`}
                onClick={() => onModerate(type, item, action)}
              >
                {t(`admin.moderation.actions.${action}`)}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function TypeBadge({ type, t }) {
  const labels = {
    posts: t('admin.moderation.tabs.posts'),
    animals: t('admin.moderation.type.animals'),
    products: t('admin.moderation.type.products'),
    services: t('admin.moderation.type.services'),
    veterinarians: t('admin.moderation.type.veterinarians'),
    communities: t('admin.moderation.type.communities'),
  }

  const tones = {
    posts: 'bg-violet-100 text-violet-800',
    animals: 'bg-fuchsia-100 text-fuchsia-800',
    products: 'bg-purple-100 text-purple-800',
    services: 'bg-sky-100 text-sky-800',
    veterinarians: 'bg-emerald-100 text-emerald-800',
    communities: 'bg-indigo-100 text-indigo-800',
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        tones[type] ?? 'bg-violet-100 text-violet-800'
      }`}
    >
      {labels[type] ?? t('admin.moderation.type.content')}
    </span>
  )
}

function ReportsPanel({ reports, onStatusChange, t }) {
  return (
    <div className="mt-5 space-y-3">
      {reports.map((report) => (
        <article
          key={report.id}
          className="rounded-[24px] border border-violet-100 bg-white/86 p-4 shadow-sm dark:border-violet-300/14 dark:bg-white/8"
        >
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 dark:bg-white/10 dark:text-violet-100">
                  {t(`reports.types.${report.reportableType}`)}
                </span>
                <span className="text-xs text-stone-500 dark:text-violet-100/58">
                  #{report.reportableId} - {formatDate(report.createdAt)}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-stone-950 dark:text-violet-50">
                {t(`reports.reasons.${report.reason}`)}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-violet-100/76">
                {report.details || t('reports.noDetails')}
              </p>
              <p className="mt-2 text-xs text-stone-500 dark:text-violet-100/58">
                {t('reports.reportedBy')}: {report.reporter?.name ?? t('admin.moderation.unknownAuthor')}
              </p>
            </div>
            <label className="block min-w-[12rem]">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-violet-100/58">
                {t('reports.status')}
              </span>
              <select
                value={report.status}
                onChange={(event) => onStatusChange(report.id, event.target.value)}
                className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
              >
                {['pending', 'reviewed', 'dismissed', 'actioned'].map((status) => (
                  <option key={status} value={status}>
                    {t(`reports.statuses.${status}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </article>
      ))}
    </div>
  )
}

function buildMeta(type, item, t) {
  if (type === 'posts') {
    return [
      { label: 'Likes', value: item.likes ?? 0 },
      { label: t('admin.moderation.meta.comments'), value: item.commentsCount ?? 0 },
      { label: t('admin.moderation.meta.location'), value: item.location || t('common.notProvided') },
    ]
  }

  if (type === 'animals') {
    return [
      { label: t('admin.moderation.meta.category'), value: formatAnimalCategory(item.category, t) },
      { label: t('admin.moderation.meta.status'), value: formatListingStatus(item.listingStatus, t) },
      { label: t('admin.moderation.meta.mode'), value: item.isForAdoption ? t('marketplace.adoption') : `${item.price ?? 0} MAD` },
      { label: t('admin.moderation.meta.location'), value: item.location || t('common.notProvided') },
    ]
  }

  if (type === 'products') {
    return [
      { label: t('admin.moderation.meta.category'), value: formatProductCategory(item.category, t) },
      { label: t('admin.moderation.meta.status'), value: formatListingStatus(item.listingStatus, t) },
      { label: t('admin.moderation.meta.condition'), value: item.conditionStatus === 'used' ? t('products.labels.used') : t('products.labels.new') },
      { label: t('admin.moderation.meta.price'), value: `${item.price ?? 0} MAD` },
    ]
  }

  return [
    { label: t('admin.moderation.meta.visibility'), value: item.isPrivate ? t('communities.detail.privateGroup') : t('communities.detail.publicGroup') },
    { label: t('admin.moderation.meta.members'), value: item.membersCount ?? 0 },
    { label: t('admin.moderation.meta.requests'), value: item.pendingRequestsCount ?? 0 },
  ]
}

function buildDeleteLabel(type, item, t) {
  if (type === 'posts') {
    return t('admin.moderation.deleteLabels.post')
  }

  if (type === 'animals') {
    return t('admin.moderation.deleteLabels.animal', { title: item.title })
  }

  if (type === 'products') {
    return t('admin.moderation.deleteLabels.product', { title: item.title })
  }

  if (type === 'services' || type === 'veterinarians') {
    return [
      { label: t('admin.moderation.meta.category'), value: item.category || t('common.notProvided') },
      { label: t('admin.moderation.meta.status'), value: item.listingStatus || t('common.notProvided') },
      { label: t('admin.moderation.meta.location'), value: item.location || t('common.notProvided') },
      { label: t('admin.moderation.meta.price'), value: item.price === null || item.price === undefined ? t('common.notProvided') : `${item.price} MAD` },
    ]
  }

  return t('admin.moderation.deleteLabels.community', { title: item.title })
}

function toContentType(type) {
  const map = {
    posts: 'post',
    animals: 'animal',
    products: 'product',
    services: 'service',
    veterinarians: 'veterinarian',
  }

  return map[type] ?? ''
}

function formatAnimalCategory(category, t) {
  const labels = {
    dog: t('animals.labels.dog'),
    cat: t('animals.labels.cat'),
    bird: t('animals.labels.bird'),
    fish: t('animals.labels.fish'),
    rabbit: t('animals.labels.rabbit'),
    reptile: t('animals.labels.reptile'),
    other: t('animals.labels.other'),
  }

  return labels[category] ?? labels.other
}

function formatProductCategory(category, t) {
  const labels = {
    food: t('products.labels.food'),
    toy: t('products.labels.toy'),
    accessory: t('products.labels.accessory'),
    hygiene: t('products.labels.hygiene'),
    health: t('products.labels.health'),
    habitat: t('products.labels.habitat'),
    other: t('products.labels.other'),
  }

  return labels[category] ?? labels.other
}

function formatListingStatus(status, t) {
  const labels = {
    available: t('animals.labels.available'),
    reserved: t('animals.labels.reserved'),
    adopted: t('animals.labels.adopted'),
    sold: t('animals.labels.sold'),
  }

  return labels[status] ?? labels.available
}

export default AdminModerationPage
