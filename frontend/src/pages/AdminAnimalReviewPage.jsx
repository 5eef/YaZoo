import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'

import {
  getAdminAnimalReviewsRequest,
  updateAdminAnimalLegalStatusRequest,
} from '../api/admin'
import Button from '../components/ui/Button'
import ComplianceBadge from '../components/ui/ComplianceBadge'
import { getAnimalComplianceBadgeTypes } from '../features/marketplace/animalCompliance'
import {
  formatAnimalLegalStatus,
  formatAnimalSellerType,
} from '../features/marketplace/marketplaceUtils'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { extractDataArray } from '../utils/apiData'
import { getErrorMessage } from '../utils/getErrorMessage'

const STATUS_OPTIONS = ['pending_review', 'approved', 'rejected', 'suspended']

function AdminAnimalReviewPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [animals, setAnimals] = useState([])
  const [notes, setNotes] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const loadAnimals = async () => {
    try {
      const response = await getAdminAnimalReviewsRequest()
      setAnimals(extractDataArray(response))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('admin.animalsReview.loadError')))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAnimals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!user?.isAdmin) {
    return <Navigate to="/feed" replace />
  }

  const handleStatus = async (animal, legalStatus) => {
    setUpdatingId(animal.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await updateAdminAnimalLegalStatusRequest(animal.id, {
        legal_status: legalStatus,
        moderation_note: notes[animal.id] ?? animal.moderationNote ?? '',
      })
      const updatedAnimal = response.data.animal
      setAnimals((current) => current.map((item) => (item.id === animal.id ? updatedAnimal : item)))
      setSuccessMessage(t('admin.animalsReview.updateSuccess'))
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('admin.animalsReview.updateError')))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8 sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">{t('admin.animalsReview.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-violet-50">{t('admin.animalsReview.title')}</h1>
        <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-violet-100/76">{t('admin.animalsReview.subtitle')}</p>
      </header>

      {errorMessage ? <Message tone="error">{errorMessage}</Message> : null}
      {successMessage ? <Message tone="success">{successMessage}</Message> : null}

      <div className="space-y-4">
        {isLoading ? <EmptyState>{t('common.loading')}</EmptyState> : null}
        {!isLoading && animals.length === 0 ? <EmptyState>{t('admin.animalsReview.empty')}</EmptyState> : null}
        {animals.map((animal) => (
          <article key={animal.id} className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-stone-950 dark:text-violet-50">{animal.name}</p>
                <p className="text-sm text-stone-500 dark:text-violet-100/62">{animal.author?.name ?? t('common.user')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getAnimalComplianceBadgeTypes(animal).map((badgeType) => (
                  <ComplianceBadge key={badgeType} type={badgeType} />
                ))}
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
              <Meta label={t('animals.sellerType')} value={formatAnimalSellerType(animal.sellerType, t)} />
              <Meta label={t('feed.location')} value={animal.location || t('common.notProvided')} />
              <Meta label={t('animals.contactPhone')} value={animal.contactPhone || t('common.notProvided')} />
              <Meta label={t('animals.reviewStatus')} value={formatAnimalLegalStatus(animal.legalStatus, t)} />
              <Meta label={t('animals.origin')} value={animal.origin || t('common.notProvided')} />
              <Meta label={t('animals.identificationNumber')} value={animal.identificationNumber || t('common.notProvided')} />
              <Meta label={t('animals.onssaAuthorizationNumber')} value={animal.onssaAuthorizationNumber || t('common.notProvided')} />
              <Meta label={t('common.category')} value={animal.category || t('common.notProvided')} />
            </dl>
            <textarea
              value={notes[animal.id] ?? animal.moderationNote ?? ''}
              onChange={(event) => setNotes((current) => ({ ...current, [animal.id]: event.target.value }))}
              rows={3}
              className="mt-4 w-full rounded-[22px] border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none focus:border-violet-400 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
              placeholder={t('admin.animalsReview.moderationNote')}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={animal.legalStatus === status ? 'primary' : 'ghost'}
                  disabled={updatingId === animal.id}
                  onClick={() => handleStatus(animal, status)}
                >
                  {formatAnimalLegalStatus(status, t)}
                </Button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
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

export default AdminAnimalReviewPage
