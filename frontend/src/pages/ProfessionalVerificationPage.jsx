import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import {
  createProfessionalVerificationRequest,
  getMyProfessionalVerificationsRequest,
} from '../api/professionalVerifications'
import Button from '../components/ui/Button'
import ComplianceBadge from '../components/ui/ComplianceBadge'
import { useI18n } from '../hooks/useI18n'
import { extractDataArray, extractDataObject } from '../utils/apiData'
import { getErrorMessage } from '../utils/getErrorMessage'

const BUSINESS_TYPES = [
  'veterinarian',
  'pet_shop',
  'breeder',
  'seller',
  'trainer',
  'shelter',
  'service_provider',
  'association',
  'other',
]

const DOCUMENT_TYPES = [
  'cin',
  'ice',
  'license',
  'onssa_authorization',
  'professional_card',
  'association_document',
  'veterinarian_license',
  'other',
]

const initialForm = {
  business_type: 'service_provider',
  legal_name: '',
  ice: '',
  onssa_authorization_number: '',
  professional_license_number: '',
  document_type: 'other',
  document_expires_at: '',
  document: null,
}

function ProfessionalVerificationPage() {
  const { t } = useI18n()
  const [form, setForm] = useState(initialForm)
  const [verifications, setVerifications] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isVeterinarian = form.business_type === 'veterinarian'

  const loadVerifications = async () => {
    try {
      const response = await getMyProfessionalVerificationsRequest()
      setVerifications(extractDataArray(response))
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('professionalVerification.loadError')))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadVerifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleBusinessTypeChange = (event) => {
    const businessType = event.target.value

    setForm((current) => ({
      ...current,
      business_type: businessType,
      document_type: businessType === 'veterinarian'
        ? 'veterinarian_license'
        : (current.document_type === 'veterinarian_license' ? 'other' : current.document_type),
    }))
  }

  const handleFileChange = (event) => {
    setForm((current) => ({ ...current, document: event.target.files?.[0] ?? null }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const payload = buildProfessionalVerificationPayload(form)
      const response = await createProfessionalVerificationRequest(payload)
      const nextVerification = extractDataObject(response, null)?.verification
      setVerifications((current) => [nextVerification, ...current].filter(Boolean))
      setForm(initialForm)
      event.currentTarget.reset()
      setSuccessMessage(t('professionalVerification.submitSuccess'))
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('professionalVerification.submitError')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      <section className="rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8 sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">
          {t('professionalVerification.eyebrow')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-violet-50">
          {t('professionalVerification.title')}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 dark:text-violet-100/76">
          {t('professionalVerification.description')}
        </p>
      </section>

      {errorMessage ? <StateMessage tone="error">{errorMessage}</StateMessage> : null}
      {successMessage ? <StateMessage tone="success">{successMessage}</StateMessage> : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <form onSubmit={handleSubmit} className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">{t('professionalVerification.businessType')}</span>
              <select
                value={form.business_type}
                onChange={handleBusinessTypeChange}
                className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`professionalVerification.businessTypes.${type}`)}</option>
                ))}
              </select>
            </label>
            <Field label={t('professionalVerification.legalName')} value={form.legal_name} onChange={handleChange('legal_name')} />
            <Field label={t('professionalVerification.ice')} value={form.ice} onChange={handleChange('ice')} />
            <Field label={t('professionalVerification.onssaNumber')} value={form.onssa_authorization_number} onChange={handleChange('onssa_authorization_number')} />
            <Field
              label={t('professionalVerification.licenseNumber')}
              value={form.professional_license_number}
              onChange={handleChange('professional_license_number')}
              required={isVeterinarian}
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">{t('professionalVerification.documentType')}</span>
              <select
                value={form.document_type}
                onChange={handleChange('document_type')}
                className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
              >
                {(isVeterinarian ? ['veterinarian_license'] : DOCUMENT_TYPES).map((type) => (
                  <option key={type} value={type}>{t(`professionalVerification.documentTypes.${type}`)}</option>
                ))}
              </select>
            </label>
            <Field
              type="date"
              label={t('professionalVerification.documentExpiresAt')}
              value={form.document_expires_at}
              onChange={handleChange('document_expires_at')}
              min={tomorrowDate()}
              required={isVeterinarian}
            />
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">{t('professionalVerification.documentFile')}</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                required={isVeterinarian}
                className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition file:me-3 file:rounded-full file:border-0 file:bg-violet-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-violet-800 focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50 dark:file:bg-violet-300/18 dark:file:text-violet-50"
              />
              <span className="mt-2 block text-xs text-stone-500 dark:text-violet-100/64">
                {t('professionalVerification.documentHelp')}
              </span>
            </label>
          </div>

          {isVeterinarian ? (
            <div className="mt-4 rounded-[22px] border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm leading-6 text-violet-950 dark:border-violet-300/18 dark:bg-violet-400/10 dark:text-violet-100">
              {t('professionalVerification.veterinarianRequirements')}
            </div>
          ) : null}

          <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-300/18 dark:bg-amber-400/10 dark:text-amber-100">
            {t('professionalVerification.manualNotice')}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.sending') : t('professionalVerification.submit')}
            </Button>
            <Link
              to="/privacy"
              className="inline-flex items-center justify-center rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-50"
            >
              {t('professionalVerification.privacyLink')}
            </Link>
          </div>
        </form>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8">
          <h2 className="text-lg font-semibold text-stone-950 dark:text-violet-50">{t('professionalVerification.history')}</h2>
          <div className="mt-4 space-y-3">
            {isLoading ? <SmallState>{t('common.loading')}</SmallState> : null}
            {!isLoading && verifications.length === 0 ? <SmallState>{t('professionalVerification.empty')}</SmallState> : null}
            {verifications.map((verification) => (
              <article key={verification.id} className="rounded-[22px] border border-violet-100 bg-violet-50/55 p-4 text-sm text-stone-700 dark:border-violet-300/14 dark:bg-white/10 dark:text-violet-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-stone-950 dark:text-violet-50">
                    {t(`professionalVerification.businessTypes.${verification.businessType}`)}
                  </p>
                  <StatusBadge status={verification.status} />
                </div>
                <p className="mt-2">{verification.legalName || t('common.notProvided')}</p>
                {verification.documentType ? (
                  <p className="mt-2 text-xs text-stone-500 dark:text-violet-100/64">
                    {t('professionalVerification.documentType')}: {t(`professionalVerification.documentTypes.${verification.documentType}`)}
                  </p>
                ) : null}
                {verification.reviewReason ? <p className="mt-2 text-xs text-stone-500 dark:text-violet-100/64">{verification.reviewReason}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </section>
    </section>
  )
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">{label}</span>
      <input
        className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
        {...props}
      />
    </label>
  )
}

function buildProfessionalVerificationPayload(form) {
  const payload = new FormData()

  for (const [key, value] of Object.entries(form)) {
    if (key === 'document') {
      if (value) payload.append('document', value)
      continue
    }

    if (value !== '') {
      payload.append(key, value)
    }
  }

  return payload
}

function tomorrowDate() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const day = String(tomorrow.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function StatusBadge({ status }) {
  if (status === 'approved') {
    return <ComplianceBadge type="professionalApproved" />
  }

  if (status === 'rejected') return <ComplianceBadge type="professionalRejected" />
  if (status === 'expired') return <ComplianceBadge type="professionalRejected" />

  return <ComplianceBadge type="documentsPending" />
}

function StateMessage({ tone, children }) {
  const styles = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/18 dark:bg-emerald-400/10 dark:text-emerald-100'
    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/18 dark:bg-rose-400/10 dark:text-rose-100'

  return <div className={`rounded-[24px] border px-5 py-4 text-sm ${styles}`}>{children}</div>
}

function SmallState({ children }) {
  return (
    <div className="rounded-[20px] border border-dashed border-violet-200 px-4 py-8 text-center text-sm text-stone-500 dark:border-violet-300/14 dark:text-violet-100/70">
      {children}
    </div>
  )
}

export default ProfessionalVerificationPage
