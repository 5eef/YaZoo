import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'

import { downloadCsvResponse, exportAdminProfessionalVerificationsCsvRequest } from '../api/adminExports'
import {
  getAdminProfessionalVerificationsRequest,
  updateAdminProfessionalVerificationStatusRequest,
} from '../api/professionalVerifications'
import Button from '../components/ui/Button'
import ComplianceBadge from '../components/ui/ComplianceBadge'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { getApiBaseUrl } from '../lib/appConfig'
import { extractDataArray } from '../utils/apiData'
import { getErrorMessage } from '../utils/getErrorMessage'

const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'expired']

function AdminProfessionalVerificationsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [items, setItems] = useState([])
  const [notes, setNotes] = useState({})
  const [reviewReasons, setReviewReasons] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const loadItems = async () => {
    try {
      const response = await getAdminProfessionalVerificationsRequest()
      setItems(extractDataArray(response))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('admin.professionalVerifications.loadError')))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!user?.isAdmin) {
    return <Navigate to="/feed" replace />
  }

  const handleExport = async () => {
    try {
      const response = await exportAdminProfessionalVerificationsCsvRequest()
      downloadCsvResponse(response, 'yazoo-professional-verifications.csv')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('exports.error')))
    }
  }

  const handleStatus = async (item, status) => {
    setUpdatingId(item.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await updateAdminProfessionalVerificationStatusRequest(item.id, {
        status,
        review_reason: reviewReasons[item.id] ?? item.reviewReason ?? '',
        admin_note: notes[item.id] ?? item.adminNote ?? '',
      })
      const updated = response.data.verification
      setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? updated : currentItem)))
      setSuccessMessage(t('admin.professionalVerifications.updateSuccess'))
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('admin.professionalVerifications.updateError')))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8 sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">{t('admin.professionalVerifications.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-violet-50">{t('admin.professionalVerifications.title')}</h1>
        <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-violet-100/76">{t('admin.professionalVerifications.subtitle')}</p>
        <div className="mt-4">
          <Button type="button" variant="ghost" onClick={handleExport}>{t('exports.professionalVerifications')}</Button>
        </div>
      </header>

      {errorMessage ? <Message tone="error">{errorMessage}</Message> : null}
      {successMessage ? <Message tone="success">{successMessage}</Message> : null}

      <div className="space-y-4">
        {isLoading ? <EmptyState>{t('common.loading')}</EmptyState> : null}
        {!isLoading && items.length === 0 ? <EmptyState>{t('admin.professionalVerifications.empty')}</EmptyState> : null}
        {items.map((item) => (
          <article key={item.id} className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-stone-950 dark:text-violet-50">{item.user?.name ?? t('common.user')}</p>
                <p className="text-xs text-stone-500 dark:text-violet-100/60">{item.user?.email ?? item.user?.phone ?? t('common.notProvided')}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
              <Meta label={t('professionalVerification.businessType')} value={t(`professionalVerification.businessTypes.${item.businessType}`)} />
              <Meta label={t('professionalVerification.legalName')} value={item.legalName || t('common.notProvided')} />
              <Meta label={t('professionalVerification.ice')} value={item.ice || t('common.notProvided')} />
              <Meta label={t('professionalVerification.onssaNumber')} value={item.onssaAuthorizationNumber || t('common.notProvided')} />
              <Meta label={t('professionalVerification.licenseNumber')} value={item.professionalLicenseNumber || t('common.notProvided')} />
              <Meta label={t('professionalVerification.documentType')} value={item.documentType ? t(`professionalVerification.documentTypes.${item.documentType}`) : t('common.notProvided')} />
              <Meta label={t('professionalVerification.documentOriginalName')} value={item.documentOriginalName || t('common.notProvided')} />
              <Meta label={t('professionalVerification.documentSize')} value={formatFileSize(item.documentSize, t)} />
              <Meta label={t('professionalVerification.documentExpiresAt')} value={item.documentExpiresAt || t('common.notProvided')} />
              <Meta label={t('admin.professionalVerifications.submittedAt')} value={item.createdAt || t('common.notProvided')} />
              <Meta label={t('professionalVerification.reviewReason')} value={item.reviewReason || t('common.notProvided')} />
            </dl>
            {item.documentDownloadUrl ? (
              <div className="mt-4">
                <a
                  href={resolveDocumentDownloadUrl(item.documentDownloadUrl)}
                  className="inline-flex items-center justify-center rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-50"
                >
                  {t('admin.professionalVerifications.downloadDocument')}
                </a>
              </div>
            ) : null}
            <textarea
              value={reviewReasons[item.id] ?? item.reviewReason ?? ''}
              onChange={(event) => setReviewReasons((current) => ({ ...current, [item.id]: event.target.value }))}
              rows={2}
              className="mt-4 w-full rounded-[22px] border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none focus:border-violet-400 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
              placeholder={t('admin.professionalVerifications.reviewReason')}
            />
            <textarea
              value={notes[item.id] ?? item.adminNote ?? ''}
              onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
              rows={3}
              className="mt-4 w-full rounded-[22px] border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none focus:border-violet-400 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
              placeholder={t('admin.professionalVerifications.adminNote')}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={item.status === status ? 'primary' : 'ghost'}
                  disabled={updatingId === item.id}
                  onClick={() => handleStatus(item, status)}
                >
                  {t(`professionalVerification.statuses.${status}`)}
                </Button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function StatusBadge({ status }) {
  if (status === 'approved') return <ComplianceBadge type="professionalApproved" />
  if (status === 'rejected') return <ComplianceBadge type="professionalRejected" />
  if (status === 'expired') return <ComplianceBadge type="professionalRejected" />
  return <ComplianceBadge type="documentsPending" />
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

function resolveDocumentDownloadUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url

  return `${getApiBaseUrl()}${url.replace(/^\/api/i, '')}`
}

function formatFileSize(size, t) {
  const numericSize = Number(size)

  if (!Number.isFinite(numericSize) || numericSize <= 0) {
    return t('common.notProvided')
  }

  return `${(numericSize / 1024).toFixed(1)} KB`
}

export default AdminProfessionalVerificationsPage
