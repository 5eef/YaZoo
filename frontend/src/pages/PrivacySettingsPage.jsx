import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import PropTypes from 'prop-types'

import {
  createPrivacyConsent,
  getDataDeletionRequest,
  getPrivacyConsents,
} from '../api/privacy'
import DeleteAccountRequestModal from '../components/privacy/DeleteAccountRequestModal'
import ExportDataButton from '../components/privacy/ExportDataButton'
import Button from '../components/ui/Button'
import { useI18n } from '../hooks/useI18n'
import { extractDataArray } from '../utils/apiData'
import { getErrorMessage } from '../utils/getErrorMessage'

const CONSENT_TYPES = ['sms_otp', 'marketing', 'geolocation', 'cookies_analytics']

function PrivacySettingsPage() {
  const { locale, t } = useI18n()
  const [consents, setConsents] = useState([])
  const [deletionRequests, setDeletionRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const loadPrivacyState = useCallback(async () => {
    setIsLoading(true)

    try {
      const [consentsResponse, deletionResponse] = await Promise.all([
        getPrivacyConsents(),
        getDataDeletionRequest(),
      ])

      setConsents(extractDataArray(consentsResponse))
      setDeletionRequests(extractDataArray(deletionResponse))
    } catch (error) {
      setMessage(getErrorMessage(error, t('privacy.settings.loadError')))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadPrivacyState()
  }, [loadPrivacyState])

  const latestByType = useMemo(() => {
    const map = new Map()

    consents.forEach((consent) => {
      if (!map.has(consent.type)) {
        map.set(consent.type, consent)
      }
    })

    return map
  }, [consents])

  const handleConsentChange = async (type, accepted) => {
    setMessage('')

    try {
      const response = await createPrivacyConsent({ type, accepted, locale })
      const nextConsent = response.data?.consent

      if (nextConsent) {
        setConsents((current) => [nextConsent, ...current])
      }

      if (type === 'cookies_analytics') {
        updateCookieConsentLocalState(accepted)
      }

      setMessage(t('privacy.settings.consentSaved'))
    } catch (error) {
      setMessage(getErrorMessage(error, t('privacy.settings.consentError')))
    }
  }

  return (
    <section className="min-w-0 space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_30%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(246,239,255,0.9))] p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/16 dark:bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.28),_transparent_30%),linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-200">
          {t('privacy.settings.eyebrow')}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-stone-950 dark:text-violet-50 sm:text-3xl">
          {t('privacy.settings.title')}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 dark:text-violet-100/78">
          {t('privacy.settings.description')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/privacy"
            className="rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-50"
          >
            {t('footer.privacy')}
          </Link>
          <Link
            to="/cgu"
            className="rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-50"
          >
            {t('footer.terms')}
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <PrivacyPanel title={t('privacy.settings.rightsTitle')} description={t('privacy.settings.rightsDescription')}>
          <ul className="grid gap-2 text-sm leading-6 text-stone-600 dark:text-violet-100/78">
            {['access', 'rectification', 'opposition', 'deletion'].map((item) => (
              <li key={item} className="rounded-2xl bg-violet-50/70 px-4 py-3 dark:bg-white/8">
                {t(`privacy.settings.rights.${item}`)}
              </li>
            ))}
          </ul>
        </PrivacyPanel>

        <PrivacyPanel title={t('privacy.settings.exportTitle')} description={t('privacy.settings.exportDescription')}>
          <ExportDataButton />
        </PrivacyPanel>
      </div>

      <PrivacyPanel title={t('privacy.settings.consentsTitle')} description={t('privacy.settings.consentsDescription')}>
        {isLoading ? (
          <p className="text-sm text-stone-500 dark:text-violet-100/70">{t('common.loading')}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {CONSENT_TYPES.map((type) => (
              <ConsentPreference
                key={type}
                type={type}
                checked={Boolean(latestByType.get(type)?.accepted)}
                lastUpdated={latestByType.get(type)?.createdAt}
                onChange={handleConsentChange}
                t={t}
              />
            ))}
          </div>
        )}
        {message ? (
          <p className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:bg-white/10 dark:text-violet-50">
            {message}
          </p>
        ) : null}
      </PrivacyPanel>

      <PrivacyPanel title={t('privacy.settings.deletePanelTitle')} description={t('privacy.settings.deletePanelDescription')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(true)}>
            {t('privacy.settings.deleteOpen')}
          </Button>
          <span className="text-sm text-stone-600 dark:text-violet-100/72">
            {deletionRequests.length > 0
              ? t('privacy.settings.latestDeleteStatus', {
                  status: t(`privacy.settings.statuses.${deletionRequests[0]?.status ?? 'pending'}`),
                })
              : t('privacy.settings.noDeleteRequest')}
          </span>
        </div>
      </PrivacyPanel>

      <DeleteAccountRequestModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onCreated={loadPrivacyState}
      />
    </section>
  )
}

function PrivacyPanel({ children, description, title }) {
  return (
    <section className="min-w-0 rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.9))]">
      <h2 className="text-lg font-semibold text-stone-950 dark:text-violet-50">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-violet-100/76">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

PrivacyPanel.propTypes = {
  children: PropTypes.node,
  description: PropTypes.string,
  title: PropTypes.string,
}

function ConsentPreference({ checked, lastUpdated, onChange, t, type }) {
  return (
    <label className="flex min-w-0 gap-3 rounded-[22px] border border-violet-100 bg-violet-50/65 p-4 dark:border-violet-300/14 dark:bg-white/8">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(type, event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-violet-300 text-violet-700 focus:ring-violet-500"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-stone-950 dark:text-violet-50">
          {t(`privacy.settings.consentLabels.${type}`)}
        </span>
        <span className="mt-1 block text-xs leading-5 text-stone-600 dark:text-violet-100/70">
          {t(`privacy.settings.consentDescriptions.${type}`)}
        </span>
        <span className="mt-2 block text-[11px] font-medium text-violet-700 dark:text-violet-200">
          {lastUpdated ? t('privacy.settings.lastUpdated', { date: new Date(lastUpdated).toLocaleDateString() }) : t('privacy.settings.neverSet')}
        </span>
      </span>
    </label>
  )
}

ConsentPreference.propTypes = {
  checked: PropTypes.bool,
  lastUpdated: PropTypes.string,
  onChange: PropTypes.func,
  t: PropTypes.func,
  type: PropTypes.string,
}

function updateCookieConsentLocalState(analyticsAccepted) {
  const rawValue = globalThis.localStorage?.getItem('yazoo-cookie-consent')
  let current = {}

  try {
    current = rawValue ? JSON.parse(rawValue) : {}
  } catch {
    // Ignore malformed legacy consent data and replace it with a valid object below.
  }

  globalThis.localStorage?.setItem(
    'yazoo-cookie-consent',
    JSON.stringify({
      ...current,
      cookies_necessary: true,
      cookies_analytics: analyticsAccepted,
      savedAt: new Date().toISOString(),
    }),
  )
}

export default PrivacySettingsPage
